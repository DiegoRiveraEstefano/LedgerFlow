import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import {
  ReconciliationJobStatus,
  MovementStatus,
  DiscrepancyReason,
  PaginatedResponse,
} from '@ledgerflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RECONCILIATION_QUEUE,
  PROCESS_BANK_FILE_JOB,
} from './reconciliation.constants';
import { UploadBatchDto } from './dto/upload-batch.dto';
import { MovementRecordDto } from './dto/movement-record.dto';
import { JobFilterDto } from './dto/job-filter.dto';
import { MovementFilterDto } from './dto/movement-filter.dto';
import { ManualMatchDto } from './dto/manual-match.dto';

@Injectable()
export class ReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(RECONCILIATION_QUEUE)
    private readonly reconciliationQueue: Queue,
  ) {}

  /**
   * Enqueue a batch of bank movements for background asynchronous reconciliation
   */
  async queueBatchUpload(
    tenantId: string,
    userId: string,
    dto: UploadBatchDto,
  ) {
    if (!dto.records || dto.records.length === 0) {
      throw new BadRequestException('At least one bank movement is required');
    }

    // 1. Create ReconciliationJob record in database
    const jobRecord = await this.prisma.reconciliationJob.create({
      data: {
        tenantId,
        userId,
        fileName: dto.fileName.trim(),
        totalRecords: dto.records.length,
        processedRecords: 0,
        matchedRecords: 0,
        discrepancyRecords: 0,
        status: ReconciliationJobStatus.QUEUED,
      },
    });

    // 2. Enqueue job to Redis via BullMQ
    await this.reconciliationQueue.add(
      PROCESS_BANK_FILE_JOB,
      {
        jobId: jobRecord.id,
        tenantId,
        records: dto.records,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      },
    );

    return {
      jobId: jobRecord.id,
      fileName: jobRecord.fileName,
      status: jobRecord.status,
      totalRecords: jobRecord.totalRecords,
      createdAt: jobRecord.createdAt,
      message: 'Bank statement enqueued for background reconciliation',
    };
  }

  /**
   * Parse a raw uploaded file (CSV or JSON) and enqueue for background reconciliation
   */
  async parseAndQueueFile(
    tenantId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('A valid file buffer must be provided');
    }

    const content = file.buffer.toString('utf-8');
    const records: MovementRecordDto[] = [];

    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      try {
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
          throw new BadRequestException('JSON file must contain an array of bank movement objects');
        }
        for (const item of parsed) {
          records.push({
            externalReferenceId: String(item.externalReferenceId || item.reference || '').trim(),
            amount: Number(item.amount),
            movementDate: item.movementDate || item.date || new Date().toISOString(),
            currency: item.currency || 'CLP',
            description: item.description || '',
            rawReference: item.rawReference || '',
          });
        }
      } catch (e: any) {
        throw new BadRequestException(`Invalid JSON file content: ${e.message}`);
      }
    } else {
      // Parse CSV (supports comma or semicolon separated)
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        throw new BadRequestException('CSV file must have a header row and at least one data row');
      }

      // Check header row for delimiter
      const delimiter = lines[0].includes(';') ? ';' : ',';
      const rows = lines.slice(1);

      for (const row of rows) {
        const cols = row.split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
        if (cols.length >= 2 && cols[0]) {
          const ref = cols[0];
          const amount = parseFloat(cols[1]);
          const date = cols[2] ? new Date(cols[2]).toISOString() : new Date().toISOString();
          const desc = cols[3] || '';

          if (!isNaN(amount)) {
            records.push({
              externalReferenceId: ref,
              amount,
              movementDate: date,
              currency: 'CLP',
              description: desc,
            });
          }
        }
      }
    }

    if (records.length === 0) {
      throw new BadRequestException('No valid bank movement records could be parsed from the file');
    }

    return this.queueBatchUpload(tenantId, userId, {
      fileName: file.originalname,
      records,
    });
  }

  async getJobStatus(tenantId: string, jobId: string) {
    const job = await this.prisma.reconciliationJob.findFirst({
      where: {
        id: jobId,
        tenantId, // Strict organization boundary
      },
    });

    if (!job) {
      throw new NotFoundException('Reconciliation job not found in current organization');
    }

    const progressPercentage =
      job.totalRecords > 0
        ? Math.min(100, Math.round((job.processedRecords / job.totalRecords) * 100))
        : 0;

    return {
      id: job.id,
      fileName: job.fileName,
      status: job.status,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      matchedRecords: job.matchedRecords,
      discrepancyRecords: job.discrepancyRecords,
      progressPercentage,
      errorLog: job.errorLog,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  async listJobs(tenantId: string, filter: JobFilterDto): Promise<PaginatedResponse<any>> {
    const { page, limit, status } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.ReconciliationJobWhereInput = {
      tenantId,
      ...(status && { status }),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.reconciliationJob.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reconciliationJob.count({ where }),
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

  async listMovements(
    tenantId: string,
    jobId: string,
    filter: MovementFilterDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, status, discrepancyReason } = filter;
    const skip = (page - 1) * limit;

    // Verify job belongs to tenant first
    await this.getJobStatus(tenantId, jobId);

    const where: Prisma.BankMovementWhereInput = {
      tenantId,
      reconciliationJobId: jobId,
      ...(status && { status }),
      ...(discrepancyReason && { discrepancyReason }),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.bankMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          matchedTransaction: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              gateway: true,
              processedAt: true,
            },
          },
        },
      }),
      this.prisma.bankMovement.count({ where }),
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

  async forceManualMatch(
    tenantId: string,
    movementId: string,
    dto: ManualMatchDto,
  ) {
    const movement = await this.prisma.bankMovement.findFirst({
      where: { id: movementId, tenantId },
    });

    if (!movement) {
      throw new NotFoundException('Bank movement not found in current organization');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: { id: dto.transactionId, tenantId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found in current organization');
    }

    const wasDiscrepancy = movement.status === MovementStatus.DISCREPANCY;

    const updatedMovement = await this.prisma.bankMovement.update({
      where: { id: movementId },
      data: {
        status: MovementStatus.RECONCILED,
        discrepancyReason: DiscrepancyReason.NONE,
        matchedTransactionId: transaction.id,
        reconciledAt: new Date(),
      },
    });

    if (wasDiscrepancy) {
      await this.prisma.reconciliationJob.update({
        where: { id: movement.reconciliationJobId },
        data: {
          matchedRecords: { increment: 1 },
          discrepancyRecords: { decrement: 1 },
        },
      });
    }

    return updatedMovement;
  }
}
