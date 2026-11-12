import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@fintech.cl',
    description: 'User registered email address',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email!: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Account secure password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiProperty({
    example: 'fintech-cl',
    description: 'Unique tenant / company slug for organization isolation',
  })
  @IsString()
  @IsNotEmpty({ message: 'Tenant slug is required for multi-tenant authentication' })
  tenantSlug!: string;
}
