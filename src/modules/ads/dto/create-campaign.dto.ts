import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Daily impression cap' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyImpressionCap?: number;
}
