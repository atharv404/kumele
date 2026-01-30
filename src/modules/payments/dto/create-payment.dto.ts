import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventPaymentDto {
  @ApiProperty({ description: 'Event ID to pay for' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({ description: 'Discount code to apply' })
  @IsString()
  @IsOptional()
  discountCode?: string;

  @ApiPropertyOptional({ description: 'Reward discount ID to use' })
  @IsString()
  @IsOptional()
  rewardDiscountId?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Payment intent ID from Stripe' })
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}

export class CreateSubscriptionPaymentDto {
  @ApiProperty({ description: 'Subscription tier ID' })
  @IsString()
  @IsNotEmpty()
  tierId: string;

  @ApiPropertyOptional({ description: 'Discount code to apply' })
  @IsString()
  @IsOptional()
  discountCode?: string;
}
