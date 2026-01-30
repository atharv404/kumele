import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentExpiryService implements OnModuleInit {
  private readonly logger = new Logger(PaymentExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log('Payment expiry service initialized');
  }

  /**
   * Check for expired payment windows every minute
   * Releases capacity for events with expired reservations
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredPayments() {
    this.logger.debug('Checking for expired payment windows...');

    try {
      // Find all expired reservations
      const expired = await this.prisma.eventJoin.findMany({
        where: {
          status: 'RESERVED',
          paymentExpiresAt: {
            lt: new Date(),
          },
        },
        include: { event: true },
      });

      if (expired.length === 0) {
        return { processed: 0 };
      }

      this.logger.log(`Found ${expired.length} expired reservations`);

      for (const participation of expired) {
        try {
          // Mark as expired
          await this.prisma.eventJoin.update({
            where: { id: participation.id },
            data: {
              status: 'EXPIRED',
              cancelledBy: 'system',
              cancelledAt: new Date(),
              cancelReason: 'Payment window expired',
            },
          });

          // Release capacity
          await this.prisma.event.update({
            where: { id: participation.eventId },
            data: { currentCount: { decrement: 1 } },
          });

          this.logger.log(
            `Released slot for event ${participation.eventId}, user ${participation.userId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to process expired reservation ${participation.id}: ${error.message}`,
          );
        }
      }

      return { processed: expired.length };
    } catch (error) {
      this.logger.error(`Error checking expired payments: ${error.message}`);
      return { processed: 0, error: error.message };
    }
  }

  /**
   * Auto-complete events that have ended
   * Runs every 15 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCompletedEvents() {
    this.logger.debug('Checking for completed events...');

    try {
      // Find events that have ended but are still ACTIVE
      const endedEvents = await this.prisma.event.findMany({
        where: {
          status: 'ACTIVE',
          isCancelled: false,
          endsAt: {
            lt: new Date(),
          },
        },
      });

      if (endedEvents.length === 0) {
        return { processed: 0 };
      }

      this.logger.log(`Found ${endedEvents.length} events to complete`);

      for (const event of endedEvents) {
        try {
          await this.prisma.event.update({
            where: { id: event.id },
            data: { status: 'COMPLETED' },
          });

          this.logger.log(`Event ${event.id} marked as COMPLETED`);
        } catch (error) {
          this.logger.error(
            `Failed to complete event ${event.id}: ${error.message}`,
          );
        }
      }

      return { processed: endedEvents.length };
    } catch (error) {
      this.logger.error(`Error completing events: ${error.message}`);
      return { processed: 0, error: error.message };
    }
  }

  /**
   * Manual trigger for expired payments (for testing)
   */
  async triggerExpiredPaymentsCheck() {
    return this.handleExpiredPayments();
  }
}
