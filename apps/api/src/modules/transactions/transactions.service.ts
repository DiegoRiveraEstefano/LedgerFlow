import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  TransactionStatus,
  InvoiceStatus,
  PaginatedResponse,
} from '@ledgerflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';

export interface ProcessPaymentResult {
  transaction: any;
  invoice: any;
  customerBalance: number;
}

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Process a payment event atomically with strict ACID semantics.
   * If any step fails (e.g. unique constraint or database error),
   * the entire transaction is rolled back completely.
   */
  async processPayment(
    tenantId: string,
    dto: ProcessPaymentDto,
    userId?: string,
  ): Promise<ProcessPaymentResult> {
    // 1. Verify Customer exists and strictly belongs to this tenant
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        tenantId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer does not exist in this organization');
    }

    // 2. Check Idempotency (prevent duplicate payment processing)
    const existingTx = await this.prisma.transaction.findUnique({
      where: {
        uq_tx_tenant_external_ref: {
          tenantId,
          externalReferenceId: dto.externalReferenceId.trim(),
        },
      },
    });

    if (existingTx) {
      throw new ConflictException(
        `Transaction with external reference '${dto.externalReferenceId}' has already been processed`,
      );
    }

    // 3. Execute ACID Transaction
    return this.prisma.$transaction(async (tx) => {
      // Step A: Create Transaction record
      const transaction = await tx.transaction.create({
        data: {
          tenantId,
          customerId: customer.id,
          amount: new Prisma.Decimal(dto.amount),
          currency: dto.currency || 'CLP',
          status: TransactionStatus.PROCESSED,
          gateway: dto.gateway,
          externalReferenceId: dto.externalReferenceId.trim(),
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : undefined,
          processedAt: new Date(),
        },
      });

      // Step B: Calculate Financial Breakdown (19% IVA)
      const total = dto.amount;
      const subtotal = Math.round((total / 1.19) * 100) / 100;
      const tax = Math.round((total - subtotal) * 100) / 100;

      // Step C: Generate Unique Invoice Number (e.g. FAC-2026-XXXXX)
      const year = new Date().getFullYear();
      const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
      const invoiceNumber = `FAC-${year}-${uniqueSuffix}`;

      // Step D: Create Invoice record (1-to-1 with Transaction)
      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          customerId: customer.id,
          transactionId: transaction.id,
          invoiceNumber,
          subtotal: new Prisma.Decimal(subtotal),
          tax: new Prisma.Decimal(tax),
          total: new Prisma.Decimal(total),
          currency: dto.currency || 'CLP',
          status: InvoiceStatus.PAID,
          notes: dto.invoiceNotes || `Automatic invoice for transaction ${dto.externalReferenceId}`,
        },
      });

      // Step E: Increment Customer available balance atomically
      const updatedCustomer = await tx.customer.update({
        where: { id: customer.id },
        data: {
          balance: {
            increment: new Prisma.Decimal(dto.amount),
          },
        },
      });

      // Step F: Record Audit Trail entry
      await tx.auditLog.create({
        data: {
          tenantId,
          userId: userId || null,
          action: 'PAYMENT_PROCESSED_ACID',
          entity: 'Transaction',
          entityId: transaction.id,
          newData: {
            transactionId: transaction.id,
            invoiceId: invoice.id,
            invoiceNumber,
            amount: dto.amount,
            gateway: dto.gateway,
            newCustomerBalance: updatedCustomer.balance.toNumber(),
          },
        },
      });

      return {
        transaction,
        invoice,
        customerBalance: updatedCustomer.balance.toNumber(),
      };
    });
  }

  /**
   * Ingest payment via external Gateway Webhook
   */
  async processWebhook(payload: WebhookPaymentDto): Promise<ProcessPaymentResult> {
    const slug = payload.tenantSlug.trim().toLowerCase();

    // 1. Resolve Tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException(`Tenant organization '${slug}' not found or inactive`);
    }

    // 2. Resolve or upsert Customer in this Tenant
    let customer = await this.prisma.customer.findUnique({
      where: {
        uq_customer_tenant_external_id: {
          tenantId: tenant.id,
          externalCustomerId: payload.externalCustomerId.trim(),
        },
      },
    });

    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          tenantId: tenant.id,
          externalCustomerId: payload.externalCustomerId.trim(),
          name: payload.customerName || `Client ${payload.externalCustomerId}`,
          email: payload.customerEmail || `customer_${payload.externalCustomerId}@webhook.gateway`,
          currency: payload.currency || 'CLP',
          balance: 0.0,
        },
      });
    }

    // 3. Delegate to processPayment
    return this.processPayment(tenant.id, {
      customerId: customer.id,
      amount: payload.amount,
      currency: payload.currency,
      gateway: payload.gateway,
      externalReferenceId: payload.externalReferenceId,
      metadata: payload.metadata,
      invoiceNotes: `Generated via ${payload.gateway} webhook`,
    });
  }

  async listTransactions(
    tenantId: string,
    filters: TransactionFilterDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, status, gateway, customerId, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      tenantId, // Strict organization scoping
      ...(status && { status }),
      ...(gateway && { gateway }),
      ...(customerId && { customerId }),
      ...((startDate || endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true, externalCustomerId: true },
          },
          invoice: {
            select: { id: true, invoiceNumber: true, total: true, status: true },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
      data: items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getTransactionById(tenantId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id,
        tenantId, // Strict multi-tenant isolation
      },
      include: {
        customer: true,
        invoice: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found in current organization');
    }

    return transaction;
  }
}
