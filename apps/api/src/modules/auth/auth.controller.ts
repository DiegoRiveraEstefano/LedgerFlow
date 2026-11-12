import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '@ledgerflow/types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register-tenant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Onboard a new organization (Tenant) with primary Admin account',
    description:
      'Creates an isolated tenant organization and issues an initial JWT with role ADMIN.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant registered successfully with session token',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Company slug already in use',
  })
  async registerTenant(@Body() dto: RegisterTenantDto): Promise<AuthResponseDto> {
    return this.authService.registerTenant(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user within specific tenant organization',
    description:
      'Validates credentials against the specified tenantSlug and returns a scoped JWT.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials or inactive organization',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get authenticated user identity and tenant organization context',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User and tenant details retrieved successfully',
  })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getProfile(user.id, user.tenantId);
  }
}
