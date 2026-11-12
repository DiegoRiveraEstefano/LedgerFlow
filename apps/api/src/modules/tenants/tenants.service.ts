import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            transactions: true,
            invoices: true,
            reconciliationJobs: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Organization tenant not found');
    }

    return tenant;
  }

  async listTenantUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId, // Strict isolation: only returns users for this organization
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTenantUser(tenantId: string, dto: CreateTenantUserDto) {
    const email = dto.email.trim().toLowerCase();

    // Verify email uniqueness inside this tenant
    const existingUser = await this.prisma.user.findUnique({
      where: {
        uq_user_tenant_email: {
          tenantId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException(`User with email '${email}' already exists in this organization`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        role: dto.role,
        isActive: true,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return newUser;
  }
}
