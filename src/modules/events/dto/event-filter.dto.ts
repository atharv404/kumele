import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsLatitude,
  IsLongitude,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class EventFilterDto {
  @ApiProperty({ required: false, description: 'Filter by hobby category ID' })
  @IsOptional()
  @IsString()
  hobbyCategoryId?: string;

  @ApiProperty({ required: false, description: 'Filter events starting after this time' })
  @IsOptional()
  @IsDateString()
  startAfter?: string;

  @ApiProperty({ required: false, description: 'Filter events starting before this time' })
  @IsOptional()
  @IsDateString()
  startBefore?: string;

  @ApiProperty({ required: false, description: 'Center latitude for location filtering' })
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  centerLat?: number;

  @ApiProperty({ required: false, description: 'Center longitude for location filtering' })
  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  centerLon?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 100, description: 'Search radius in km' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  radiusKm?: number;

  @ApiProperty({ required: false, default: 1, description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 20, description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
