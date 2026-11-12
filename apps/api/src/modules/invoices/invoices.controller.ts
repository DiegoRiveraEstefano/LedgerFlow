import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
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
import { InvoicesService } from './invoices.service';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'List generated invoices with multi-tenant filtering and pagination' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of invoices' })
  async listInvoices(
    @TenantId() tenantId: string,
    @Query() filters: InvoiceFilterDto,
  ) {
    return this.invoicesService.listInvoices(tenantId, filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiOperation({ summary: 'Get invoice details by ID with associated transaction and customer' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invoice details retrieved' })
  async getInvoiceById(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.getInvoiceById(tenantId, id);
  }
}
