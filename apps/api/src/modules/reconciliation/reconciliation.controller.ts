import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserRole, AuthenticatedUser } from '@ledgerflow/types';
import { ReconciliationService } from './reconciliation.service';
import { UploadBatchDto } from './dto/upload-batch.dto';
import { JobFilterDto } from './dto/job-filter.dto';
import { MovementFilterDto } from './dto/movement-filter.dto';
import { ManualMatchDto } from './dto/manual-match.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Reconciliation')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('upload')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR)
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Bank statement or gateway settlement report (CSV or JSON)',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload bank statement file for asynchronous BullMQ background reconciliation',
    description:
      'Immediately returns 202 Accepted with jobId. Ingestion and matching are processed asynchronously without blocking the Node event loop.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'File enqueued successfully. Use jobId to poll reconciliation progress.',
  })
  async uploadStatementFile(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.reconciliationService.parseAndQueueFile(tenantId, user.id, file);
  }

  @Post('batch')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Enqueue bulk bank movements payload for background reconciliation',
    description:
      'Accepts an array of bank movement records and delegates processing to BullMQ worker.',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Batch enqueued successfully with 202 Accepted',
  })
  async queueBatch(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadBatchDto,
  ) {
    return this.reconciliationService.queueBatchUpload(tenantId, user.id, dto);
  }

  @Get('jobs/:id')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Poll reconciliation job status and real-time processing progress',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job status, progress percentage, and matched/discrepancy counters',
  })
  async getJobStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reconciliationService.getJobStatus(tenantId, id);
  }

  @Get('jobs')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'List reconciliation jobs for current organization' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of reconciliation jobs' })
  async listJobs(
    @TenantId() tenantId: string,
    @Query() filter: JobFilterDto,
  ) {
    return this.reconciliationService.listJobs(tenantId, filter);
  }

  @Get('jobs/:id/movements')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'List individual bank movements in a job with discrepancy details',
    description:
      'Allows filtering by RECONCILED or DISCREPANCY, showing the reason (AMOUNT_MISMATCH, DATE_OUT_OF_BOUNDS, TRANSACTION_NOT_FOUND).',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated movements list' })
  async listJobMovements(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filter: MovementFilterDto,
  ) {
    return this.reconciliationService.listMovements(tenantId, id, filter);
  }

  @Patch('movements/:id/manual-match')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR)
  @ApiOperation({
    summary: 'Force manual reconciliation between a discrepancy movement and a transaction',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bank movement status updated to RECONCILED',
  })
  async forceManualMatch(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualMatchDto,
  ) {
    return this.reconciliationService.forceManualMatch(tenantId, id, dto);
  }
}
