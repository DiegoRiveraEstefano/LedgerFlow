import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { PaymentGateway } from '@ledgerflow/types';

export class WebhookPaymentDto {
  @ApiProperty({
    example: 'fintech-cl',
    description: 'Target tenant organization slug',
  })
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;

  @ApiProperty({
    example: 'WH-STRIPE-ch_3MtwBwLkdIwHu7ix28a3tqPa',
    description: 'External gateway unique event or transaction reference',
  })
  @IsString()
  @IsNotEmpty()
  externalReferenceId!: string;

  @ApiProperty({
    example: 'CLI-EXT-4402',
    description: 'Customer identifier in external system',
  })
  @IsString()
  @IsNotEmpty()
  externalCustomerId!: string;

  @ApiPropertyOptional({ example: 'Logística Austral Ltda' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 'facturas@austral.cl' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiProperty({ example: 450000.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'CLP', default: 'CLP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency: string = 'CLP';

  @ApiProperty({ enum: PaymentGateway, example: PaymentGateway.STRIPE })
  @IsEnum(PaymentGateway)
  gateway!: PaymentGateway;

  @ApiPropertyOptional({
    example: { event: 'charge.succeeded', livemode: false },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
