import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(tenantId: string, dto: CreateCustomerDto) {
    const externalCustomerId = dto.externalCustomerId.trim();

    const existing = await this.prisma.customer.findUnique({
      where: {
        uq_customer_tenant_external_id: {
          tenantId,
          externalCustomerId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Customer with external ID '${externalCustomerId}' already exists in this organization`,
      );
    }

    return this.prisma.customer.create({
      data: {
        tenantId,
        externalCustomerId,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        currency: dto.currency || 'CLP',
        balance: 0.0,
      },
    });
  }

  async listCustomers(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            transactions: true,
            invoices: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCustomerById(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found in current organization');
    }

    return customer;
  }
}
