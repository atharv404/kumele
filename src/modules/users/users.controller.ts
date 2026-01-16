import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { User } from '@prisma/client';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  async getProfile(@CurrentUser() user: User) {
    return this.sanitizeUser(user);
  }

  @Put('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    // Convert dateOfBirth string to Date if provided
    const updateData: Record<string, unknown> = { ...updateProfileDto };
    if (updateProfileDto.dateOfBirth) {
      updateData.dateOfBirth = new Date(updateProfileDto.dateOfBirth);
    }
    
    const updatedUser = await this.usersService.updateProfile(user.id, updateData);
    return this.sanitizeUser(updatedUser);
  }

  @Get('referral-code')
  @ApiOperation({ summary: 'Get current user referral code' })
  @ApiResponse({ status: 200, description: 'Referral code returned' })
  async getReferralCode(@CurrentUser() user: User) {
    return {
      referralCode: user.referralCode,
      referralLink: `https://kumele.com/signup?ref=${user.referralCode}`,
    };
  }

  @Get('referral-code/:code/validate')
  @Public()
  @ApiOperation({ summary: 'Validate a referral code' })
  @ApiParam({ name: 'code', description: 'Referral code to validate' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateReferralCode(@Param('code') code: string) {
    return this.usersService.validateReferralCode(code);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Get users referred by current user' })
  @ApiResponse({ status: 200, description: 'Referrals list returned' })
  async getReferrals(@CurrentUser() user: User) {
    const referrals = await this.usersService.getReferrals(user.id);
    const count = await this.usersService.countReferrals(user.id);

    return {
      count,
      referrals: referrals.map(r => ({
        id: r.id,
        displayName: r.displayName,
        avatar: r.avatar,
        createdAt: r.createdAt,
      })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.getById(id);
    return this.sanitizeUserPublic(user);
  }

  /**
   * Sanitize user object for response (remove sensitive fields)
   */
  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      phone: user.phone,
      city: user.city,
      country: user.country,
      latitude: user.latitude,
      longitude: user.longitude,
      locationRadius: user.locationRadius,
      preferredLanguage: user.preferredLanguage,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      currentBadge: user.currentBadge,
      totalEventsAttended: user.totalEventsAttended,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /**
   * Sanitize user object for public viewing (minimal info)
   */
  private sanitizeUserPublic(user: User) {
    return {
      id: user.id,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      city: user.city,
      country: user.country,
      currentBadge: user.currentBadge,
      totalEventsAttended: user.totalEventsAttended,
      createdAt: user.createdAt,
    };
  }
}
