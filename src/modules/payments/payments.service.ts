import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JoinStatus, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not configured - payments will fail');
    }
  }

  /**
   * Create payment intent for event participation
   * CRITICAL: Capture immediately, hold in escrow, release 7 days after event + verified attendance
   */
  async createEventPayment(userId: string, eventId: string, discountCode?: string, rewardDiscountId?: string) {
    // 1. Validate participation exists and is in RESERVED status
    const participation = await this.prisma.eventJoin.findFirst({
      where: {
        userId,
        eventId,
        status: JoinStatus.RESERVED,
      },
      include: {
        event: true,
        user: true,
      },
    });

    if (!participation) {
      throw new NotFoundException('No reserved participation found for this event');
    }

    // 2. Check payment window
    if (participation.paymentExpiresAt && new Date() > participation.paymentExpiresAt) {
      // Payment window expired - cancel reservation
      await this.prisma.eventJoin.update({
        where: { id: participation.id },
        data: { status: JoinStatus.EXPIRED },
      });
      throw new BadRequestException('Payment window expired');
    }

    // 3. Calculate price (apply discount if any)
    const basePriceEur = participation.event.basePriceEur;
    let baseAmountMinor = Math.round((basePriceEur ? Number(basePriceEur) : 0) * 100);
    let discountAmountMinor = 0;
    let appliedDiscountId: string | null = null;
    let appliedRewardId: string | null = null;

    // Apply discount code if provided
    if (discountCode) {
      const discount = await this.validateAndApplyDiscount(
        discountCode,
        userId,
        baseAmountMinor,
        'EVENT',
      );
      if (discount.valid) {
        discountAmountMinor = discount.discountAmount;
        appliedDiscountId = discount.discountId ?? null;
      }
    }

    // Apply reward discount if provided (mutually exclusive with discount code)
    if (rewardDiscountId && !discountCode) {
      const reward = await this.validateAndApplyRewardDiscount(
        rewardDiscountId,
        userId,
        baseAmountMinor,
      );
      if (reward.valid) {
        discountAmountMinor = reward.discountAmount;
        appliedRewardId = reward.rewardId ?? null;
      }
    }

    const finalAmountMinor = Math.max(baseAmountMinor - discountAmountMinor, 0);
    const currency = participation.event.currency || 'EUR';

    // 4. Create Stripe payment intent
    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    // Create or get customer - fetch user with stripe fields
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, stripeCustomerId: true },
    });
    
    let stripeCustomerId = user?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: participation.user.email,
        metadata: {
          userId: userId,
        },
      });
      stripeCustomerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: finalAmountMinor,
      currency: currency.toLowerCase(),
      customer: stripeCustomerId,
      capture_method: 'automatic', // Capture immediately
      metadata: {
        eventId,
        userId,
        participationId: participation.id,
        discountCodeId: appliedDiscountId || '',
        rewardDiscountId: appliedRewardId || '',
        type: 'event_payment',
      },
    });

    // 5. Save payment intent to database
    await this.prisma.paymentIntent.create({
      data: {
        stripeId: paymentIntent.id,
        userId,
        eventId,
        amount: new Decimal(finalAmountMinor / 100),
        amountMinor: finalAmountMinor,
        originalAmountMinor: baseAmountMinor,
        discountAmountMinor,
        currency,
        status: 'PENDING',
        productType: 'EVENT',
        discountCodeId: appliedDiscountId,
        rewardDiscountId: appliedRewardId,
      },
    });

    this.logger.log(`Created payment intent ${paymentIntent.id} for event ${eventId}, amount: ${finalAmountMinor}`);

    return {
      ok: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountMinor: finalAmountMinor,
      currency,
      discountApplied: discountAmountMinor > 0 ? discountAmountMinor : undefined,
      originalAmount: baseAmountMinor,
    };
  }

  /**
   * Handle successful payment - create escrow hold
   */
  async handlePaymentSuccess(stripePaymentIntentId: string) {
    const paymentIntent = await this.prisma.paymentIntent.findFirst({
      where: { stripeId: stripePaymentIntentId },
      include: {
        event: true,
        user: true,
      },
    });

    if (!paymentIntent) {
      this.logger.error(`Payment intent not found: ${stripePaymentIntentId}`);
      return;
    }

    if (paymentIntent.status === 'SUCCEEDED') {
      this.logger.warn(`Payment already processed: ${stripePaymentIntentId}`);
      return;
    }

    // 1. Update payment status
    await this.prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: { status: 'SUCCEEDED' },
    });

    // 2. Update participation to CONFIRMED
    if (paymentIntent.eventId) {
      await this.prisma.eventJoin.updateMany({
        where: {
          userId: paymentIntent.userId,
          eventId: paymentIntent.eventId,
          status: JoinStatus.RESERVED,
        },
        data: {
          status: JoinStatus.CONFIRMED,
        },
      });
    }

    // 3. Create escrow record (release 7 days after event + attendance verified)
    const eventEndTime = paymentIntent.event?.eventEndTime || paymentIntent.event?.endsAt;
    if (eventEndTime && paymentIntent.eventId && paymentIntent.event) {
      const releaseAt = new Date(eventEndTime.getTime() + 7 * 24 * 60 * 60 * 1000);

      await this.prisma.escrow.create({
        data: {
          paymentIntentId: paymentIntent.id,
          eventId: paymentIntent.eventId,
          hostId: paymentIntent.event.hostId,
          amountMinor: paymentIntent.amountMinor,
          currency: paymentIntent.currency,
          status: 'HELD',
          eventEndAt: eventEndTime,
          releaseAt: releaseAt,
          attendanceVerified: false,
        },
      });
    }

    // 4. Record discount redemption if applicable
    if (paymentIntent.discountCodeId) {
      await this.prisma.discountRedemption.create({
        data: {
          codeId: paymentIntent.discountCodeId,
          userId: paymentIntent.userId,
          amountMinor: paymentIntent.discountAmountMinor || 0,
          currency: paymentIntent.currency,
          productType: 'EVENT',
        },
      });
    }

    this.logger.log(`Payment succeeded for ${stripePaymentIntentId}, escrow created`);
  }

  /**
   * Handle payment failure
   */
  async handlePaymentFailure(stripePaymentIntentId: string, failureReason?: string) {
    const paymentIntent = await this.prisma.paymentIntent.findFirst({
      where: { stripeId: stripePaymentIntentId },
    });

    if (!paymentIntent) {
      this.logger.error(`Payment intent not found for failure: ${stripePaymentIntentId}`);
      return;
    }

    // Update payment status
    await this.prisma.paymentIntent.update({
      where: { id: paymentIntent.id },
      data: {
        status: 'FAILED',
        failureReason: failureReason || null,
      },
    });

    // Revert participation to MATCHED (can retry)
    if (paymentIntent.eventId) {
      await this.prisma.eventJoin.updateMany({
        where: {
          userId: paymentIntent.userId,
          eventId: paymentIntent.eventId,
          status: JoinStatus.RESERVED,
        },
        data: { status: JoinStatus.MATCHED },
      });

      // Decrement event count
      await this.prisma.event.update({
        where: { id: paymentIntent.eventId },
        data: { currentCount: { decrement: 1 } },
      });
    }

    this.logger.log(`Payment failed for ${stripePaymentIntentId}: ${failureReason}`);
  }

  /**
   * Get user's payments history
   */
  async getUserPayments(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.paymentIntent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startsAt: true,
            },
          },
          escrow: true,
        },
      }),
      this.prisma.paymentIntent.count({ where: { userId } }),
    ]);

    return {
      ok: true,
      data: payments.map((p) => ({
        id: p.id,
        stripeId: p.stripeId,
        amount: p.amountMinor / 100,
        currency: p.currency,
        status: p.status,
        event: p.event,
        escrowStatus: p.escrow?.status ?? null,
        createdAt: p.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get escrow status for a payment
   */
  async getEscrowStatus(paymentId: string, userId: string) {
    const payment = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentId },
      include: { escrow: true, event: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Only payment owner or event host can view escrow
    if (payment.userId !== userId && payment.event?.hostId !== userId) {
      throw new ForbiddenException('Not authorized to view this escrow');
    }

    if (!payment.escrow) {
      return {
        ok: true,
        data: { message: 'No escrow exists for this payment' },
      };
    }

    return {
      ok: true,
      data: {
        escrowId: payment.escrow.id,
        status: payment.escrow.status,
        amountMinor: payment.escrow.amountMinor,
        currency: payment.escrow.currency,
        releaseAt: payment.escrow.releaseAt,
        attendanceVerified: payment.escrow.attendanceVerified,
        eventEndAt: payment.escrow.eventEndAt,
      },
    };
  }

  /**
   * Validate and apply discount code
   */
  private async validateAndApplyDiscount(
    code: string,
    userId: string,
    baseAmount: number,
    productType: string,
  ): Promise<{ valid: boolean; discountAmount: number; discountId?: string }> {
    const discount = await this.prisma.discountCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        redemptions: { where: { userId } },
      },
    });

    if (!discount || !discount.isActive) {
      return { valid: false, discountAmount: 0 };
    }

    const now = new Date();
    if (discount.validFrom && now < discount.validFrom) {
      return { valid: false, discountAmount: 0 };
    }
    if (discount.validUntil && now > discount.validUntil) {
      return { valid: false, discountAmount: 0 };
    }

    // Check usage limits
    const totalRedemptions = await this.prisma.discountRedemption.count({
      where: { codeId: discount.id },
    });
    if (discount.maxUses && totalRedemptions >= discount.maxUses) {
      return { valid: false, discountAmount: 0 };
    }
    if (discount.maxUsesPerUser && discount.redemptions.length >= discount.maxUsesPerUser) {
      return { valid: false, discountAmount: 0 };
    }

    // Check minimum amount
    if (discount.minAmount && baseAmount < discount.minAmount) {
      return { valid: false, discountAmount: 0 };
    }

    // Check product type
    if (discount.productTypes.length > 0 && !discount.productTypes.includes(productType)) {
      return { valid: false, discountAmount: 0 };
    }

    // Calculate discount
    let discountAmount: number;
    if (discount.type === 'PERCENTAGE') {
      discountAmount = Math.round((baseAmount * discount.value) / 100);
    } else {
      discountAmount = discount.value;
    }

    return {
      valid: true,
      discountAmount: Math.min(discountAmount, baseAmount),
      discountId: discount.id,
    };
  }

  /**
   * Validate and apply reward discount
   */
  private async validateAndApplyRewardDiscount(
    rewardId: string,
    userId: string,
    baseAmount: number,
  ): Promise<{ valid: boolean; discountAmount: number; rewardId?: string }> {
    const reward = await this.prisma.rewardDiscount.findFirst({
      where: {
        id: rewardId,
        userId,
        isRedeemed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!reward) {
      return { valid: false, discountAmount: 0 };
    }

    // Calculate discount
    let discountAmount: number;
    if (reward.type === 'PERCENTAGE') {
      discountAmount = Math.round((baseAmount * reward.value) / 100);
    } else {
      discountAmount = reward.value;
    }

    // Mark as redeemed
    await this.prisma.rewardDiscount.update({
      where: { id: reward.id },
      data: { isRedeemed: true, redeemedAt: new Date() },
    });

    return {
      valid: true,
      discountAmount: Math.min(discountAmount, baseAmount),
      rewardId: reward.id,
    };
  }
}
