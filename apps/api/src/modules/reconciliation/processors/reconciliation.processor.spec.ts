import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import {
  ReconciliationJobStatus,
  MovementStatus,
  DiscrepancyReason,
} from '@ledgerflow/types';
import { ReconciliationProcessor } from './reconciliation.processor';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ReconciliationProcessor (Background Worker Engine)', () => {
  let processor: ReconciliationProcessor;
  let prisma: any;

  const mockTenantId = 'tenant-uuid-1';
  const mockJobId = 'job-uuid-1';

  beforeEach(async () => {
    prisma = {
      reconciliationJob: {
        update: jest.fn().mockResolvedValue({ id: mockJobId }),
      },
      transaction: {
        findUnique: jest.fn(),
      },
      bankMovement: {
        create: jest.fn().mockResolvedValue({ id: 'mov-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationProcessor,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    processor = module.get<ReconciliationProcessor>(ReconciliationProcessor);
  });

  const createMockBullJob = (records: any[]) => ({
    data: {
      jobId: mockJobId,
      tenantId: mockTenantId,
      records,
    },
    updateProgress: jest.fn().mockResolvedValue(true),
  });

  it('should reconcile matching transaction with status RECONCILED', async () => {
    const records = [
      {
        externalReferenceId: 'TBK-2026-0001',
        amount: 250000.0,
        movementDate: new Date().toISOString(),
      },
    ];

    const matchedTx = {
      id: 'tx-1',
      tenantId: mockTenantId,
      amount: new Prisma.Decimal(250000.0),
      externalReferenceId: 'TBK-2026-0001',
      createdAt: new Date(),
    };

    prisma.transaction.findUnique.mockResolvedValue(matchedTx);

    const bullJob = createMockBullJob(records);
    const result = await processor.process(bullJob as any);

    expect(result.matchedCount).toBe(1);
    expect(result.discrepancyCount).toBe(0);

    expect(prisma.bankMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: MovementStatus.RECONCILED,
        discrepancyReason: DiscrepancyReason.NONE,
        matchedTransactionId: 'tx-1',
      }),
    });

    expect(prisma.reconciliationJob.update).toHaveBeenCalledWith({
      where: { id: mockJobId },
      data: expect.objectContaining({
        status: ReconciliationJobStatus.COMPLETED,
        matchedRecords: 1,
        discrepancyRecords: 0,
      }),
    });
  });

  it('should flag AMOUNT_MISMATCH discrepancy if amounts differ', async () => {
    const records = [
      {
        externalReferenceId: 'TBK-2026-0002',
        amount: 150000.0, // Bank says 150k
        movementDate: new Date().toISOString(),
      },
    ];

    const matchedTx = {
      id: 'tx-2',
      tenantId: mockTenantId,
      amount: new Prisma.Decimal(120000.0), // System recorded 120k
      externalReferenceId: 'TBK-2026-0002',
      createdAt: new Date(),
    };

    prisma.transaction.findUnique.mockResolvedValue(matchedTx);

    const bullJob = createMockBullJob(records);
    const result = await processor.process(bullJob as any);

    expect(result.matchedCount).toBe(0);
    expect(result.discrepancyCount).toBe(1);

    expect(prisma.bankMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: MovementStatus.DISCREPANCY,
        discrepancyReason: DiscrepancyReason.AMOUNT_MISMATCH,
        matchedTransactionId: null,
      }),
    });
  });

  it('should flag TRANSACTION_NOT_FOUND discrepancy if reference does not exist in DB', async () => {
    const records = [
      {
        externalReferenceId: 'TBK-UNKNOWN-999',
        amount: 30000.0,
        movementDate: new Date().toISOString(),
      },
    ];

    prisma.transaction.findUnique.mockResolvedValue(null);

    const bullJob = createMockBullJob(records);
    const result = await processor.process(bullJob as any);

    expect(result.matchedCount).toBe(0);
    expect(result.discrepancyCount).toBe(1);

    expect(prisma.bankMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: MovementStatus.DISCREPANCY,
        discrepancyReason: DiscrepancyReason.TRANSACTION_NOT_FOUND,
      }),
    });
  });

  it('should flag DATE_OUT_OF_BOUNDS discrepancy if date difference exceeds 30 days', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45); // 45 days ago

    const records = [
      {
        externalReferenceId: 'TBK-2026-0003',
        amount: 80000.0,
        movementDate: new Date().toISOString(),
      },
    ];

    const matchedTx = {
      id: 'tx-3',
      tenantId: mockTenantId,
      amount: new Prisma.Decimal(80000.0),
      externalReferenceId: 'TBK-2026-0003',
      createdAt: oldDate,
    };

    prisma.transaction.findUnique.mockResolvedValue(matchedTx);

    const bullJob = createMockBullJob(records);
    const result = await processor.process(bullJob as any);

    expect(result.matchedCount).toBe(0);
    expect(result.discrepancyCount).toBe(1);

    expect(prisma.bankMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: MovementStatus.DISCREPANCY,
        discrepancyReason: DiscrepancyReason.DATE_OUT_OF_BOUNDS,
      }),
    });
  });
});
