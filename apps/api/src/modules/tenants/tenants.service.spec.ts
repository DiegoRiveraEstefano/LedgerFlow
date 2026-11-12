import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@ledgerflow/types';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('TenantsService (Multi-Tenancy Isolation)', () => {
  let service: TenantsService;
  let prisma: any;

  const mockTenantId = 'tenant-uuid-1';
  const mockTenant = {
    id: mockTenantId,
    name: 'FinTech Andes SpA',
    slug: 'fintech-andes',
    _count: { users: 2, transactions: 10, invoices: 10 },
  };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  describe('getTenantDetails', () => {
    it('should return tenant details for the requested tenantId', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      const result = await service.getTenantDetails(mockTenantId);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: mockTenantId },
        include: expect.any(Object),
      });
      expect(result.id).toBe(mockTenantId);
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.getTenantDetails('non-existent-tenant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listTenantUsers (Strict Multi-Tenancy)', () => {
    it('should query users strictly filtering by the provided tenantId', async () => {
      const mockUsers = [
        { id: 'u1', email: 'admin@fintech.cl', role: UserRole.ADMIN },
        { id: 'u2', email: 'operator@fintech.cl', role: UserRole.FINANCE_OPERATOR },
      ];
      prisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listTenantUsers(mockTenantId);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('createTenantUser', () => {
    const newUserDto = {
      email: 'newoperator@fintech.cl',
      password: 'OperatorSecret123!',
      firstName: 'Laura',
      lastName: 'Gómez',
      role: UserRole.FINANCE_OPERATOR,
    };

    it('should provision a new user scoped to tenantId', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        tenantId: mockTenantId,
        email: newUserDto.email,
        role: newUserDto.role,
      });

      const result = await service.createTenantUser(mockTenantId, newUserDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          uq_user_tenant_email: {
            tenantId: mockTenantId,
            email: newUserDto.email,
          },
        },
      });
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.role).toBe(UserRole.FINANCE_OPERATOR);
    });

    it('should throw ConflictException if email is already registered in the tenant', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(service.createTenantUser(mockTenantId, newUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
