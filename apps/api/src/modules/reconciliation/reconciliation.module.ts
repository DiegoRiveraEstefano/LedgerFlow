import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RECONCILIATION_QUEUE } from './reconciliation.constants';
import { ReconciliationService } from './reconciliation.service';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationProcessor } from './processors/reconciliation.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: RECONCILIATION_QUEUE,
    }),
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService, ReconciliationProcessor],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
