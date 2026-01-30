import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentIntentResponseDto {
  @ApiProperty()
  ok: boolean;

  @ApiProperty()
  clientSecret: string;

  @ApiProperty()
  paymentIntentId: string;

  @ApiProperty()
  amountMinor: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  discountApplied?: number;

  @ApiPropertyOptional()
  originalAmount?: number;
}

export class EscrowStatusDto {
  @ApiProperty()
  escrowId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  amountMinor: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  releaseAt?: Date;

  @ApiProperty()
  attendanceVerified: boolean;
}
