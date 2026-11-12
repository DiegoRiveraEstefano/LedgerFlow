import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import {
  ReconciliationJobStatus,
  MovementStatus,
  DiscrepancyReason,
} from '@ledgerflow/types';
import { ReconciliationService } from './reconciliation.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RECONCILIATION_QUEUE,
  PROCESS_BANK_FILE_JOB,
} from './reconciliation.constants';

describe('ReconciliationService', () => {
  let service: ReconciliationService;
  let prisma: any;
  let queue: any;

  const mockTenantId = 'tenant-uuid-1';
  const mockUserId = 'user-uuid-1';
  const mockJobId = 'job-uuid-1';

  beforeEach(async () => {
    prisma = {
      reconciliationJob: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      bankMovement: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        findFirst: jest.fn(),
      },
    };

    queue = {
      add: jest.fn().mockResolvedValue({ id: 'bull-job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(RECONCILIATION_QUEUE), useValue: queue },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
  });

  describe('queueBatchUpload (Async Ingestion)', () => {
    const uploadDto = {
      fileName: 'cartola_noviembre.csv',
      records: [
        {
          externalReferenceId: 'TBK-1001',
          amount: 50000.0,
          movementDate: '2026-11-10T10:00:00.000Z',
        },
        {
          externalReferenceId: 'TBK-1002',
          amount: 75000.0,
          movementDate: '2026-11-10T11:00:00.000Z',
        },
      ],
    };

    it('should create a ReconciliationJob in QUEUED status and enqueue to BullMQ', async () => {
      const mockCreatedJob = {
        id: mockJobId,
        tenantId: mockTenantId,
        fileName: 'cartola_noviembre.csv',
        totalRecords: 2,
        status: ReconciliationJobStatus.QUEUED,
        createdAt: new Date(),
      };
      prisma.reconciliationJob.create.mockResolvedValue(mockCreatedJob);

      const result = await service.queueBatchUpload(mockTenantId, mockUserId, uploadDto);

      expect(prisma.reconciliationJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: mockTenantId,
          userId: mockUserId,
          fileName: 'cartola_noviembre.csv',
          totalRecords: 2,
          status: ReconciliationJobStatus.QUEUED,
        }),
      });

      expect(queue.add).toHaveBeenCalledWith(
        PROCESS_BANK_FILE_JOB,
        {
          jobId: mockJobId,
          tenantId: mockTenantId,
          records: uploadDto.records,
        },
        expect.any(Object),
      );

      expect(result.jobId).toBe(mockJobId);
      expect(result.status).toBe(ReconciliationJobStatus.QUEUED);
      expect(result.totalRecords).toBe(2);
    });

    it('should throw BadRequestException if records array is empty', async () => {
      await expect(
        service.queueBatchUpload(mockTenantId, mockUserId, { fileName: 'empty.csv', records: [] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getJobStatus (Polling & Progress Tracking)', () => {
    it('should calculate and return progress percentage and counters', async () => {
      prisma.reconciliationJob.findFirst.mockResolvedValue({
        id: mockJobId,
        tenantId: mockTenantId,
        fileName: 'cartola_noviembre.csv',
        status: ReconciliationJobStatus.PROCESSING,
        totalRecords: 1000,
        processedRecords: 650,
        matchedRecords: 600,
        discrepancyRecords: 50,
        createdAt: new Date(),
      });

      const result = await service.getJobStatus(mockTenantId, mockJobId);

      expect(result.progressPercentage).toBe(65);
      expect(result.matchedRecords).toBe(600);
      expect(result.discrepancyRecords).toBe(50);
      expect(result.status).toBe(ReconciliationJobStatus.PROCESSING);
    });

    it('should throw NotFoundException if job is queried with wrong tenantId', async () => {
      prisma.reconciliationJob.findFirst.mockResolvedValue(null);

      await expect(
        service.getJobStatus('foreign-tenant-uuid', mockJobId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('forceManualMatch (Discrepancy Resolution)', () => {
    it('should approve discrepancy and update counters', async () => {
      const mockMovement = {
        id: 'mov-1',
        tenantId: mockTenantId,
        reconciliationJobId: mockJobId,
        status: MovementStatus.DISCREPANCY,
      };

      const mockTx = {
        id: 'tx-1',
        tenantId: mockTenantId,
      };

      prisma.bankMovement.findFirst.mockResolvedValue(mockMovement);
      prisma.transaction.findFirst.mockResolvedValue(mockTx);
      prisma.bankMovement.update.mockResolvedValue({
        ...mockMovement,
        status: MovementStatus.RECONCILED,
        discrepancyReason: DiscrepancyReason.NONE,
      });

      const result = await service.forceManualMatch(mockTenantId, 'mov-1', {
        transactionId: 'tx-1',
      });

      expect(prisma.bankMovement.update).toHaveBeenCalledWith({
        where: { id: 'mov-1' },
        data: expect.objectContaining({
          status: MovementStatus.RECONCILED,
          discrepancyReason: DiscrepancyReason.NONE,
          matchedTransactionId: 'tx-1',
        }),
      });

      expect(prisma.reconciliationJob.update).toHaveBeenCalledWith({
        where: { id: mockJobId },
        data: {
          matchedRecords: { increment: 1 },
          discrepancyRecords: { decrement: 1 },
        },
      });

      expect(result.status).toBe(MovementStatus.RECONCILED);
    });
  });
});
