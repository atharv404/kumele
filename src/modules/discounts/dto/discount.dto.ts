import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsArray, IsBoolean, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreateDiscountCodeDto {
  @ApiProperty({ description: 'Unique discount code (will be uppercased)' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: DiscountType })
  @IsEnum(DiscountType)
  type: DiscountType;

  @ApiProperty({ description: 'Discount value (percentage 0-100 or fixed amount in minor units)' })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({ description: 'Product types this applies to' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productTypes?: string[];

  @ApiPropertyOptional({ description: 'Minimum purchase amount in minor units' })
  @IsNumber()
  @IsOptional()
  minAmountMinor?: number;

  @ApiPropertyOptional({ description: 'Maximum total uses' })
  @IsNumber()
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Maximum uses per user' })
  @IsNumber()
  @IsOptional()
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ description: 'Allowed countries (ISO codes)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedCountries?: string[];

  @ApiPropertyOptional({ description: 'Allowed cities' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedCities?: string[];

  @ApiPropertyOptional({ description: 'User segments (NEW, VIP, etc.)' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userSegments?: string[];

  @ApiPropertyOptional({ description: 'Valid from date' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Valid until date' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Is code active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateDiscountCodeDto {
  @ApiPropertyOptional({ enum: DiscountType })
  @IsEnum(DiscountType)
  @IsOptional()
  type?: DiscountType;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class DiscountCodeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  validFrom?: Date;

  @ApiPropertyOptional()
  validUntil?: Date;

  @ApiProperty()
  usageCount: number;

  @ApiPropertyOptional()
  maxUses?: number;
}
