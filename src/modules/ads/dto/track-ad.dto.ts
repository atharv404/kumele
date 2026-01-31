import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class TrackAdDto {
  @ApiProperty({ description: 'Ad ID' })
  @IsString()
  @IsNotEmpty()
  adId: string;

  @ApiProperty({ description: 'Campaign ID' })
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  @ApiProperty({ description: 'Unique impression ID (for idempotency)' })
  @IsString()
  @IsNotEmpty()
  impressionId: string;

  @ApiProperty({ description: 'Event type', enum: ['view', 'click', 'conversion'] })
  @IsIn(['view', 'click', 'conversion'])
  eventType: string;

  @ApiPropertyOptional({ description: 'Placement location' })
  @IsOptional()
  @IsString()
  placement?: string;

  @ApiPropertyOptional({ description: 'Hobby context' })
  @IsOptional()
  @IsString()
  hobbyContext?: string;
}
