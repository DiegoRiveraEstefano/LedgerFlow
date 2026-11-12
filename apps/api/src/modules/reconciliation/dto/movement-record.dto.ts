import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class MovementRecordDto {
  @ApiProperty({
    example: 'TBK-2026-0001',
    description: 'External reference number extracted from bank or gateway report',
  })
  @IsString()
  @IsNotEmpty()
  externalReferenceId!: string;

  @ApiProperty({
    example: 250000.0,
    description: 'Monetary amount registered in bank movement',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @ApiProperty({
    example: '2026-11-10T14:30:00.000Z',
    description: 'Execution or liquidation date of the bank movement (ISO 8601)',
  })
  @IsISO8601()
  movementDate!: string;

  @ApiPropertyOptional({ example: 'CLP', default: 'CLP' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'CLP';

  @ApiPropertyOptional({
    example: 'ABONO TRANSBANK POS-04 RUT 76.123.456-7',
    description: 'Raw bank description text',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'CARTOLA-BCH-202611-LOTE4',
    description: 'Raw bank batch or tracking reference',
  })
  @IsOptional()
  @IsString()
  rawReference?: string;
}
