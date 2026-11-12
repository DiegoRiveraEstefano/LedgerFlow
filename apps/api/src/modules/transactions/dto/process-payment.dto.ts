import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { PaymentGateway } from '@ledgerflow/types';

export class ProcessPaymentDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Internal UUID of customer in LedgerFlow',
  })
  @IsUUID('4', { message: 'customerId must be a valid UUID v4' })
  customerId!: string;

  @ApiProperty({
    example: 150000,
    description: 'Transaction amount to be charged and invoiced',
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount must be a valid decimal number with up to 2 decimal places' })
  @IsPositive({ message: 'amount must be greater than zero' })
  amount!: number;

  @ApiPropertyOptional({
    example: 'CLP',
    description: 'ISO 4217 Currency code',
    default: 'CLP',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency: string = 'CLP';

  @ApiProperty({
    enum: PaymentGateway,
    example: PaymentGateway.TRANSBANK,
    description: 'Payment Gateway utilized for the operation',
  })
  @IsEnum(PaymentGateway, {
    message: 'gateway must be one of: STRIPE, TRANSBANK, MERCADOPAGO, MANUAL',
  })
  gateway!: PaymentGateway;

  @ApiProperty({
    example: 'TBK-ORDER-987654',
    description: 'Unique external reference or authorization code from payment gateway',
  })
  @IsString()
  @IsNotEmpty({ message: 'externalReferenceId is required for idempotency' })
  externalReferenceId!: string;

  @ApiPropertyOptional({
    example: { terminal: 'POS-02', authorizationCode: 'AUTH7812' },
    description: 'Arbitrary gateway metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: 'Cobro por servicios SaaS - Plan Empresa Octubre',
    description: 'Custom notes or details to print on issued invoice',
  })
  @IsOptional()
  @IsString()
  invoiceNotes?: string;
}
