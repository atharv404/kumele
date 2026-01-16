import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

class UserDto {
  @ApiProperty({ description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'First name', example: 'John', nullable: true })
  firstName: string | null;

  @ApiProperty({ description: 'Last name', example: 'Doe', nullable: true })
  lastName: string | null;

  @ApiProperty({ description: 'Display name', example: 'John Doe', nullable: true })
  displayName: string | null;

  @ApiProperty({ description: 'Avatar URL', nullable: true })
  avatar: string | null;

  @ApiProperty({ description: 'User role', enum: UserRole, example: UserRole.USER })
  role: UserRole;

  @ApiProperty({ description: 'Email verified status', example: false })
  emailVerified: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'User information', type: UserDto })
  user: UserDto;

  @ApiProperty({
    description: 'JWT access token (15 minute expiration)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token (30 day expiration)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 900,
  })
  expiresIn: number;
}
