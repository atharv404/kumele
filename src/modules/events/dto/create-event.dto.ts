import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title', example: 'Football Match' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Event description', example: 'Friendly game at the park' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Hobby category ID' })
  @IsString()
  @IsNotEmpty()
  hobbyCategoryId: string;

  @ApiProperty({ example: '2026-02-01T18:00:00Z', description: 'Event start time (ISO 8601)' })
  @IsDateString()
  eventStartTime: string;

  @ApiProperty({ example: '2026-02-01T21:00:00Z', description: 'Event end time (ISO 8601)' })
  @IsDateString()
  eventEndTime: string;

  @ApiProperty({ minimum: 2, maximum: 100, description: 'Maximum number of participants' })
  @IsInt()
  @Min(2)
  @Max(100)
  capacity: number;

  @ApiProperty({ description: 'Whether the event requires payment' })
  @IsBoolean()
  isPaid: boolean;

  @ApiProperty({ required: false, description: 'Price in EUR (required if isPaid is true)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePriceEur?: number;

  @ApiProperty({ description: 'Latitude of event location', example: 52.52 })
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude of event location', example: 13.405 })
  @IsLongitude()
  longitude: number;

  @ApiProperty({ description: 'Human-readable address', example: 'Berlin, Germany' })
  @IsString()
  @IsNotEmpty()
  displayAddress: string;

  @ApiProperty({ required: false, description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  coverImage?: string;
}
