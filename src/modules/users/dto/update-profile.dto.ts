import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'JohnD',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;

  @ApiPropertyOptional({
    description: 'User bio',
    example: 'Love hiking and photography',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Date of birth (ISO 8601)',
    example: '1990-01-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'New York',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'United States',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 40.7128,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: -74.006,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Location radius for event matching (km)',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  locationRadius?: number;

  @ApiPropertyOptional({
    description: 'Preferred language code',
    example: 'en',
    maxLength: 10,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;
}
