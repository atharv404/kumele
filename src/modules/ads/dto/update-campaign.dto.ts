import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Campaign name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Campaign status', enum: ['draft', 'active', 'paused', 'completed'] })
  @IsOptional()
  @IsIn(['draft', 'active', 'paused', 'completed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Daily impression cap' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dailyImpressionCap?: number;
}
