import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EscrowService } from '../payments/escrow.service';
import { RefundReason } from './dto/refund.dto';
import Stripe from 'stripe';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private escrowService: EscrowService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
  }

  /**
   * Check refund eligibility for a payment
   * CRITICAL: Attendance-gated refunds - user CANNOT request refund if they attended
   */
  async checkRefundEligibility(userId: string, paymentId: string) {
    const payment = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentId },
      include: {
        event: true,
        escrow: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException('Not authorized to view this payment');
    }

    // Already refunded
    if (payment.status === 'REFUNDED') {
      return {
        ok: true,
        data: {
          eligible: false,
          reason: 'Payment has already been refunded',
          attendanceVerified: false,
        },
      };
    }

    // Check if payment succeeded
    if (payment.status !== 'SUCCEEDED') {
      return {
        ok: true,
        data: {
          eligible: false,
          reason: 'Only completed payments can be refunded',
          attendanceVerified: false,
        },
      };
    }

    // Check attendance (escrow)
    const attendanceVerified = payment.escrow?.attendanceVerified || false;
    
    if (attendanceVerified) {
      return {
        ok: true,
        data: {
          eligible: false,
          reason: 'Cannot request refund after attending the event',
          attendanceVerified: true,
        },
      };
    }

    // Check if event is cancelled
    if (payment.event?.isCancelled) {
      return {
        ok: true,
        data: {
          eligible: true,
          reason: 'Event was cancelled - automatic refund eligible',
          refundableAmount: payment.amountMinor,
          currency: payment.currency,
          attendanceVerified: false,
          eventStatus: 'CANCELLED',
        },
      };
    }

    // Check time before event
    const eventStartTime = payment.event?.eventStartTime || payment.event?.startsAt;
    if (!eventStartTime) {
      return {
        ok: true,
        data: {
          eligible: false,
          reason: 'Event information unavailable',
          attendanceVerified: false,
        },
      };
    }

    const now = new Date();
    const hoursBeforeEvent = (eventStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const minHoursForFullRefund = this.configService.get<number>('REFUND_FULL_HOURS_BEFORE', 24);
    const minHoursForPartialRefund = this.configService.get<number>('REFUND_PARTIAL_HOURS_BEFORE', 6);

    // Event already happened
    if (hoursBeforeEvent < 0) {
      return {
        ok: true,
        data: {
          eligible: false,
          reason: 'Event has already started',
          attendanceVerified,
          eventStatus: 'PAST',
          hoursBeforeEvent: 0,
        },
      };
    }

    // Full refund (24h+ before)
    if (hoursBeforeEvent >= minHoursForFullRefund) {
      return {
        ok: true,
        data: {
          eligible: true,
          reason: 'Full refund available (more than 24 hours before event)',
          refundableAmount: payment.amountMinor,
          currency: payment.currency,
          attendanceVerified: false,
          hoursBeforeEvent: Math.round(hoursBeforeEvent),
        },
      };
    }

    // Partial refund (6-24h before)
    if (hoursBeforeEvent >= minHoursForPartialRefund) {
      const partialRefundPercent = this.configService.get<number>('REFUND_PARTIAL_PERCENT', 50);
      const refundableAmount = Math.round((payment.amountMinor * partialRefundPercent) / 100);

      return {
        ok: true,
        data: {
          eligible: true,
          reason: `${partialRefundPercent}% refund available (${Math.round(hoursBeforeEvent)} hours before event)`,
          refundableAmount,
          currency: payment.currency,
          attendanceVerified: false,
          hoursBeforeEvent: Math.round(hoursBeforeEvent),
        },
      };
    }

    // Too close to event
    return {
      ok: true,
      data: {
        eligible: false,
        reason: `Refunds not available less than ${minHoursForPartialRefund} hours before event`,
        attendanceVerified: false,
        hoursBeforeEvent: Math.round(hoursBeforeEvent),
      },
    };
  }

  /**
   * Request a refund
   */
  async requestRefund(userId: string, paymentId: string, reason: RefundReason, details?: string) {
    // 1. Check eligibility
    const eligibility = await this.checkRefundEligibility(userId, paymentId);
    
    if (!eligibility.data.eligible) {
      throw new BadRequestException(eligibility.data.reason);
    }

    // 2. Check for existing pending request
    const existingRequest = await this.prisma.refundRequest.findFirst({
      where: {
        paymentIntentId: paymentId,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      throw new BadRequestException('A refund request is already pending for this payment');
    }

    // 3. Create refund request
    const refundRequest = await this.prisma.refundRequest.create({
      data: {
        paymentIntentId: paymentId,
        userId,
        reason,
        details,
        amountMinor: eligibility.data.refundableAmount!,
        currency: eligibility.data.currency!,
        status: 'PENDING',
      },
    });

    // 4. Auto-approve for cancelled events
    const payment = await this.prisma.paymentIntent.findUnique({
      where: { id: paymentId },
      include: { event: true },
    });

    if (payment?.event?.isCancelled) {
      await this.processRefund(refundRequest.id, true, 'Auto-approved: Event cancelled');
    }

    this.logger.log(`Refund request created: ${refundRequest.id} for payment ${paymentId}`);

    return {
      ok: true,
      data: {
        id: refundRequest.id,
        status: refundRequest.status,
        amountMinor: refundRequest.amountMinor,
        currency: refundRequest.currency,
      },
    };
  }

  /**
   * Process refund (admin or auto-process)
   */
  async processRefund(refundRequestId: string, approved: boolean, notes?: string, adminId?: string) {
    const request = await this.prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: {
        paymentIntent: {
          include: {
            escrow: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Refund request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Refund request already processed');
    }

    if (!approved) {
      // Reject refund
      await this.prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          processedBy: adminId,
          adminNotes: notes,
        },
      });

      this.logger.log(`Refund request ${refundRequestId} rejected`);
      return { ok: true, message: 'Refund request rejected' };
    }

    // Approve and process refund
    try {
      // If escrow exists, refund through escrow
      if (request.paymentIntent.escrow) {
        await this.escrowService.refundEscrow(request.paymentIntent.escrow.id);
      } else if (this.stripe && request.paymentIntent.stripeId) {
        // Direct Stripe refund
        await this.stripe.refunds.create({
          payment_intent: request.paymentIntent.stripeId,
          amount: request.amountMinor,
          metadata: {
            refundRequestId: request.id,
            reason: request.reason,
          },
        });

        // Update payment status
        await this.prisma.paymentIntent.update({
          where: { id: request.paymentIntentId },
          data: { status: 'REFUNDED' },
        });
      }

      // Update refund request
      await this.prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: {
          status: 'PROCESSED',
          processedAt: new Date(),
          processedBy: adminId,
          adminNotes: notes,
        },
      });

      this.logger.log(`Refund processed: ${refundRequestId}`);
      return { ok: true, message: 'Refund processed successfully' };
    } catch (error: any) {
      // Mark as failed
      await this.prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: {
          status: 'FAILED',
          adminNotes: `Failed: ${error.message}`,
        },
      });

      this.logger.error(`Refund failed: ${refundRequestId} - ${error.message}`);
      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  /**
   * Get user's refund requests
   */
  async getUserRefundRequests(userId: string) {
    const requests = await this.prisma.refundRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        paymentIntent: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    return {
      ok: true,
      data: requests.map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        amountMinor: r.amountMinor,
        currency: r.currency,
        event: r.paymentIntent.event,
        createdAt: r.createdAt,
        processedAt: r.processedAt,
      })),
    };
  }

  /**
   * Get pending refund requests (admin)
   */
  async getPendingRefundRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.prisma.refundRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          paymentIntent: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  startsAt: true,
                  isCancelled: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.refundRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      ok: true,
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Auto-refund all payments for a cancelled event
   */
  async autoRefundCancelledEvent(eventId: string) {
    const payments = await this.prisma.paymentIntent.findMany({
      where: {
        eventId,
        status: 'SUCCEEDED',
      },
      include: { escrow: true },
    });

    this.logger.log(`Auto-refunding ${payments.length} payments for cancelled event ${eventId}`);

    for (const payment of payments) {
      try {
        // Create refund request
        const request = await this.prisma.refundRequest.create({
          data: {
            paymentIntentId: payment.id,
            userId: payment.userId,
            reason: RefundReason.EVENT_CANCELLED,
            details: 'Automatic refund for cancelled event',
            amountMinor: payment.amountMinor,
            currency: payment.currency,
            status: 'PENDING',
          },
        });

        // Process immediately
        await this.processRefund(request.id, true, 'Auto-processed: Event cancelled');
      } catch (error: any) {
        this.logger.error(`Failed to refund payment ${payment.id}: ${error.message}`);
      }
    }
  }
}
