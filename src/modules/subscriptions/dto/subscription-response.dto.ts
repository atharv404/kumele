import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubscriptionStatusResponseDto {
  @ApiProperty()
  hasActiveSubscription: boolean;

  @ApiPropertyOptional()
  tier?: string;

  @ApiPropertyOptional()
  status?: string;

  @ApiPropertyOptional()
  currentPeriodEnd?: Date;

  @ApiPropertyOptional()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional()
  entitlements?: Record<string, any>;
}

export class SubscriptionTierDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  priceMonthly: number;

  @ApiProperty()
  priceYearly: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  features: string[];

  @ApiProperty()
  entitlements: Record<string, any>;
}
