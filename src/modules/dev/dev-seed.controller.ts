import { Controller, Post, Get, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../auth/services/password.service';
import { Public } from '../../common/decorators/public.decorator';

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
  constructor(
    private prisma: PrismaService,
    private passwordService: PasswordService,
  ) {}

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
