import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from './push.service';
import { EmailService } from './email.service';
import { NotificationCapsService } from './notification-caps.service';
import { NotificationType, NotificationCategory, EMAIL_NOTIFICATION_TYPES } from './notification-types.enum';
import { NotificationQueryDto, NotificationListResponseDto } from './dto';

export interface CreateNotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  category?: NotificationCategory;
  sendPush?: boolean;
  sendEmail?: boolean;
  emailTemplate?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
    private readonly capsService: NotificationCapsService,
  ) {}

  /**
   * Create a single notification for one user
   * Always writes to DB first, then attempts push/email
   */
  async notifyOne(options: CreateNotificationOptions): Promise<void> {
    const {
      userId,
      type,
      title,
      body,
      data,
      category,
      sendPush = true,
      sendEmail,
      emailTemplate,
    } = options;

    // 1. Always write notification to DB first (critical rule)
    try {
      await this.prisma.notificationV2.create({
        data: {
          userId,
          type,
          title,
          body,
          data: data || {},
          category: category || NotificationCategory.OTHER,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification in DB: ${error.message}`);
      // Don't throw - we still want to try push/email
    }

    // 2. Attempt push notification (non-blocking)
    if (sendPush) {
      this.sendPushNotification(userId, title, body, data).catch((err) => {
        this.logger.error(`Push notification failed: ${err.message}`);
      });
    }

    // 3. Send email for critical notification types
    const shouldEmail = sendEmail ?? EMAIL_NOTIFICATION_TYPES.includes(type);
    if (shouldEmail) {
      this.sendEmailNotification(userId, type, emailTemplate || type.toLowerCase(), data || {}).catch(
        (err) => {
          this.logger.error(`Email notification failed: ${err.message}`);
        },
      );
    }
  }

  /**
   * Send notifications to multiple users (followers, hobby group, etc.)
   */
  async notifyMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
    data?: Record<string, any>,
    category?: NotificationCategory,
  ): Promise<{ sent: number; skipped: number }> {
    let sent = 0;
    let skipped = 0;

    for (const userId of userIds) {
      try {
        // Check spam caps for blog notifications
        if (type === NotificationType.BLOG_NEW_POST_FOLLOWED_AUTHOR && data?.authorId) {
          const canNotify = await this.capsService.canNotifyFollowerAboutAuthor(
            userId,
            data.authorId,
          );
          if (!canNotify) {
            skipped++;
            continue;
          }
        }

        if (type === NotificationType.BLOG_NEW_POST_HOBBY_CATEGORY && data?.hobbyCategory) {
          const canNotify = await this.capsService.canNotifyUserAboutHobbyCategory(
            userId,
            data.hobbyCategory,
          );
          if (!canNotify) {
            skipped++;
            continue;
          }
        }

        await this.notifyOne({
          userId,
          type,
          title,
          body,
          data,
          category,
          sendEmail: false, // Batch notifications don't send email
        });
        sent++;
      } catch (error) {
        this.logger.error(`Failed to notify user ${userId}: ${error.message}`);
        skipped++;
      }
    }

    return { sent, skipped };
  }

  /**
   * Get paginated notification feed for a user
   */
  async getNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    const { page = 1, limit = 20, isRead, category } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;
    if (category) where.category = category;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notificationV2.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notificationV2.count({ where }),
      this.prisma.notificationV2.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        ...n,
        data: (n.data as Record<string, any>) || undefined,
        category: n.category || undefined,
      })),
      total,
      unreadCount,
      page,
      limit,
      hasMore: skip + notifications.length < total,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notificationV2.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notificationV2.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }

  /**
   * Register or update FCM push token
   */
  async registerPushToken(
    userId: string,
    fcmToken: string,
    platform: string,
    deviceId?: string,
    language?: string,
  ): Promise<void> {
    await this.prisma.notificationToken.upsert({
      where: {
        userId_fcmToken: { userId, fcmToken },
      },
      update: {
        platform,
        deviceId,
        language,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId,
        fcmToken,
        platform,
        deviceId,
        language,
        isActive: true,
      },
    });
  }

  /**
   * Deactivate a push token (on logout or token refresh)
   */
  async deactivatePushToken(userId: string, fcmToken: string): Promise<void> {
    await this.prisma.notificationToken.updateMany({
      where: { userId, fcmToken },
      data: { isActive: false },
    });
  }

  // ==================== PRIVATE HELPERS ====================

  private async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const tokens = await this.prisma.notificationToken.findMany({
      where: { userId, isActive: true },
      select: { fcmToken: true },
    });

    if (tokens.length === 0) return;

    const tokenStrings = tokens.map((t) => t.fcmToken);
    const stringData = data
      ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
      : undefined;

    const result = await this.pushService.sendToUser(tokenStrings, title, body, stringData);

    // Deactivate invalid tokens
    if (result.invalidTokens.length > 0) {
      await this.prisma.notificationToken.updateMany({
        where: { fcmToken: { in: result.invalidTokens } },
        data: { isActive: false },
      });
    }
  }

  private async sendEmailNotification(
    userId: string,
    type: NotificationType,
    template: string,
    data: Record<string, any>,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user?.email) return;

    await this.emailService.sendTemplate(
      userId,
      user.email,
      template,
      { ...data, name: user.firstName },
      'notification',
      type,
    );
  }
}
