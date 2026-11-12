import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@ledgerflow/types';

export class UserSummaryDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id!: string;

  @ApiProperty({ example: 'admin@fintech.cl' })
  email!: string;

  @ApiProperty({ example: 'Diego' })
  firstName!: string;

  @ApiProperty({ example: 'Pérez' })
  lastName!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  role!: UserRole;

  @ApiProperty({ example: 'c0a80101-0000-0000-0000-000000000001' })
  tenantId!: string;
}

export class TenantSummaryDto {
  @ApiProperty({ example: 'c0a80101-0000-0000-0000-000000000001' })
  id!: string;

  @ApiProperty({ example: 'FinTech Andes SpA' })
  name!: string;

  @ApiProperty({ example: 'fintech-andes' })
  slug!: string;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Signed JSON Web Token for Bearer authentication',
  })
  accessToken!: string;

  @ApiProperty({ example: '7d', description: 'Token expiration window' })
  expiresIn!: string;

  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;

  @ApiProperty({ type: TenantSummaryDto })
  tenant!: TenantSummaryDto;
}
