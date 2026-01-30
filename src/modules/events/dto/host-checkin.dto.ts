import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class HostCheckinDto {
  @ApiProperty({ description: 'Guest user ID to check in' })
  @IsString()
  @IsNotEmpty()
  guestUserId: string;

  @ApiProperty({ required: false, description: 'Optional note for the check-in' })
  @IsOptional()
  @IsString()
  note?: string;
}
