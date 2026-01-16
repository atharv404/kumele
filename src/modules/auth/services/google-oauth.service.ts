import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Profile } from 'passport-google-oauth20';

import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Find or create user from Google OAuth profile
   */
  async findOrCreateUser(profile: Profile): Promise<User> {
    const email = profile.emails?.[0]?.value?.toLowerCase();

    if (!email) {
      throw new Error('Google profile missing email');
    }

    // Check if user exists by Google ID
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.id },
    });

    if (user) {
      this.logger.debug(`Existing Google user found: ${user.email}`);
      return user;
    }

    // Check if user exists by email
    user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Link Google account to existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          avatar: user.avatar || profile.photos?.[0]?.value,
        },
      });

      this.logger.log(`Linked Google account to existing user: ${user.email}`);
      return user;
    }

    // Create new user
    const referralCode = await this.generateUniqueReferralCode();

    user = await this.prisma.user.create({
      data: {
        email,
        googleId: profile.id,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        displayName: profile.displayName,
        avatar: profile.photos?.[0]?.value,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        referralCode,
      },
    });

    this.logger.log(`New Google user created: ${user.email}`);
    return user;
  }

  /**
   * Generate a unique referral code
   */
  private async generateUniqueReferralCode(): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const length = 8;

    let code: string;
    let exists = true;

    while (exists) {
      code = '';
      for (let i = 0; i < length; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { referralCode: code },
      });

      exists = !!existingUser;
    }

    return code!;
  }
}
