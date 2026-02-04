import { Controller, Post, Get, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { Public } from '../../common/decorators/public.decorator';
import Stripe from 'stripe';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * ⚠️ TEMPORARY CONTROLLER FOR DEMO PURPOSES ONLY
 * 
 * Remove this file after demo!
 * 
 * Usage:
 *   POST /api/v1/dev/seed  → Create demo data
 *   GET  /api/v1/dev/check → Check if demo data exists
 *   DELETE /api/v1/dev/seed → Clean up demo data
 */
@ApiTags('dev')
@Controller('dev')
export class DevSeedController {
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }
  }

  @Post('seed')
  @Public()
  @ApiOperation({ summary: '⚠️ Create demo seed data (TEMPORARY)' })
  @ApiResponse({ status: 201, description: 'Demo data created' })
  async seedDemoData() {
    console.log('🌱 Starting demo seed via API...');

    // Password: Demo@1234
    const passwordHash = await this.passwordService.hash('Demo@1234');

    try {
      // Cleanup first
      await this.cleanupDemoData();

      // Create hobby category
      const category = await this.prisma.hobbyCategory.create({
        data: {
          id: 'cat-demo-wellness',
          name: 'Wellness Demo',
          slug: 'wellness-demo',
          description: 'Health and wellness activities',
          icon: '🧘',
          sortOrder: 99,
          isActive: true,
        }
      });

      // Create hobby
      const hobby = await this.prisma.hobby.create({
        data: {
          id: 'hobby-demo-meditation',
          categoryId: category.id,
          name: 'Meditation Demo',
          slug: 'meditation-demo',
          description: 'Mindfulness and meditation practices',
          icon: '🧘‍♀️',
          isActive: true,
        }
      });

      // Create demo user
      const demoUser = await this.prisma.user.create({
        data: {
          id: 'user-demo-001',
          email: 'user-demo@kumele.com',
          passwordHash,
          firstName: 'Demo',
          lastName: 'User',
          displayName: 'Demo User',
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          city: 'Mumbai',
          country: 'India',
          latitude: 19.0760,
          longitude: 72.8777,
          currentBadge: 'BRONZE',
          stripeCustomerId: 'cus_demo_user',
        }
      });

      // Create demo host
      const demoHost = await this.prisma.user.create({
        data: {
          id: 'user-demo-host',
          email: 'host-demo@kumele.com',
          passwordHash,
          firstName: 'Demo',
          lastName: 'Host',
          displayName: 'Demo Host',
          role: 'USER',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          city: 'Mumbai',
          country: 'India',
          latitude: 19.0822,
          longitude: 72.8810,
          currentBadge: 'GOLD',
          stripeCustomerId: 'cus_demo_host',
          stripeConnectedAccountId: 'acct_demo_host',
        }
      });

      // Create demo admin
      const demoAdmin = await this.prisma.user.create({
        data: {
          id: 'user-demo-admin',
          email: 'admin-demo@kumele.com',
          passwordHash,
          firstName: 'Demo',
          lastName: 'Admin',
          displayName: 'Demo Admin',
          role: 'ADMIN',
          status: 'ACTIVE',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          city: 'Mumbai',
          country: 'India',
          currentBadge: 'GOLD',
        }
      });

      // Create event
      const eventStartsAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const eventEndsAt = new Date(Date.now() + 4 * 60 * 60 * 1000);

      const demoEvent = await this.prisma.event.create({
        data: {
          id: 'event-demo-001',
          hostId: demoHost.id,
          title: 'Demo Meditation Workshop',
          description: 'A peaceful 2-hour meditation session for beginners.',
          coverImage: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
          address: 'Bandra Kurla Complex, Mumbai',
          displayAddress: 'BKC, Mumbai',
          city: 'Mumbai',
          country: 'India',
          latitude: 19.0596,
          longitude: 72.8656,
          venueName: 'Zen Garden Studio',
          startsAt: eventStartsAt,
          endsAt: eventEndsAt,
          timezone: 'Asia/Kolkata',
          capacity: 20,
          minCapacity: 5,
          currentCount: 0,
          isPaid: true,
          basePriceEur: 5.50,
          price: 500.00,
          currency: 'INR',
          currencyBase: 'EUR',
          status: 'ACTIVE',
          isCancelled: false,
          isPublic: true,
          requiresApproval: false,
        }
      });

      // Link event to hobby
      await this.prisma.eventHobby.create({
        data: {
          id: 'eh-demo-001',
          eventId: demoEvent.id,
          hobbyId: hobby.id,
        }
      });

      // Link users to hobby
      await this.prisma.userHobby.createMany({
        data: [
          { id: 'uh-demo-user', userId: demoUser.id, hobbyId: hobby.id, skillLevel: 3, isPrimary: true },
          { id: 'uh-demo-host', userId: demoHost.id, hobbyId: hobby.id, skillLevel: 5, isPrimary: true },
        ]
      });

      console.log('✅ Demo seed complete');

      return {
        success: true,
        message: 'Demo data created successfully',
        data: {
          users: [
            { email: 'user-demo@kumele.com', role: 'USER', id: demoUser.id },
            { email: 'host-demo@kumele.com', role: 'HOST', id: demoHost.id },
            { email: 'admin-demo@kumele.com', role: 'ADMIN', id: demoAdmin.id },
          ],
          password: 'Demo@1234',
          event: {
            id: demoEvent.id,
            title: demoEvent.title,
            price: '₹500',
          }
        }
      };
    } catch (error: any) {
      console.error('❌ Seed failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('check')
  @Public()
  @ApiOperation({ summary: 'Check if demo data exists' })
  async checkDemoData() {
    const user = await this.prisma.user.findUnique({
      where: { email: 'user-demo@kumele.com' },
      select: { id: true, email: true, displayName: true }
    });

    const event = await this.prisma.event.findUnique({
      where: { id: 'event-demo-001' },
      select: { id: true, title: true, price: true, status: true }
    });

    return {
      demoDataExists: !!user && !!event,
      user: user || null,
      event: event || null,
    };
  }

  @Delete('seed')
  @Public()
  @ApiOperation({ summary: '⚠️ Delete demo data' })
  async deleteDemoData() {
    await this.cleanupDemoData();
    return {
      success: true,
      message: 'Demo data cleaned up',
    };
  }

  // ============================================
  // DEMO ESCROW SIMULATION ENDPOINTS (REAL STRIPE!)
  // ============================================
  
  @Post('escrow/simulate')
  @Public()
  @ApiOperation({ summary: '🎯 DEMO: Create REAL Stripe payment + escrow flow' })
  async simulateEscrowFlow() {
    try {
      if (!this.stripe) {
        return {
          success: false,
          error: 'Stripe not configured. Set STRIPE_SECRET_KEY in environment.'
        };
      }

      // Step 1: Verify demo data exists
      const user = await this.prisma.user.findUnique({
        where: { email: 'user-demo@kumele.com' }
      });
      const event = await this.prisma.event.findUnique({
        where: { id: 'event-demo-001' }
      });

      if (!user || !event) {
        return {
          success: false,
          error: 'Demo data not found. Please run POST /dev/seed first.'
        };
      }

      // Step 2: Create EventJoin directly (bypass matching)
      const existingJoin = await this.prisma.eventJoin.findFirst({
        where: { eventId: event.id, userId: user.id }
      });
      
      let eventJoin;
      if (existingJoin) {
        eventJoin = existingJoin;
      } else {
        eventJoin = await this.prisma.eventJoin.create({
          data: {
            eventId: event.id,
            userId: user.id,
            status: 'CONFIRMED',
            matchScore: 85.5, // Demo match score
          }
        });
      }

      // Step 3: Create FRESH Stripe Customer (ignore fake seed data)
      let stripeCustomerId = user.stripeCustomerId;
      
      // Always create a new customer if it looks like fake data or doesn't exist
      if (!stripeCustomerId || stripeCustomerId.startsWith('cus_demo')) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: user.displayName || 'Demo User',
          metadata: { userId: user.id, demo: 'true' }
        });
        stripeCustomerId = customer.id;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId }
        });
      }

      // Step 4: Create REAL Stripe PaymentIntent
      const amountMinor = 4000; // $40.00 in cents
      const stripePaymentIntent = await this.stripe.paymentIntents.create({
        amount: amountMinor,
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method_types: ['card'], // Only card payments, no redirects
        payment_method: 'pm_card_visa', // Stripe test card
        confirm: true, // Auto-confirm for demo
        off_session: true, // No customer present
        metadata: {
          eventId: event.id,
          userId: user.id,
          demo: 'true',
          type: 'escrow_demo'
        }
      });

      // Step 5: Save PaymentIntent to DB
      const payment = await this.prisma.paymentIntent.create({
        data: {
          stripeId: stripePaymentIntent.id,
          userId: user.id,
          eventId: event.id,
          amount: new Decimal(amountMinor / 100),
          amountMinor: amountMinor,
          currency: 'USD',
          status: stripePaymentIntent.status === 'succeeded' ? 'SUCCEEDED' : 'PENDING',
        }
      });

      // Step 6: Create Escrow record (HELD state)
      const eventEndAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const escrow = await this.prisma.escrow.create({
        data: {
          paymentIntentId: payment.id,
          eventId: event.id,
          hostId: event.hostId,
          amountMinor: amountMinor,
          currency: 'USD',
          status: 'HELD',
          attendanceVerified: false,
          eventEndAt: eventEndAt,
          releaseAt: new Date(eventEndAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after event
        }
      });

      return {
        success: true,
        message: '✅ REAL Stripe payment created! Check your Stripe Dashboard.',
        stripePaymentUrl: `https://dashboard.stripe.com/test/payments/${stripePaymentIntent.id}`,
        demo: {
          step1_join: {
            eventJoinId: eventJoin.id,
            matchScore: eventJoin.matchScore,
            status: eventJoin.status,
          },
          step2_payment: {
            paymentIntentId: payment.stripeId,
            amount: `$${(payment.amountMinor / 100).toFixed(2)}`,
            status: payment.status,
          },
          step3_escrow: {
            escrowId: escrow.id,
            status: escrow.status,
            amount: `$${(escrow.amountMinor / 100).toFixed(2)}`,
            releaseAt: escrow.releaseAt,
            attendanceVerified: escrow.attendanceVerified,
          }
        },
        nextSteps: [
          '1️⃣ Use POST /dev/escrow/checkin to simulate attendance verification',
          '2️⃣ Use POST /dev/escrow/release to release funds to host'
        ]
      };
    } catch (error: any) {
      console.error('Escrow simulation failed:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('escrow/checkin')
  @Public()
  @ApiOperation({ summary: '🎯 DEMO: Simulate check-in (attendance verified)' })
  async simulateCheckin() {
    try {
      const escrow = await this.prisma.escrow.findFirst({
        where: { eventId: 'event-demo-001', status: 'HELD' },
        include: { paymentIntent: { include: { event: true, user: true } } }
      });

      if (!escrow) {
        return {
          success: false,
          error: 'No escrow found. Run POST /dev/escrow/simulate first.'
        };
      }

      // Update escrow to mark attendance verified
      const updated = await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { attendanceVerified: true }
      });

      // Create checkin record
      const userId = escrow.paymentIntent?.userId;
      if (userId) {
        await this.prisma.checkin.create({
          data: {
            userId: userId,
            eventId: escrow.eventId,
            method: 'HOST_VERIFIED',
            latitude: 40.7128,
            longitude: -74.0060,
          }
        }).catch(() => {}); // Ignore if already exists
      }

      return {
        success: true,
        message: '✅ Attendance verified! User checked in to event.',
        demo: {
          escrowId: updated.id,
          status: updated.status,
          attendanceVerified: updated.attendanceVerified,
          eventTitle: escrow.paymentIntent?.event?.title,
        },
        nextStep: 'Use POST /dev/escrow/release to release funds to host'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Post('escrow/release')
  @Public()
  @ApiOperation({ summary: '🎯 DEMO: Release escrow funds to host' })
  async simulateRelease() {
    try {
      const escrow = await this.prisma.escrow.findFirst({
        where: { eventId: 'event-demo-001', status: 'HELD' },
        include: { paymentIntent: { include: { event: { include: { host: true } } } } }
      });

      if (!escrow) {
        return {
          success: false,
          error: 'No held escrow found. Run the full demo flow first.'
        };
      }

      if (!escrow.attendanceVerified) {
        return {
          success: false,
          error: 'Attendance not verified. Run POST /dev/escrow/checkin first.',
          currentStatus: { escrowId: escrow.id, attendanceVerified: false }
        };
      }

      // Release escrow
      const released = await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: {
          status: 'RELEASED',
          releasedAt: new Date()
        }
      });

      // Platform fee calculation (15%)
      const platformFee = Math.round(escrow.amountMinor * 0.15);
      const hostPayout = escrow.amountMinor - platformFee;

      return {
        success: true,
        message: '🎉 Escrow RELEASED! Funds transferred to host.',
        demo: {
          escrowId: released.id,
          status: released.status,
          releasedAt: released.releasedAt,
          financials: {
            totalAmount: `$${(escrow.amountMinor / 100).toFixed(2)}`,
            platformFee: `$${(platformFee / 100).toFixed(2)} (15%)`,
            hostPayout: `$${(hostPayout / 100).toFixed(2)}`,
          },
          host: {
            name: escrow.paymentIntent?.event?.host?.displayName,
            email: escrow.paymentIntent?.event?.host?.email,
          }
        },
        summary: '💡 Demo complete! The escrow flow protects both attendees and hosts.'
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get('escrow/status')
  @Public()
  @ApiOperation({ summary: '📊 DEMO: Check current escrow status' })
  async getEscrowStatus() {
    const escrow = await this.prisma.escrow.findFirst({
      where: { eventId: 'event-demo-001' },
      include: {
        paymentIntent: { 
          select: { stripeId: true, status: true, event: { select: { title: true, price: true } } } 
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!escrow) {
      return {
        exists: false,
        message: 'No escrow found. Start with POST /dev/escrow/simulate'
      };
    }

    return {
      exists: true,
      escrow: {
        id: escrow.id,
        status: escrow.status,
        amount: `$${(escrow.amountMinor / 100).toFixed(2)}`,
        attendanceVerified: escrow.attendanceVerified,
        releaseAt: escrow.releaseAt,
        releasedAt: escrow.releasedAt,
      },
      event: escrow.paymentIntent?.event,
      payment: { stripeId: escrow.paymentIntent?.stripeId, status: escrow.paymentIntent?.status },
      flowStatus: {
        step1_payment: '✅ Completed',
        step2_escrow_held: escrow.status === 'HELD' || escrow.status === 'RELEASED' ? '✅ Completed' : '⏳ Pending',
        step3_checkin: escrow.attendanceVerified ? '✅ Verified' : '⏳ Pending',
        step4_release: escrow.status === 'RELEASED' ? '✅ Released' : '⏳ Pending',
      }
    };
  }

  private async cleanupDemoData() {
    // Delete in correct order (respect foreign keys)
    try {
      await this.prisma.escrow.deleteMany({ where: { eventId: 'event-demo-001' } });
    } catch {}
    try {
      await this.prisma.paymentIntent.deleteMany({ where: { eventId: 'event-demo-001' } });
    } catch {}
    try {
      await this.prisma.checkin.deleteMany({ where: { eventId: 'event-demo-001' } });
    } catch {}
    try {
      await this.prisma.eventJoin.deleteMany({ where: { eventId: 'event-demo-001' } });
    } catch {}
    try {
      await this.prisma.eventHobby.deleteMany({ where: { eventId: 'event-demo-001' } });
    } catch {}
    try {
      await this.prisma.event.deleteMany({ where: { id: 'event-demo-001' } });
    } catch {}
    try {
      await this.prisma.userHobby.deleteMany({
        where: { userId: { in: ['user-demo-001', 'user-demo-host', 'user-demo-admin'] } }
      });
    } catch {}
    try {
      await this.prisma.session.deleteMany({
        where: { userId: { in: ['user-demo-001', 'user-demo-host', 'user-demo-admin'] } }
      });
    } catch {}
    try {
      await this.prisma.user.deleteMany({
        where: { email: { contains: 'demo@kumele.com' } }
      });
    } catch {}
    try {
      await this.prisma.hobby.deleteMany({ where: { id: 'hobby-demo-meditation' } });
    } catch {}
    try {
      await this.prisma.hobbyCategory.deleteMany({ where: { id: 'cat-demo-wellness' } });
    } catch {}
  }
}
