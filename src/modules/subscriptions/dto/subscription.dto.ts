import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Subscription tier ID' })
  @IsString()
  @IsNotEmpty()
  tierId: string;

  @ApiPropertyOptional({ description: 'Discount code to apply' })
  @IsString()
  @IsOptional()
  discountCode?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional({ description: 'Reason for cancellation' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Cancel immediately or at period end' })
  @IsOptional()
  cancelImmediately?: boolean;
}

export class ResumeSubscriptionDto {
  // No additional fields needed
}
