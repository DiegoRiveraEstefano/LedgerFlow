import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterTenantDto {
  @ApiProperty({
    example: 'FinTech Andes SpA',
    description: 'Legal or trade name of the tenant organization',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Company name must have at least 3 characters' })
  companyName!: string;

  @ApiProperty({
    example: 'fintech-andes',
    description: 'Unique URL-friendly company slug for domain isolation (lowercase, numbers, hyphens)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Company slug can only contain lowercase letters, numbers, and hyphens (e.g. fintech-andes)',
  })
  companySlug!: string;

  @ApiProperty({
    example: 'admin@fintechandes.cl',
    description: 'Work email of the primary organization Administrator',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  adminEmail!: string;

  @ApiProperty({
    example: 'AdminSecret2026!',
    description: 'Administrator initial password (minimum 8 characters)',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  adminPassword!: string;

  @ApiProperty({
    example: 'Diego',
    description: 'Administrator first name',
  })
  @IsString()
  @IsNotEmpty()
  adminFirstName!: string;

  @ApiProperty({
    example: 'Pérez',
    description: 'Administrator last name',
  })
  @IsString()
  @IsNotEmpty()
  adminLastName!: string;
}
