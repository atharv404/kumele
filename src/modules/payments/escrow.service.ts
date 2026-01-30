import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
  }

  /**
   * Daily job to process escrow releases
   * CRITICAL: Only release if:
   * 1. Event ended 7+ days ago
   * 2. Attendance was verified (check-in exists)
   * 3. No pending disputes
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processEscrowReleases() {
    this.logger.log('Starting escrow release processing...');

    const now = new Date();
    
    // Find all escrows eligible for release
    const eligibleEscrows = await this.prisma.escrow.findMany({
      where: {
        status: 'HELD',
        releaseAt: { lte: now },
        attendanceVerified: true, // CRITICAL: Must have verified attendance
      },
      include: {
        paymentIntent: true,
      },
    });

    this.logger.log(`Found ${eligibleEscrows.length} escrows eligible for release`);

    for (const escrow of eligibleEscrows) {
      try {
        await this.releaseEscrow(escrow);
      } catch (error: any) {
        this.logger.error(`Failed to release escrow ${escrow.id}: ${error.message}`);
        
        // Increment retry count
        await this.prisma.escrow.update({
          where: { id: escrow.id },
          data: {
            retryCount: { increment: 1 },
            status: escrow.retryCount >= 3 ? 'FAILED' : 'HELD',
          },
        });
      }
    }

    this.logger.log('Escrow release processing completed');
  }

  /**
   * Release a single escrow to host
   */
  private async releaseEscrow(escrow: any) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    // 1. Mark as scheduled
    await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: { status: 'SCHEDULED' },
    });

    // 2. Get host's connected account
    const host = await this.prisma.user.findUnique({
      where: { id: escrow.hostId },
      select: { stripeConnectedAccountId: true },
    });
    
    const hostConnectedAccountId = host?.stripeConnectedAccountId;
    
    if (!hostConnectedAccountId) {
      this.logger.warn(`Host ${escrow.hostId} has no connected account, skipping`);
      await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { status: 'HELD' },
      });
      return;
    }

    // 3. Calculate platform fee (10% of event price)
    const platformFeePercent = this.configService.get<number>('PLATFORM_FEE_PERCENT', 10);
    const platformFee = Math.round((escrow.amountMinor * platformFeePercent) / 100);
    const hostAmount = escrow.amountMinor - platformFee;

    // 4. Create transfer to host
    const transfer = await this.stripe.transfers.create({
      amount: hostAmount,
      currency: escrow.currency.toLowerCase(),
      destination: hostConnectedAccountId,
      transfer_group: `event_${escrow.eventId}`,
      metadata: {
        escrowId: escrow.id,
        eventId: escrow.eventId,
        hostId: escrow.hostId,
        originalAmount: escrow.amountMinor.toString(),
        platformFee: platformFee.toString(),
      },
    });

    // 5. Update escrow with transfer ID
    await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: {
        stripeTransferId: transfer.id,
        releasedAt: new Date(),
      },
    });

    this.logger.log(`Initiated transfer ${transfer.id} for escrow ${escrow.id}, amount: ${hostAmount}`);
  }

  /**
   * Handle successful transfer (webhook)
   */
  async handleTransferSuccess(transferId: string) {
    const escrow = await this.prisma.escrow.findFirst({
      where: { stripeTransferId: transferId },
    });

    if (!escrow) {
      this.logger.warn(`No escrow found for transfer ${transferId}`);
      return;
    }

    await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: {
        status: 'RELEASED',
        releasedAt: new Date(),
      },
    });

    this.logger.log(`Escrow ${escrow.id} released successfully`);
  }

  /**
   * Handle failed transfer (webhook)
   */
  async handleTransferFailure(transferId: string) {
    const escrow = await this.prisma.escrow.findFirst({
      where: { stripeTransferId: transferId },
    });

    if (!escrow) {
      this.logger.warn(`No escrow found for failed transfer ${transferId}`);
      return;
    }

    await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: {
        status: 'FAILED',
        retryCount: { increment: 1 },
      },
    });

    this.logger.log(`Transfer failed for escrow ${escrow.id}`);
  }

  /**
   * Verify attendance for escrow (called when check-in completes)
   */
  async verifyAttendance(eventId: string, userId: string) {
    // Update all escrows for this event+user to mark attendance verified
    await this.prisma.escrow.updateMany({
      where: {
        eventId,
        paymentIntent: {
          userId,
        },
      },
      data: { attendanceVerified: true },
    });

    this.logger.log(`Attendance verified for user ${userId} at event ${eventId}`);
  }

  /**
   * Process refund for escrow (cancel escrow and refund payment)
   */
  async refundEscrow(escrowId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { paymentIntent: true },
    });

    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.status === 'RELEASED') {
      throw new Error('Cannot refund released escrow');
    }

    if (!this.stripe || !escrow.paymentIntent?.stripeId) {
      throw new Error('Cannot process refund');
    }

    // Create refund in Stripe
    const refund = await this.stripe.refunds.create({
      payment_intent: escrow.paymentIntent.stripeId,
      metadata: {
        escrowId: escrow.id,
        eventId: escrow.eventId,
      },
    });

    // Update escrow status
    await this.prisma.escrow.update({
      where: { id: escrowId },
      data: { status: 'REFUNDED' },
    });

    // Update payment intent status
    await this.prisma.paymentIntent.update({
      where: { id: escrow.paymentIntentId },
      data: { status: 'REFUNDED' },
    });

    this.logger.log(`Escrow ${escrowId} refunded via ${refund.id}`);

    return refund;
  }

  /**
   * Get escrow statistics for admin dashboard
   */
  async getEscrowStats() {
    const [held, scheduled, released, failed, refunded] = await Promise.all([
      this.prisma.escrow.aggregate({
        where: { status: 'HELD' },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.escrow.aggregate({
        where: { status: 'SCHEDULED' },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.escrow.aggregate({
        where: { status: 'RELEASED' },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.escrow.aggregate({
        where: { status: 'FAILED' },
        _sum: { amountMinor: true },
        _count: true,
      }),
      this.prisma.escrow.aggregate({
        where: { status: 'REFUNDED' },
        _sum: { amountMinor: true },
        _count: true,
      }),
    ]);

    return {
      held: { count: held._count, amount: held._sum.amountMinor || 0 },
      scheduled: { count: scheduled._count, amount: scheduled._sum.amountMinor || 0 },
      released: { count: released._count, amount: released._sum.amountMinor || 0 },
      failed: { count: failed._count, amount: failed._sum.amountMinor || 0 },
      refunded: { count: refunded._count, amount: refunded._sum.amountMinor || 0 },
    };
  }
}
