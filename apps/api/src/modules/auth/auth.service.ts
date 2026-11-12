import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole, JwtPayload } from '@ledgerflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerTenant(dto: RegisterTenantDto): Promise<AuthResponseDto> {
    const slug = dto.companySlug.trim().toLowerCase();

    // Check if slug is already taken
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      throw new ConflictException(`An organization with slug '${slug}' already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    // Atomically create Tenant and initial Administrator
    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          name: dto.companyName.trim(),
          slug,
          isActive: true,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          email: dto.adminEmail.trim().toLowerCase(),
          passwordHash,
          firstName: dto.adminFirstName.trim(),
          lastName: dto.adminLastName.trim(),
          role: UserRole.ADMIN,
          isActive: true,
        },
      });

      return { tenant: createdTenant, user: createdUser };
    });

    return this.buildAuthResponse(user, tenant);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const slug = dto.tenantSlug.trim().toLowerCase();
    const email = dto.email.trim().toLowerCase();

    // 1. Resolve Tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant || !tenant.isActive) {
      throw new UnauthorizedException('Invalid organization slug or inactive tenant');
    }

    // 2. Resolve User within Tenant
    const user = await this.prisma.user.findUnique({
      where: {
        uq_user_tenant_email: {
          tenantId: tenant.id,
          email,
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Verify Password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user, tenant);
  }

  async getProfile(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        tenantId, // Strict tenant-level isolation
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found in current organization');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
      tenant: user.tenant,
    };
  }

  private buildAuthResponse(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      tenantId: string;
    },
    tenant: { id: string; name: string; slug: string },
  ): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      tenantId: user.tenantId,
    };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '7d';
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        tenantId: user.tenantId,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }
}
