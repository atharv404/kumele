import {
  Controller,
  Post,
  Headers,
  Req,
  RawBodyRequest,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { EscrowService } from './escrow.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly paymentsService: PaymentsService,
    private readonly escrowService: EscrowService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');
  }

  /**
   * Stripe webhook endpoint
   * CRITICAL: Handles payment success, failure, and transfer events
   */
  @Post('stripe')
  @Public()
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!this.stripe || !this.webhookSecret) {
      this.logger.error('Stripe not configured for webhooks');
      throw new BadRequestException('Webhook not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody!,
        signature,
        this.webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe event: ${event.type}`);

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          // Handle transfer events by checking string prefix (transfer.paid and transfer.failed are not typed in Stripe)
          const eventType = event.type as string;
          if (eventType.startsWith('transfer.')) {
            const transfer = event.data.object as Stripe.Transfer;
            if (eventType === 'transfer.paid') {
              await this.handleTransferPaid(transfer);
            } else if (eventType === 'transfer.failed') {
              await this.handleTransferFailed(transfer);
            }
          } else {
            this.logger.log(`Unhandled event type: ${event.type}`);
          }
      }
    } catch (error: any) {
      this.logger.error(`Error processing webhook ${event.type}: ${error.message}`);
      // Return 200 to prevent Stripe from retrying
      // Log error for manual investigation
    }

    return { received: true };
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);
    await this.paymentsService.handlePaymentSuccess(paymentIntent.id);
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);
    const failureMessage = paymentIntent.last_payment_error?.message || 'Unknown error';
    await this.paymentsService.handlePaymentFailure(paymentIntent.id, failureMessage);
  }

  private async handleTransferPaid(transfer: Stripe.Transfer) {
    this.logger.log(`Transfer paid: ${transfer.id}`);
    await this.escrowService.handleTransferSuccess(transfer.id);
  }

  private async handleTransferFailed(transfer: Stripe.Transfer) {
    this.logger.log(`Transfer failed: ${transfer.id}`);
    await this.escrowService.handleTransferFailure(transfer.id);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription updated: ${subscription.id}`);
    // Will be handled by SubscriptionsService
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    this.logger.log(`Subscription deleted: ${subscription.id}`);
    // Will be handled by SubscriptionsService
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice payment succeeded: ${invoice.id}`);
    // Update subscription payment status
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.log(`Invoice payment failed: ${invoice.id}`);
    // Handle subscription payment failure
  }
}
