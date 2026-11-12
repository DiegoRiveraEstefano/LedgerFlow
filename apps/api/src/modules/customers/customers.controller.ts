import {
  Controller,
  Get,
  Post,
  Param,
  Body,
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
import { UserRole } from '@ledgerflow/types';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new B2B customer within current organization' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Customer created successfully' })
  async createCustomer(
    @TenantId() tenantId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.createCustomer(tenantId, dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'List all customers in organization with balances and metrics' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of customers' })
  async listCustomers(@TenantId() tenantId: string) {
    return this.customersService.listCustomers(tenantId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Get customer by ID with recent ledger history' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Customer details retrieved' })
  async getCustomerById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customersService.getCustomerById(tenantId, id);
  }
}
