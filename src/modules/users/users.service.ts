import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { User, BadgeTier } from '@prisma/client';
import * as QRCode from 'qrcode';

import { PrismaService } from '../../prisma/prisma.service';

// Reward tier thresholds (events in last 30 days)
const REWARD_THRESHOLDS = {
  GOLD: 15,
  SILVER: 8,
  BRONZE: 3,
};

export interface ProfileCompleteness {
  percentage: number;
  missingFields: string[];
  completedFields: string[];
}

export interface RewardStatus {
  currentTier: BadgeTier;
  eventsAttendedLast30Days: number;
  progressToNextTier: {
    nextTier: BadgeTier | null;
    eventsNeeded: number;
    eventsRemaining: number;
  };
  badges: Array<{
    tier: BadgeTier;
    earnedAt: Date | null;
  }>;
  nftBadges: Array<{
    id: string;
    name: string;
    imageUrl: string;
    acquiredAt: Date;
  }>;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  /**
   * Find user by referral code
   */
  async findByReferralCode(referralCode: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { referralCode },
    });
  }

  /**
   * Get user by ID (throws if not found)
   */
  async getById(id: string): Promise<User> {
    const user = await this.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'displayName' | 'avatar' | 'bio' | 'dateOfBirth' | 'gender' | 'phone' | 'city' | 'country' | 'latitude' | 'longitude' | 'locationRadius' | 'preferredLanguage'>>,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Validate referral code
   */
  async validateReferralCode(referralCode: string): Promise<{ valid: boolean; referrerId?: string }> {
    const user = await this.findByReferralCode(referralCode);
    
    if (!user) {
      return { valid: false };
    }

    return { valid: true, referrerId: user.id };
  }

  /**
   * Get users referred by a user
   */
  async getReferrals(userId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { referredBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Count users referred by a user
   */
  async countReferrals(userId: string): Promise<number> {
    return this.prisma.user.count({
      where: { referredBy: userId },
    });
  }

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return !user;
  }

  /**
   * Soft delete user
   */
  async softDelete(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        email: `deleted_${Date.now()}_${userId}@deleted.com`,
      },
    });

    this.logger.log(`User soft deleted: ${userId}`);
  }

  /**
   * Generate referral code for user
   */
  async generateReferralCode(userId: string): Promise<string> {
    const user = await this.getById(userId);
    
    // If user already has a referral code, return it
    if (user.referralCode) {
      return user.referralCode;
    }

    // Generate unique 8-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Check if code is unique
      const existing = await this.findByReferralCode(code);
      if (!existing) {
        isUnique = true;
      }
    }

    // Save the code
    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code! },
    });

    this.logger.log(`Referral code generated for user: ${userId}`);
    return code!;
  }

  /**
   * Generate QR code for user identity
   * Used for event check-in by host scanning
   */
  async generateQRCode(userId: string): Promise<string> {
    const user = await this.getById(userId);

    const qrPayload = {
      type: 'kumele_user',
      userId: user.id,
      displayName: user.displayName || `${user.firstName} ${user.lastName}`.trim() || 'User',
      avatar: user.avatar,
      generatedAt: new Date().toISOString(),
    };

    // Generate QR code as base64 data URL
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrDataUrl;
  }

  /**
   * Calculate profile completeness
   */
  calculateProfileCompleteness(user: User): ProfileCompleteness {
    const requiredFields = [
      { field: 'firstName', label: 'First Name' },
      { field: 'lastName', label: 'Last Name' },
      { field: 'displayName', label: 'Display Name' },
      { field: 'avatar', label: 'Profile Picture' },
      { field: 'bio', label: 'Bio' },
      { field: 'dateOfBirth', label: 'Date of Birth' },
      { field: 'gender', label: 'Gender' },
      { field: 'city', label: 'City' },
      { field: 'country', label: 'Country' },
      { field: 'latitude', label: 'Location' },
    ];

    const completedFields: string[] = [];
    const missingFields: string[] = [];

    for (const { field, label } of requiredFields) {
      const value = user[field as keyof User];
      if (value !== null && value !== undefined && value !== '') {
        completedFields.push(label);
      } else {
        missingFields.push(label);
      }
    }

    const percentage = Math.round((completedFields.length / requiredFields.length) * 100);

    return {
      percentage,
      missingFields,
      completedFields,
    };
  }

  /**
   * Get user with hobbies
   */
  async getUserWithHobbies(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        hobbies: {
          include: {
            hobby: true,
          },
        },
      },
    });
  }

  /**
   * Calculate reward tier based on events attended in last 30 days
   */
  async calculateRewardTier(userId: string): Promise<BadgeTier> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const attendedCount = await this.prisma.checkin.count({
      where: {
        userId,
        checkedInAt: { gte: thirtyDaysAgo },
      },
    });

    if (attendedCount >= REWARD_THRESHOLDS.GOLD) return 'GOLD';
    if (attendedCount >= REWARD_THRESHOLDS.SILVER) return 'SILVER';
    if (attendedCount >= REWARD_THRESHOLDS.BRONZE) return 'BRONZE';
    return 'NONE';
  }

  /**
   * Get reward status for user
   */
  async getRewardStatus(userId: string): Promise<RewardStatus> {
    const user = await this.getById(userId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Count events attended in last 30 days
    const eventsAttendedLast30Days = await this.prisma.checkin.count({
      where: {
        userId,
        checkedInAt: { gte: thirtyDaysAgo },
      },
    });

    // Calculate current tier
    let currentTier: BadgeTier = 'NONE';
    if (eventsAttendedLast30Days >= REWARD_THRESHOLDS.GOLD) currentTier = 'GOLD';
    else if (eventsAttendedLast30Days >= REWARD_THRESHOLDS.SILVER) currentTier = 'SILVER';
    else if (eventsAttendedLast30Days >= REWARD_THRESHOLDS.BRONZE) currentTier = 'BRONZE';

    // Calculate progress to next tier
    let nextTier: BadgeTier | null = null;
    let eventsNeeded = 0;
    let eventsRemaining = 0;

    switch (currentTier) {
      case 'NONE':
        nextTier = 'BRONZE';
        eventsNeeded = REWARD_THRESHOLDS.BRONZE;
        eventsRemaining = REWARD_THRESHOLDS.BRONZE - eventsAttendedLast30Days;
        break;
      case 'BRONZE':
        nextTier = 'SILVER';
        eventsNeeded = REWARD_THRESHOLDS.SILVER;
        eventsRemaining = REWARD_THRESHOLDS.SILVER - eventsAttendedLast30Days;
        break;
      case 'SILVER':
        nextTier = 'GOLD';
        eventsNeeded = REWARD_THRESHOLDS.GOLD;
        eventsRemaining = REWARD_THRESHOLDS.GOLD - eventsAttendedLast30Days;
        break;
      case 'GOLD':
        nextTier = null;
        eventsNeeded = 0;
        eventsRemaining = 0;
        break;
    }

    // Get reward history (badges earned)
    const rewardHistory = await this.prisma.rewardHistory.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });

    const badges: Array<{ tier: BadgeTier; earnedAt: Date | null }> = [
      { tier: 'BRONZE', earnedAt: rewardHistory.find(r => r.badge === 'BRONZE')?.earnedAt || null },
      { tier: 'SILVER', earnedAt: rewardHistory.find(r => r.badge === 'SILVER')?.earnedAt || null },
      { tier: 'GOLD', earnedAt: rewardHistory.find(r => r.badge === 'GOLD')?.earnedAt || null },
    ];

    // Get NFT badges (placeholder - will be implemented with Web3)
    const nftBadges: Array<{ id: string; name: string; imageUrl: string; acquiredAt: Date }> = [];

    return {
      currentTier,
      eventsAttendedLast30Days,
      progressToNextTier: {
        nextTier,
        eventsNeeded,
        eventsRemaining: Math.max(0, eventsRemaining),
      },
      badges,
      nftBadges,
    };
  }

  /**
   * Update user's current badge tier
   */
  async updateBadgeTier(userId: string): Promise<BadgeTier> {
    const newTier = await this.calculateRewardTier(userId);
    const user = await this.getById(userId);

    // Only update if tier changed
    if (user.currentBadge !== newTier) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { currentBadge: newTier },
      });

      // Record in reward history if tier increased
      const tierOrder = ['NONE', 'BRONZE', 'SILVER', 'GOLD'];
      if (tierOrder.indexOf(newTier) > tierOrder.indexOf(user.currentBadge)) {
        const now = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await this.prisma.rewardHistory.create({
          data: {
            userId,
            badge: newTier,
            eventCount: await this.prisma.checkin.count({
              where: {
                userId,
                checkedInAt: { gte: thirtyDaysAgo },
              },
            }),
            periodStart: thirtyDaysAgo,
            periodEnd: now,
          },
        });
      }

      this.logger.log(`User ${userId} badge updated: ${user.currentBadge} -> ${newTier}`);
    }

    return newTier;
  }
}
