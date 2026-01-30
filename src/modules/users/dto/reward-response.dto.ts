import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeTier } from '@prisma/client';

export class RewardProgressDto {
  @ApiPropertyOptional({ description: 'Next tier to achieve', enum: BadgeTier })
  nextTier: BadgeTier | null;

  @ApiProperty({ description: 'Events needed for next tier', example: 8 })
  eventsNeeded: number;

  @ApiProperty({ description: 'Events remaining to reach next tier', example: 3 })
  eventsRemaining: number;
}

export class BadgeDto {
  @ApiProperty({ description: 'Badge tier', enum: BadgeTier })
  tier: BadgeTier;

  @ApiPropertyOptional({ description: 'Date badge was earned' })
  earnedAt: Date | null;
}

export class NFTBadgeDto {
  @ApiProperty({ description: 'NFT ID' })
  id: string;

  @ApiProperty({ description: 'NFT name', example: 'Gold Event Master' })
  name: string;

  @ApiProperty({ description: 'NFT image URL' })
  imageUrl: string;

  @ApiProperty({ description: 'Date acquired' })
  acquiredAt: Date;
}

export class RewardStatusResponseDto {
  @ApiProperty({ description: 'Current reward tier', enum: BadgeTier, example: 'BRONZE' })
  currentTier: BadgeTier;

  @ApiProperty({ description: 'Events attended in last 30 days', example: 5 })
  eventsAttendedLast30Days: number;

  @ApiProperty({ description: 'Progress to next tier', type: RewardProgressDto })
  progressToNextTier: RewardProgressDto;

  @ApiProperty({ description: 'All earned badges', type: [BadgeDto] })
  badges: BadgeDto[];

  @ApiProperty({ description: 'NFT badges owned', type: [NFTBadgeDto] })
  nftBadges: NFTBadgeDto[];
}
