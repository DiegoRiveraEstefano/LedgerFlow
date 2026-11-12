import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import {
  ReconciliationJobStatus,
  MovementStatus,
  DiscrepancyReason,
} from '@ledgerflow/types';
import { PrismaService } from '../../../prisma/prisma.service';
import { RECONCILIATION_QUEUE } from '../reconciliation.constants';
import { MovementRecordDto } from '../dto/movement-record.dto';

export interface ReconciliationJobPayload {
  jobId: string;
  tenantId: string;
  records: MovementRecordDto[];
}

@Processor(RECONCILIATION_QUEUE)
export class ReconciliationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReconciliationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ReconciliationJobPayload>): Promise<any> {
    const { jobId, tenantId, records } = job.data;
    this.logger.log(`🔄 Processing reconciliation job ${jobId} with ${records.length} records for tenant ${tenantId}`);

    try {
      // 1. Set job state to PROCESSING
      await this.prisma.reconciliationJob.update({
        where: { id: jobId },
        data: {
          status: ReconciliationJobStatus.PROCESSING,
        },
      });

      let processedCount = 0;
      let matchedCount = 0;
      let discrepancyCount = 0;

      // 2. Iterate each movement and reconcile
      for (const record of records) {
        const refId = record.externalReferenceId.trim();

        // Strict tenant-scoped query for transaction
        const matchedTx = await this.prisma.transaction.findUnique({
          where: {
            uq_tx_tenant_external_ref: {
              tenantId,
              externalReferenceId: refId,
            },
          },
        });

        let movementStatus: MovementStatus = MovementStatus.PENDING;
        let discrepancyReason: DiscrepancyReason = DiscrepancyReason.NONE;
        let matchedTransactionId: string | null = null;
        let reconciledAt: Date | null = null;

        if (!matchedTx) {
          // No transaction with this reference exists
          movementStatus = MovementStatus.DISCREPANCY;
          discrepancyReason = DiscrepancyReason.TRANSACTION_NOT_FOUND;
          discrepancyCount++;
        } else {
          // Compare amounts
          const txAmount = Number(matchedTx.amount);
          const recordAmount = Number(record.amount);
          const amountDiff = Math.abs(txAmount - recordAmount);

          if (amountDiff > 0.01) {
            movementStatus = MovementStatus.DISCREPANCY;
            discrepancyReason = DiscrepancyReason.AMOUNT_MISMATCH;
            discrepancyCount++;
          } else {
            // Compare dates (> 30 days gap is flagged)
            const txDate = matchedTx.processedAt || matchedTx.createdAt;
            const movDate = new Date(record.movementDate);
            const daysDiff = Math.abs(txDate.getTime() - movDate.getTime()) / (1000 * 60 * 60 * 24);

            if (daysDiff > 30) {
              movementStatus = MovementStatus.DISCREPANCY;
              discrepancyReason = DiscrepancyReason.DATE_OUT_OF_BOUNDS;
              discrepancyCount++;
            } else {
              // Full match!
              movementStatus = MovementStatus.RECONCILED;
              discrepancyReason = DiscrepancyReason.NONE;
              matchedTransactionId = matchedTx.id;
              reconciledAt = new Date();
              matchedCount++;
            }
          }
        }

        // Persist BankMovement record
        await this.prisma.bankMovement.create({
          data: {
            tenantId,
            reconciliationJobId: jobId,
            externalReferenceId: refId,
            rawReference: record.rawReference || null,
            amount: new Prisma.Decimal(record.amount),
            currency: record.currency || 'CLP',
            movementDate: new Date(record.movementDate),
            description: record.description || null,
            status: movementStatus,
            discrepancyReason,
            matchedTransactionId,
            reconciledAt,
          },
        });

        processedCount++;

        // Periodically report BullMQ job progress
        if (processedCount % 50 === 0 || processedCount === records.length) {
          const progressPercent = Math.round((processedCount / records.length) * 100);
          await job.updateProgress(progressPercent);

          await this.prisma.reconciliationJob.update({
            where: { id: jobId },
            data: {
              processedRecords: processedCount,
              matchedRecords: matchedCount,
              discrepancyRecords: discrepancyCount,
            },
          });
        }
      }

      // 3. Mark Job as COMPLETED
      await this.prisma.reconciliationJob.update({
        where: { id: jobId },
        data: {
          status: ReconciliationJobStatus.COMPLETED,
          processedRecords: processedCount,
          matchedRecords: matchedCount,
          discrepancyRecords: discrepancyCount,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `✅ Reconciliation job ${jobId} finished: ${matchedCount} matched, ${discrepancyCount} discrepancies.`,
      );

      return {
        jobId,
        processedCount,
        matchedCount,
        discrepancyCount,
      };
    } catch (error: any) {
      this.logger.error(`❌ Reconciliation job ${jobId} failed: ${error.message}`, error.stack);

      await this.prisma.reconciliationJob.update({
        where: { id: jobId },
        data: {
          status: ReconciliationJobStatus.FAILED,
          errorLog: error.message || 'Unknown worker processing error',
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }
}
