import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentGateway, TransactionStatus, InvoiceStatus } from '@ledgerflow/types';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TransactionsService (ACID Ingestion & Billing Engine)', () => {
  let service: TransactionsService;
  let prisma: any;

  const mockTenantId = 'tenant-uuid-1';
  const mockCustomerId = 'cust-uuid-1';

  const mockCustomer = {
    id: mockCustomerId,
    tenantId: mockTenantId,
    externalCustomerId: 'CLI-001',
    name: 'Distribuidora del Sur S.A.',
    email: 'pagos@delsur.cl',
    balance: new Prisma.Decimal(100000.0),
    currency: 'CLP',
  };

  const processPaymentDto = {
    customerId: mockCustomerId,
    amount: 119000.0,
    currency: 'CLP',
    gateway: PaymentGateway.TRANSBANK,
    externalReferenceId: 'TBK-ORDER-999',
    metadata: { authCode: '778899' },
    invoiceNotes: 'Monthly subscription',
  };

  beforeEach(async () => {
    prisma = {
      customer: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      invoice: {
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  describe('processPayment (ACID Atomic Operation)', () => {
    it('should atomically create Transaction, generate Invoice and update Customer balance', async () => {
      // 1. Customer exists in tenant
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      // 2. Reference is new (idempotent)
      prisma.transaction.findUnique.mockResolvedValue(null);

      const mockCreatedTx = {
        id: 'tx-uuid-1',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        amount: new Prisma.Decimal(119000.0),
        status: TransactionStatus.PROCESSED,
        externalReferenceId: 'TBK-ORDER-999',
      };

      const mockCreatedInvoice = {
        id: 'inv-uuid-1',
        tenantId: mockTenantId,
        customerId: mockCustomerId,
        transactionId: 'tx-uuid-1',
        invoiceNumber: 'FAC-2026-123456',
        subtotal: new Prisma.Decimal(100000.0),
        tax: new Prisma.Decimal(19000.0),
        total: new Prisma.Decimal(119000.0),
        status: InvoiceStatus.PAID,
      };

      const mockUpdatedCustomer = {
        ...mockCustomer,
        balance: new Prisma.Decimal(219000.0),
      };

      // Mock $transaction executing callback with transactional client tx
      prisma.$transaction.mockImplementation(async (callback: any) => {
        const txPrisma = {
          transaction: {
            create: jest.fn().mockResolvedValue(mockCreatedTx),
          },
          invoice: {
            create: jest.fn().mockResolvedValue(mockCreatedInvoice),
          },
          customer: {
            update: jest.fn().mockResolvedValue(mockUpdatedCustomer),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
          },
        };
        return callback(txPrisma);
      });

      const result = await service.processPayment(mockTenantId, processPaymentDto, 'user-1');

      expect(prisma.customer.findFirst).toHaveBeenCalledWith({
        where: { id: mockCustomerId, tenantId: mockTenantId },
      });
      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: {
          uq_tx_tenant_external_ref: {
            tenantId: mockTenantId,
            externalReferenceId: 'TBK-ORDER-999',
          },
        },
      });

      expect(result.transaction.id).toBe('tx-uuid-1');
      expect(result.invoice.id).toBe('inv-uuid-1');
      expect(result.customerBalance).toBe(219000.0);
    });

    it('should throw ConflictException if externalReferenceId already processed (idempotency)', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.transaction.findUnique.mockResolvedValue({ id: 'existing-tx' });

      await expect(
        service.processPayment(mockTenantId, processPaymentDto),
      ).rejects.toThrow(ConflictException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if customer does not belong to the tenant (cross-tenant safety)', async () => {
      prisma.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.processPayment(mockTenantId, processPaymentDto),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should roll back completely if any internal transaction step fails (ACID rollback)', async () => {
      prisma.customer.findFirst.mockResolvedValue(mockCustomer);
      prisma.transaction.findUnique.mockResolvedValue(null);

      const dbError = new Error('Database disk write failure during invoice creation');

      prisma.$transaction.mockImplementation(async (callback: any) => {
        const txPrisma = {
          transaction: {
            create: jest.fn().mockResolvedValue({ id: 'tx-1' }),
          },
          invoice: {
            create: jest.fn().mockRejectedValue(dbError), // Fails here!
          },
          customer: {
            update: jest.fn(),
          },
          auditLog: {
            create: jest.fn(),
          },
        };
        return callback(txPrisma);
      });

      await expect(
        service.processPayment(mockTenantId, processPaymentDto),
      ).rejects.toThrow('Database disk write failure during invoice creation');
    });
  });

  describe('processWebhook (External Gateway Integration)', () => {
    const webhookPayload = {
      tenantSlug: 'fintech-cl',
      externalReferenceId: 'WH-STRIPE-ch_123',
      externalCustomerId: 'EXT-CLI-99',
      customerName: 'Cliente Webhook SpA',
      customerEmail: 'webhook@cliente.cl',
      amount: 50000.0,
      currency: 'CLP',
      gateway: PaymentGateway.STRIPE,
    };

    it('should resolve tenant, provision customer if missing, and process payment atomically', async () => {
      const mockTenant = { id: mockTenantId, slug: 'fintech-cl', isActive: true };
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.customer.findUnique.mockResolvedValue(null); // Customer not found initially
      prisma.customer.create.mockResolvedValue({
        id: 'new-cust-uuid',
        tenantId: mockTenantId,
        externalCustomerId: 'EXT-CLI-99',
        balance: new Prisma.Decimal(0),
      });

      // Spy on processPayment
      const processPaymentSpy = jest.spyOn(service, 'processPayment').mockResolvedValue({
        transaction: { id: 'tx-wh-1' },
        invoice: { id: 'inv-wh-1' },
        customerBalance: 50000.0,
      });

      const result = await service.processWebhook(webhookPayload);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'fintech-cl' },
      });
      expect(prisma.customer.create).toHaveBeenCalled();
      expect(processPaymentSpy).toHaveBeenCalledWith(
        mockTenantId,
        expect.objectContaining({
          customerId: 'new-cust-uuid',
          amount: 50000.0,
          gateway: PaymentGateway.STRIPE,
          externalReferenceId: 'WH-STRIPE-ch_123',
        }),
      );
      expect(result.customerBalance).toBe(50000.0);
    });

    it('should throw NotFoundException if webhook tenant slug is invalid or inactive', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.processWebhook(webhookPayload)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
