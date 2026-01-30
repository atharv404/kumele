import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefundEligibilityResponseDto {
  @ApiProperty()
  eligible: boolean;

  @ApiProperty()
  reason: string;

  @ApiPropertyOptional()
  refundableAmount?: number;

  @ApiPropertyOptional()
  currency?: string;

  @ApiProperty()
  attendanceVerified: boolean;

  @ApiPropertyOptional()
  eventStatus?: string;

  @ApiPropertyOptional()
  hoursBeforeEvent?: number;
}

export class RefundRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  reason: string;

  @ApiProperty()
  amountMinor: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  processedAt?: Date;

  @ApiPropertyOptional()
  processedBy?: string;
}
