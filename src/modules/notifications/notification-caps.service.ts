import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Service to enforce notification spam caps
 * - Max 1 notification per author per follower per 24h
 * - Max 1 notification per hobby category per user per day
 */
@Injectable()
export class NotificationCapsService {
  private readonly logger = new Logger(NotificationCapsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if we can send a follower notification (author posted new blog)
   * Max 1 per author per follower per 24h
   */
  async canNotifyFollowerAboutAuthor(
    followerId: string,
    authorId: string,
  ): Promise<boolean> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentNotification = await this.prisma.notificationV2.findFirst({
      where: {
        userId: followerId,
        type: 'BLOG_NEW_POST_FOLLOWED_AUTHOR',
        createdAt: { gte: twentyFourHoursAgo },
        data: {
          path: ['authorId'],
          equals: authorId,
        },
      },
    });

    return !recentNotification;
  }

  /**
   * Check if we can send a hobby category notification
   * Max 1 per hobby category per user per day
   */
  async canNotifyUserAboutHobbyCategory(
    userId: string,
    hobbyCategory: string,
  ): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentNotification = await this.prisma.notificationV2.findFirst({
      where: {
        userId,
        type: 'BLOG_NEW_POST_HOBBY_CATEGORY',
        createdAt: { gte: today },
        data: {
          path: ['hobbyCategory'],
          equals: hobbyCategory,
        },
      },
    });

    return !recentNotification;
  }

  /**
   * Check if we can send an ad impression to a user
   * Per-user/per-ad/24h frequency cap
   */
  async canShowAdToUser(userId: string, adId: string): Promise<boolean> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentImpression = await this.prisma.adEventV2.findFirst({
      where: {
        userId,
        adId,
        eventType: 'view',
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    return !recentImpression;
  }

  /**
   * Check if we showed this ad to user in last 6 hours (no-repeat rule)
   */
  async canRepeatAd(userId: string, adId: string): Promise<boolean> {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const recentImpression = await this.prisma.adEventV2.findFirst({
      where: {
        userId,
        adId,
        eventType: 'view',
        createdAt: { gte: sixHoursAgo },
      },
    });

    return !recentImpression;
  }

  /**
   * Check per-user/per-advertiser/24h cap
   */
  async canShowAdvertiserToUser(
    userId: string,
    campaignId: string,
    maxPerDay: number = 5,
  ): Promise<boolean> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await this.prisma.adEventV2.count({
      where: {
        userId,
        campaignId,
        eventType: 'view',
        createdAt: { gte: twentyFourHoursAgo },
      },
    });

    return count < maxPerDay;
  }
}
