import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BadgeTier, Gender, UserRole, UserStatus } from '@prisma/client';

export class UserProfileResponseDto {
  @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ description: 'First name', example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Display name', example: 'JohnD' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://example.com/avatar.jpg' })
  avatar?: string;

  @ApiPropertyOptional({ description: 'User bio', example: 'Love hiking and photography' })
  bio?: string;

  @ApiPropertyOptional({ description: 'Date of birth' })
  dateOfBirth?: Date;

  @ApiPropertyOptional({ description: 'Gender', enum: Gender })
  gender?: Gender;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1234567890' })
  phone?: string;

  @ApiPropertyOptional({ description: 'City', example: 'New York' })
  city?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'USA' })
  country?: string;

  @ApiPropertyOptional({ description: 'Latitude', example: 40.7128 })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude', example: -74.006 })
  longitude?: number;

  @ApiPropertyOptional({ description: 'Location radius in km', example: 10 })
  locationRadius?: number;

  @ApiPropertyOptional({ description: 'Preferred language', example: 'en' })
  preferredLanguage?: string;

  @ApiProperty({ description: 'User role', enum: UserRole })
  role: UserRole;

  @ApiProperty({ description: 'User status', enum: UserStatus })
  status: UserStatus;

  @ApiProperty({ description: 'Email verified', example: true })
  emailVerified: boolean;

  @ApiProperty({ description: '2FA enabled', example: false })
  twoFactorEnabled: boolean;

  @ApiProperty({ description: 'Current badge tier', enum: BadgeTier })
  currentBadge: BadgeTier;

  @ApiProperty({ description: 'Total events attended', example: 5 })
  totalEventsAttended: number;

  @ApiPropertyOptional({ description: 'Referral code', example: 'A7X9K2PM' })
  referralCode?: string;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Last login date' })
  lastLoginAt?: Date;
}

export class ProfileCompletenessDto {
  @ApiProperty({ description: 'Completion percentage (0-100)', example: 70 })
  percentage: number;

  @ApiProperty({ description: 'Missing fields', example: ['Bio', 'Location'] })
  missingFields: string[];

  @ApiProperty({ description: 'Completed fields', example: ['First Name', 'Last Name', 'Email'] })
  completedFields: string[];
}

export class UserHobbyDto {
  @ApiProperty({ description: 'Hobby ID' })
  id: string;

  @ApiProperty({ description: 'Hobby name', example: 'Photography' })
  name: string;

  @ApiProperty({ description: 'Weight (1-5)', example: 3 })
  weight: number;
}

export class ReferralCodeResponseDto {
  @ApiProperty({ description: 'Referral code', example: 'A7X9K2PM' })
  referralCode: string;

  @ApiProperty({ description: 'Shareable referral link', example: 'https://kumele.com/signup?ref=A7X9K2PM' })
  referralLink: string;
}

export class QRCodeResponseDto {
  @ApiProperty({ description: 'QR code as base64 data URL', example: 'data:image/png;base64,...' })
  qrCodeUrl: string;

  @ApiPropertyOptional({ description: 'Expiration time (null for user identity QR)' })
  expiresAt: Date | null;

  @ApiProperty({ description: 'Usage instructions', example: 'Present this QR code to the event host for check-in' })
  usage: string;
}
