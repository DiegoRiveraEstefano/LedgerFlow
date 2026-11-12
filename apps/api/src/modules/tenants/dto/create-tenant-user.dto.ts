import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '@ledgerflow/types';

export class CreateTenantUserDto {
  @ApiProperty({
    example: 'operator2@fintech.cl',
    description: 'Corporate email for new operator or auditor in tenant',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  email!: string;

  @ApiProperty({
    example: 'SecurePass2026!',
    description: 'Initial password for new account',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiProperty({ example: 'Camila' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Morales' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.FINANCE_OPERATOR,
    description: 'Assigned Role within tenant: ADMIN, FINANCE_OPERATOR, or AUDITOR',
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: ADMIN, FINANCE_OPERATOR, AUDITOR',
  })
  role!: UserRole;
}
