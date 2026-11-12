import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole, AuthenticatedUser } from '@ledgerflow/types';
import { TransactionsService } from './transactions.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { WebhookPaymentDto } from './dto/webhook-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Process payment with atomic ACID transaction and invoice issuance',
    description:
      'Atomically creates Transaction, generates Invoice and updates Customer available balance in a single DB transaction with automatic rollback on failure.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transaction processed and invoice issued atomically',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'External reference already processed (idempotency constraint)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Customer not found in current organization',
  })
  async processPayment(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.transactionsService.processPayment(tenantId, dto, user.id);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ingest payment event from external Payment Gateway (Webhook)',
    description:
      'Receives signed/formatted gateway webhook, resolves tenant by slug, and executes idempotent ACID processing.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Webhook processed and invoice issued successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Event reference already processed (idempotent)',
  })
  async processWebhook(@Body() payload: WebhookPaymentDto) {
    return this.transactionsService.processWebhook(payload);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List transactions with multi-tenant filtering and pagination',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated transactions list' })
  async listTransactions(
    @TenantId() tenantId: string,
    @Query() filters: TransactionFilterDto,
  ) {
    return this.transactionsService.listTransactions(tenantId, filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get transaction details by ID with associated invoice' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction details retrieved' })
  async getTransactionById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactionsService.getTransactionById(tenantId, id);
  }
}
