import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';

export enum BlogSortBy {
  MOST_RECENT = 'most_recent',
  MOST_LIKED = 'most_liked',
  MOST_COMMENTED = 'most_commented',
}

export class BlogFilterDto {
  @ApiProperty({ required: false, description: 'Filter by hobby category ID' })
  @IsOptional()
  @IsString()
  hobbyCategoryId?: string;

  @ApiProperty({
    required: false,
    enum: BlogSortBy,
    default: BlogSortBy.MOST_RECENT,
    description: 'Sort order',
  })
  @IsOptional()
  @IsEnum(BlogSortBy)
  sortBy?: BlogSortBy = BlogSortBy.MOST_RECENT;

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
