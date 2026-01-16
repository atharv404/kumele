import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

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
}
