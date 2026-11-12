import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'CUST-CLP-001',
    description: 'External identifier of customer in ERP / CRM',
  })
  @IsString()
  @IsNotEmpty()
  externalCustomerId!: string;

  @ApiProperty({
    example: 'Distribuidora del Sur S.A.',
    description: 'Full legal or commercial name of the customer',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'contacto@delsur.cl',
    description: 'Billing or contact email',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: 'CLP',
    description: 'ISO 4217 Currency code (defaults to CLP)',
    default: 'CLP',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'CLP';
}
