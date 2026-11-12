import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ManualMatchDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Transaction UUID to force-match with the bank movement',
  })
  @IsUUID('4', { message: 'transactionId must be a valid UUID v4' })
  transactionId!: string;
}
