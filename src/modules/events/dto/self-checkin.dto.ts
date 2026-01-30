import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsLatitude, IsLongitude } from 'class-validator';
import { Type } from 'class-transformer';

export class SelfCheckinDto {
  @ApiProperty({ description: 'Guest current latitude', example: 52.5205 })
  @IsLatitude()
  @Type(() => Number)
  guestLat: number;

  @ApiProperty({ description: 'Guest current longitude', example: 13.4049 })
  @IsLongitude()
  @Type(() => Number)
  guestLng: number;
}
