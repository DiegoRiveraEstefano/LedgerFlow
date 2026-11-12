import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserRole } from '@ledgerflow/types';
import { TenantsService } from './tenants.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Tenants')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @Roles(UserRole.ADMIN, UserRole.FINANCE_OPERATOR, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'Get current tenant organization profile and global resource metrics',
    description: 'Retrieves current organization data isolated strictly to the authenticated tenant.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tenant details retrieved' })
  async getCurrentTenant(@TenantId() tenantId: string) {
    return this.tenantsService.getTenantDetails(tenantId);
  }

  @Get('users')
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  @ApiOperation({
    summary: 'List all team members and roles inside current tenant organization',
    description: 'Restricted to ADMIN and AUDITOR roles. Demonstrates relational isolation.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of tenant users' })
  async listUsers(@TenantId() tenantId: string) {
    return this.tenantsService.listTenantUsers(tenantId);
  }

  @Post('users')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Provision a new team member with RBAC role inside current tenant organization',
    description: 'Restricted exclusively to ADMIN role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully provisioned within tenant',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User does not possess ADMIN role',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User email already exists in this tenant',
  })
  async createTenantUser(
    @TenantId() tenantId: string,
    @Body() dto: CreateTenantUserDto,
  ) {
    return this.tenantsService.createTenantUser(tenantId, dto);
  }
}
