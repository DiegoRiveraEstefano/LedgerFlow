import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { MovementRecordDto } from './movement-record.dto';

export class UploadBatchDto {
  @ApiProperty({
    example: 'cartola_banco_chile_noviembre_2026.csv',
    description: 'Original name of uploaded statement or report file',
  })
  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @ApiProperty({
    type: [MovementRecordDto],
    description: 'List of bank movements extracted from the file',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Must provide at least 1 bank movement to reconcile' })
  @ValidateNested({ each: true })
  @Type(() => MovementRecordDto)
  records!: MovementRecordDto[];
}
