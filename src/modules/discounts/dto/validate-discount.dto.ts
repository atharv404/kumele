import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateDiscountDto {
  @ApiProperty({ description: 'Discount code to validate' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Product type (EVENT, SUBSCRIPTION, etc.)' })
  @IsString()
  @IsNotEmpty()
  productType: string;

  @ApiProperty({ description: 'Amount in minor units (cents)' })
  @IsNumber()
  @Min(0)
  amountMinor: number;
}

export class ValidateDiscountResponseDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  discountAmount?: number;

  @ApiProperty({ required: false })
  discountType?: string;

  @ApiProperty({ required: false })
  discountValue?: number;

  @ApiProperty({ required: false })
  finalAmount?: number;
}
