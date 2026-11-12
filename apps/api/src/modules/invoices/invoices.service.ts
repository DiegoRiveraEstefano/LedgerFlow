import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '@ledgerflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async listInvoices(
    tenantId: string,
    filters: InvoiceFilterDto,
  ): Promise<PaginatedResponse<any>> {
    const { page, limit, status, customerId, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {
      tenantId, // Strict organization scoping
      ...(status && { status }),
      ...(customerId && { customerId }),
      ...((startDate || endDate) && {
        issuedAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true, email: true, externalCustomerId: true },
          },
          transaction: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              gateway: true,
              externalReferenceId: true,
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
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

  async getInvoiceById(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        tenantId, // Strict multi-tenant isolation
      },
      include: {
        customer: true,
        transaction: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found in current organization');
    }

    return invoice;
  }
}
