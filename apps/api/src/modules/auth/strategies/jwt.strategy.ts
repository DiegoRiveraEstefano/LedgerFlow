import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload, AuthenticatedUser } from '@ledgerflow/types';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'ledgerflow_super_secret_jwt_key_at_least_32_characters_long',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Malformed token payload: missing sub or tenantId');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        tenantId: payload.tenantId,
        isActive: true,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User does not exist or has been disabled');
    }

    if (!user.tenant || !user.tenant.isActive) {
      throw new UnauthorizedException('Tenant organization is inactive or suspended');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role as AuthenticatedUser['role'],
      tenantId: user.tenantId,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
