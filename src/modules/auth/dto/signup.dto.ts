import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'Password (min 8 chars, must include uppercase, lowercase, number)',
    example: 'SecurePass123',
    minLength: 8,
    maxLength: 50,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(50, { message: 'Password must be less than 50 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(50, { message: 'First name must be less than 50 characters' })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(50, { message: 'Last name must be less than 50 characters' })
  lastName: string;

  @ApiPropertyOptional({
    description: 'Referral code from another user',
    example: 'ABC12345',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{8}$/, {
    message: 'Invalid referral code format',
  })
  referralCode?: string;
}
