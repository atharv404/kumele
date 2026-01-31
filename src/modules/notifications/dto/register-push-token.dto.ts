import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'FCM device token' })
  @IsString()
  @IsNotEmpty()
  fcmToken: string;

  @ApiProperty({ enum: Platform, description: 'Device platform' })
  @IsEnum(Platform)
  platform: Platform;

  @ApiPropertyOptional({ description: 'Unique device identifier' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'User preferred language' })
  @IsString()
  @IsOptional()
  language?: string;
}
