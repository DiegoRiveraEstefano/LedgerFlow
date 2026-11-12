import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@ledgerflow/types';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('AuthService (Multi-Tenancy & RBAC)', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  const mockTenant = {
    id: 'tenant-uuid-1',
    name: 'FinTech Andes SpA',
    slug: 'fintech-andes',
    isActive: true,
  };

  const mockUser = {
    id: 'user-uuid-1',
    tenantId: 'tenant-uuid-1',
    email: 'admin@fintechandes.cl',
    passwordHash: '',
    firstName: 'Diego',
    lastName: 'Pérez',
    role: UserRole.ADMIN,
    isActive: true,
    tenant: mockTenant,
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
  });

  beforeEach(async () => {
    prisma = {
      tenant: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prisma);
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked.jwt.token'),
    };

    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_EXPIRES_IN') return '7d';
        return 'test_secret';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('registerTenant', () => {
    const registerDto = {
      companyName: 'FinTech Andes SpA',
      companySlug: 'fintech-andes',
      adminEmail: 'admin@fintechandes.cl',
      adminPassword: 'Password123!',
      adminFirstName: 'Diego',
      adminLastName: 'Pérez',
    };

    it('should successfully register a new tenant and an ADMIN user', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      prisma.tenant.create.mockResolvedValue(mockTenant);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.registerTenant(registerDto);

      expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'fintech-andes' },
      });
      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.user.role).toBe(UserRole.ADMIN);
      expect(result.tenant.slug).toBe('fintech-andes');
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: UserRole.ADMIN,
        tenantId: mockTenant.id,
      });
    });

    it('should throw ConflictException if company slug is already registered', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.registerTenant(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'admin@fintechandes.cl',
      password: 'Password123!',
      tenantSlug: 'fintech-andes',
    };

    it('should authenticate user and return scoped JWT token', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mocked.jwt.token');
      expect(result.user.email).toBe(mockUser.email);
      expect(result.tenant.id).toBe(mockTenant.id);
    });

    it('should throw UnauthorizedException if organization slug does not exist', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if tenant is inactive', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...mockTenant, isActive: false });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user does not exist in this tenant', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      prisma.tenant.findUnique.mockResolvedValue(mockTenant);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ ...loginDto, password: 'WrongPassword999!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile (Tenant Isolation)', () => {
    it('should retrieve user profile strictly filtered by tenantId', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockUser.id, mockTenant.id);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockUser.id,
          tenantId: mockTenant.id,
          isActive: true,
        },
        include: expect.any(Object),
      });
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw NotFoundException if user is queried with a different tenantId', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getProfile(mockUser.id, 'foreign-tenant-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
