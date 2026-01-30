import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus, PaymentProvider } from '@prisma/client';
import Stripe from 'stripe';

// Define subscription tiers (could also be stored in database)
const SUBSCRIPTION_TIERS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    description: 'Essential features for casual users',
    priceMonthlyMinor: 499, // €4.99
    priceYearlyMinor: 4999, // €49.99
    currency: 'EUR',
    features: ['Access to all events', 'Basic matching', 'Chat access'],
    entitlements: {
      eventsPerMonth: 5,
      priorityMatching: false,
      exclusiveEvents: false,
    },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Enhanced features for active users',
    priceMonthlyMinor: 999, // €9.99
    priceYearlyMinor: 9999, // €99.99
    currency: 'EUR',
    features: ['Unlimited events', 'Priority matching', 'Exclusive events', 'Ad-free experience'],
    entitlements: {
      eventsPerMonth: -1, // unlimited
      priorityMatching: true,
      exclusiveEvents: true,
    },
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    description: 'Ultimate experience with all features',
    priceMonthlyMinor: 1999, // €19.99
    priceYearlyMinor: 19999, // €199.99
    currency: 'EUR',
    features: [
      'Everything in Premium',
      'Personal concierge',
      'VIP-only events',
      'Priority support',
      'Monthly rewards',
    ],
    entitlements: {
      eventsPerMonth: -1,
      priorityMatching: true,
      exclusiveEvents: true,
      vipEvents: true,
      monthlyRewards: true,
    },
  },
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);
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
   * Get available subscription tiers
   */
  async getSubscriptionTiers() {
    return {
      ok: true,
      data: Object.values(SUBSCRIPTION_TIERS).map((tier) => ({
        ...tier,
        priceMonthly: tier.priceMonthlyMinor / 100,
        priceYearly: tier.priceYearlyMinor / 100,
      })),
    };
  }

  /**
   * Get user's current subscription status
   */
  async getSubscriptionStatus(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return {
        ok: true,
        data: {
          hasActiveSubscription: false,
        },
      };
    }

    return {
      ok: true,
      data: {
        hasActiveSubscription: true,
        id: subscription.id,
        tier: subscription.planId,
        planName: subscription.planName,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        entitlements: subscription.entitlements,
      },
    };
  }

  /**
   * Create new subscription (Stripe checkout)
   */
  async createSubscription(userId: string, tierId: string, discountCode?: string) {
    // 1. Validate tier
    const tier = SUBSCRIPTION_TIERS[tierId as keyof typeof SUBSCRIPTION_TIERS];
    if (!tier) {
      throw new BadRequestException('Invalid subscription tier');
    }

    // 2. Check if user already has active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    if (existingSubscription) {
      throw new BadRequestException('You already have an active subscription');
    }

    // 3. Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.stripe) {
      throw new BadRequestException('Payment system not configured');
    }

    // 4. Create or get Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await this.prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    // 5. Create Stripe checkout session for subscription
    // Note: In production, you'd create actual Stripe Products and Prices
    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: tier.currency.toLowerCase(),
            product_data: {
              name: `${tier.name} Subscription`,
              description: tier.description,
            },
            unit_amount: tier.priceMonthlyMinor,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${this.configService.get('FRONTEND_URL')}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.configService.get('FRONTEND_URL')}/subscription/cancel`,
      metadata: {
        userId,
        tierId,
        discountCode: discountCode || '',
      },
    });

    this.logger.log(`Created subscription checkout session for user ${userId}, tier ${tierId}`);

    return {
      ok: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Handle successful subscription (from webhook)
   */
  async handleSubscriptionCreated(stripeSubscriptionId: string, userId: string, tierId: string) {
    const tier = SUBSCRIPTION_TIERS[tierId as keyof typeof SUBSCRIPTION_TIERS];
    
    // Fetch subscription details from Stripe
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        provider: PaymentProvider.STRIPE,
        providerSubId: stripeSubscriptionId,
        planId: tierId,
        planName: tier?.name || tierId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        entitlements: tier?.entitlements || {},
      },
    });

    this.logger.log(`Created subscription ${subscription.id} for user ${userId}`);

    return subscription;
  }

  /**
   * Handle subscription update (from webhook)
   */
  async handleSubscriptionUpdated(stripeSubscriptionId: string) {
    if (!this.stripe) {
      return;
    }

    const stripeSubscription = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

    const subscription = await this.prisma.subscription.findFirst({
      where: { providerSubId: stripeSubscriptionId },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found: ${stripeSubscriptionId}`);
      return;
    }

    // Map Stripe status to our status
    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      trialing: SubscriptionStatus.TRIALING,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      unpaid: SubscriptionStatus.EXPIRED,
    };

    const stripeSub = stripeSubscription as any;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: statusMap[stripeSub.status] || SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    });

    this.logger.log(`Updated subscription ${subscription.id}`);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, cancelImmediately = false) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    if (!this.stripe || !subscription.providerSubId) {
      throw new BadRequestException('Cannot cancel subscription');
    }

    if (cancelImmediately) {
      // Cancel immediately
      await this.stripe.subscriptions.cancel(subscription.providerSubId);
      
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
        },
      });
    } else {
      // Cancel at period end
      await this.stripe.subscriptions.update(subscription.providerSubId, {
        cancel_at_period_end: true,
      });

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { cancelAtPeriodEnd: true },
      });
    }

    this.logger.log(`Subscription ${subscription.id} cancellation requested`);

    return {
      ok: true,
      message: cancelImmediately
        ? 'Subscription canceled immediately'
        : 'Subscription will be canceled at the end of the current period',
    };
  }

  /**
   * Resume canceled subscription (if set to cancel at period end)
   */
  async resumeSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: true,
      },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription pending cancellation found');
    }

    if (!this.stripe || !subscription.providerSubId) {
      throw new BadRequestException('Cannot resume subscription');
    }

    await this.stripe.subscriptions.update(subscription.providerSubId, {
      cancel_at_period_end: false,
    });

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false },
    });

    this.logger.log(`Subscription ${subscription.id} resumed`);

    return { ok: true, message: 'Subscription resumed' };
  }

  /**
   * Check subscription entitlement
   */
  async checkEntitlement(userId: string, entitlement: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    if (!subscription || !subscription.entitlements) {
      return false;
    }

    const entitlements = subscription.entitlements as Record<string, any>;
    return !!entitlements[entitlement];
  }

  /**
   * Daily job to expire past-due subscriptions
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async expireOverdueSubscriptions() {
    this.logger.log('Checking for overdue subscriptions...');

    const gracePeriodDays = this.configService.get<number>('SUBSCRIPTION_GRACE_PERIOD_DAYS', 7);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

    // Find subscriptions that are past due and past grace period
    const overdueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.PAST_DUE,
        currentPeriodEnd: { lt: cutoffDate },
      },
    });

    for (const sub of overdueSubscriptions) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      this.logger.log(`Expired subscription ${sub.id}`);
    }

    this.logger.log(`Expired ${overdueSubscriptions.length} overdue subscriptions`);
  }

  /**
   * Get subscription history for user
   */
  async getSubscriptionHistory(userId: string) {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      ok: true,
      data: subscriptions.map((s) => ({
        id: s.id,
        tier: s.planId,
        planName: s.planName,
        status: s.status,
        currentPeriodStart: s.currentPeriodStart,
        currentPeriodEnd: s.currentPeriodEnd,
        canceledAt: s.canceledAt,
        createdAt: s.createdAt,
      })),
    };
  }
}
