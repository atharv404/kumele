import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FetchAdsDto {
  @ApiProperty({ description: 'Placement location', enum: ['EVENT_DECISION', 'NOTIFICATIONS'] })
  @IsIn(['EVENT_DECISION', 'NOTIFICATIONS'])
  placement: string;

  @ApiPropertyOptional({ description: 'Location key (city_country)' })
  @IsOptional()
  @IsString()
  locationKey?: string;

  @ApiPropertyOptional({ description: 'User language' })
  @IsOptional()
  @IsString()
  lang?: string;

  @ApiPropertyOptional({ description: 'Hobby context' })
  @IsOptional()
  @IsString()
  hobbyContext?: string;

  @ApiPropertyOptional({ description: 'Number of ads to fetch', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  limit?: number = 1;
}
