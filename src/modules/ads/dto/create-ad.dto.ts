import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsUrl,
  IsArray,
  IsIn,
} from 'class-validator';

export class CreateAdDto {
  @ApiProperty({ description: 'Campaign ID' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({ description: 'Ad title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Ad body text' })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ description: 'Media URL (image/video)' })
  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @ApiProperty({ description: 'Media type', enum: ['image', 'video', 'none'] })
  @IsIn(['image', 'video', 'none'])
  mediaType: string;

  @ApiProperty({ description: 'Destination type', enum: ['event', 'blog', 'external_url'] })
  @IsIn(['event', 'blog', 'external_url'])
  destinationType: string;

  @ApiPropertyOptional({ description: 'Destination entity ID (for event/blog)' })
  @IsOptional()
  @IsString()
  destinationId?: string;

  @ApiPropertyOptional({ description: 'Destination URL (for external_url)' })
  @IsOptional()
  @IsUrl()
  destinationUrl?: string;

  @ApiPropertyOptional({ description: 'Target hobby slugs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetHobbies?: string[];

  @ApiPropertyOptional({ description: 'Target location keys (city_country)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLocations?: string[];

  @ApiPropertyOptional({ description: 'Target languages', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLanguages?: string[];

  @ApiPropertyOptional({ description: 'Minimum target age' })
  @IsOptional()
  @IsInt()
  @Min(13)
  targetAgeMin?: number;

  @ApiPropertyOptional({ description: 'Maximum target age' })
  @IsOptional()
  @IsInt()
  @Max(120)
  targetAgeMax?: number;

  @ApiPropertyOptional({ description: 'Target gender', enum: ['male', 'female', 'other', 'all'] })
  @IsOptional()
  @IsIn(['male', 'female', 'other', 'all'])
  targetGender?: string;
}
