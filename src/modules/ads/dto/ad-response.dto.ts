import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  dailyImpressionCap?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class AdResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  campaignId: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  body?: string;

  @ApiPropertyOptional()
  mediaUrl?: string;

  @ApiProperty()
  mediaType: string;

  @ApiProperty()
  destinationType: string;

  @ApiPropertyOptional()
  destinationId?: string;

  @ApiPropertyOptional()
  destinationUrl?: string;

  @ApiProperty()
  moderationStatus: string;

  @ApiProperty()
  createdAt: Date;
}

export class AdFetchResponseDto {
  @ApiProperty({ enum: ['EVENT_DECISION', 'NOTIFICATIONS'] })
  placement: string;

  @ApiProperty({ enum: ['ML', 'BACKEND', 'ADMOB', 'NONE'] })
  ad_source: string;

  @ApiProperty()
  strict: boolean;

  @ApiPropertyOptional({ type: AdResponseDto })
  first_party_ad?: AdResponseDto | null;

  @ApiPropertyOptional()
  admob_context?: Record<string, any> | null;
}
