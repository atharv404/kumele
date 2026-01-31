import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NotificationType, NotificationCategory } from './notification-types.enum';

@Injectable()
export class NotificationJobsService {
  private readonly logger = new Logger(NotificationJobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Expire event reservations that haven't been paid
   * Runs every 1 minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireEventReservations(): Promise<void> {
    try {
      const now = new Date();

      // Find expired reservations
      const expiredJoins = await this.prisma.eventJoin.findMany({
        where: {
          status: { in: ['RESERVED', 'PENDING_PAYMENT'] },
          paymentExpiresAt: { lt: now },
        },
        include: {
          event: { select: { title: true } },
          user: { select: { id: true, email: true } },
        },
      });

      if (expiredJoins.length === 0) return;

      this.logger.log(`Expiring ${expiredJoins.length} reservations`);

      for (const join of expiredJoins) {
        // Update status to EXPIRED
        await this.prisma.eventJoin.update({
          where: { id: join.id },
          data: { status: 'EXPIRED' },
        });

        // Send notification
        await this.notificationsService.notifyOne({
          userId: join.userId,
          type: NotificationType.PAYMENT_EXPIRED,
          title: 'Reservation Expired',
          body: `Your reservation for "${join.event.title}" has expired. The payment window has closed.`,
          data: {
            eventId: join.eventId,
            eventTitle: join.event.title,
          },
          category: NotificationCategory.MATCHED_EVENTS,
          sendEmail: true,
          emailTemplate: 'payment_expired',
        });
      }
    } catch (error) {
      this.logger.error(`Failed to expire reservations: ${error.message}`);
    }
  }

  /**
   * Send event reminders 2 hours before start
   * Runs every 15 minutes
   */
  @Cron('0 */15 * * * *')
  async sendEventReminders(): Promise<void> {
    try {
      const now = new Date();
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const twoHoursFifteenFromNow = new Date(now.getTime() + 2.25 * 60 * 60 * 1000);

      // Find events starting in ~2 hours that haven't been reminded
      const upcomingEvents = await this.prisma.event.findMany({
        where: {
          status: 'ACTIVE',
          startsAt: {
            gte: twoHoursFromNow,
            lt: twoHoursFifteenFromNow,
          },
        },
        include: {
          joins: {
            where: { status: { in: ['CONFIRMED', 'JOINED'] } },
            select: { userId: true },
          },
        },
      });

      for (const event of upcomingEvents) {
        const userIds = event.joins.map((j) => j.userId);
        if (userIds.length === 0) continue;

        this.logger.log(`Sending reminders for event ${event.id} to ${userIds.length} users`);

        await this.notificationsService.notifyMany(
          userIds,
          NotificationType.EVENT_REMINDER,
          'Event Starting Soon!',
          `${event.title} starts in 2 hours. Don't forget to attend!`,
          {
            eventId: event.id,
            eventTitle: event.title,
            startsAt: event.startsAt.toISOString(),
          },
          NotificationCategory.MATCHED_EVENTS,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send event reminders: ${error.message}`);
    }
  }

  /**
   * Send birthday notifications
   * Runs daily at 09:00
   */
  @Cron('0 0 9 * * *')
  async sendBirthdayNotifications(): Promise<void> {
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      // Find users with birthday today
      const birthdayUsers = await this.prisma.$queryRaw<{ id: string; firstName: string }[]>`
        SELECT id, "firstName" 
        FROM users 
        WHERE EXTRACT(MONTH FROM "dateOfBirth") = ${month}
          AND EXTRACT(DAY FROM "dateOfBirth") = ${day}
          AND status = 'ACTIVE'
      `;

      for (const user of birthdayUsers) {
        await this.notificationsService.notifyOne({
          userId: user.id,
          type: NotificationType.BIRTHDAY,
          title: 'Happy Birthday! 🎉',
          body: `Happy Birthday${user.firstName ? `, ${user.firstName}` : ''}! We hope you have an amazing day full of hobby activities!`,
          category: NotificationCategory.OTHER,
          sendEmail: false,
        });
      }

      this.logger.log(`Sent birthday notifications to ${birthdayUsers.length} users`);
    } catch (error) {
      this.logger.error(`Failed to send birthday notifications: ${error.message}`);
    }
  }

  /**
   * Send rate event reminders for events that ended
   * Runs every 6 hours
   */
  @Cron('0 0 */6 * * *')
  async sendRateEventReminders(): Promise<void> {
    try {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Find events that ended in the last 6-24 hours
      const recentEvents = await this.prisma.event.findMany({
        where: {
          status: 'COMPLETED',
          endsAt: {
            gte: twentyFourHoursAgo,
            lt: sixHoursAgo,
          },
        },
        include: {
          joins: {
            where: { status: 'ATTENDED' },
            select: { userId: true },
          },
        },
      });

      for (const event of recentEvents) {
        const userIds = event.joins.map((j) => j.userId);
        if (userIds.length === 0) continue;

        await this.notificationsService.notifyMany(
          userIds,
          NotificationType.EVENT_RATE_REMINDER,
          'Rate Your Experience',
          `How was "${event.title}"? Share your feedback to help others!`,
          {
            eventId: event.id,
            eventTitle: event.title,
          },
          NotificationCategory.MATCHED_EVENTS,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to send rate event reminders: ${error.message}`);
    }
  }
}
