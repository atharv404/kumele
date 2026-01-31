import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsDateString } from 'class-validator';

export class CreateShareTokenDto {
  @ApiProperty({ description: 'Entity type', enum: ['event', 'blog'] })
  @IsIn(['event', 'blog'])
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  @IsNotEmpty()
  entityId: string;

  @ApiPropertyOptional({ description: 'Expiration date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ShareTokenResponseDto {
  @ApiProperty()
  token: string;

  @ApiProperty()
  shareUrl: string;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiPropertyOptional()
  expiresAt?: Date;
}

export class ResolvedShareTokenDto {
  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiProperty()
  deepLink: string;

  @ApiPropertyOptional()
  entity?: Record<string, any>;
}
