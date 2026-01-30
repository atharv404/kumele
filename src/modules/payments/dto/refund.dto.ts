import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RefundReason {
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  USER_REQUEST = 'USER_REQUEST',
  NO_SHOW_HOST = 'NO_SHOW_HOST',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export class RequestRefundDto {
  @ApiProperty({ description: 'Payment ID to refund' })
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({ enum: RefundReason })
  @IsEnum(RefundReason)
  reason: RefundReason;

  @ApiPropertyOptional({ description: 'Additional details' })
  @IsString()
  @IsOptional()
  details?: string;
}

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
}
