/**
 * Demo Seed Script for Kumele
 * 
 * Run locally with: npx ts-node prisma/seed-demo.ts
 * Or add to package.json: "seed:demo": "ts-node prisma/seed-demo.ts"
 */

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting demo seed...\n');

  // Password for all demo users: Demo@1234
  const passwordHash = await argon2.hash('Demo@1234', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
  console.log('📝 Generated password hash');

  // ==================== CLEANUP ====================
  console.log('🧹 Cleaning up old demo data...');
  
  await prisma.escrow.deleteMany({
    where: { eventId: 'event-demo-001' }
  });
  await prisma.paymentIntent.deleteMany({
    where: { eventId: 'event-demo-001' }
  });
  await prisma.checkin.deleteMany({
    where: { eventId: 'event-demo-001' }
  });
  await prisma.eventJoin.deleteMany({
    where: { eventId: 'event-demo-001' }
  });
  await prisma.eventHobby.deleteMany({
    where: { eventId: 'event-demo-001' }
  });
  await prisma.event.deleteMany({
    where: { id: 'event-demo-001' }
  });
  await prisma.userHobby.deleteMany({
    where: { userId: { in: ['user-demo-001', 'user-demo-host', 'user-demo-admin'] } }
  });
  await prisma.session.deleteMany({
    where: { userId: { in: ['user-demo-001', 'user-demo-host', 'user-demo-admin'] } }
  });
  await prisma.user.deleteMany({
    where: { email: { contains: 'demo@kumele.com' } }
  });
  await prisma.hobby.deleteMany({
    where: { id: 'hobby-demo-meditation' }
  });
  await prisma.hobbyCategory.deleteMany({
    where: { id: 'cat-demo-wellness' }
  });

  console.log('✅ Cleanup complete\n');

  // ==================== CREATE HOBBY CATEGORY ====================
  console.log('📂 Creating hobby category...');
  const category = await prisma.hobbyCategory.create({
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

  // ==================== CREATE HOBBY ====================
  console.log('🎯 Creating hobby...');
  const hobby = await prisma.hobby.create({
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

  // ==================== CREATE USERS ====================
  console.log('👤 Creating demo user...');
  const demoUser = await prisma.user.create({
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

  console.log('👤 Creating demo host...');
  const demoHost = await prisma.user.create({
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

  console.log('👤 Creating demo admin...');
  const demoAdmin = await prisma.user.create({
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

  // ==================== CREATE EVENT ====================
  console.log('📅 Creating demo event...');
  const eventStartsAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
  const eventEndsAt = new Date(Date.now() + 4 * 60 * 60 * 1000);   // 4 hours from now

  const demoEvent = await prisma.event.create({
    data: {
      id: 'event-demo-001',
      hostId: demoHost.id,
      title: 'Demo Meditation Workshop',
      description: 'A peaceful 2-hour meditation session for beginners. Learn breathing techniques and mindfulness practices. All materials provided.',
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

  // ==================== LINK EVENT TO HOBBY ====================
  console.log('🔗 Linking event to hobby...');
  await prisma.eventHobby.create({
    data: {
      id: 'eh-demo-001',
      eventId: demoEvent.id,
      hobbyId: hobby.id,
    }
  });

  // ==================== LINK USERS TO HOBBY ====================
  console.log('🔗 Linking users to hobby...');
  await prisma.userHobby.createMany({
    data: [
      { id: 'uh-demo-user', userId: demoUser.id, hobbyId: hobby.id, skillLevel: 3, isPrimary: true },
      { id: 'uh-demo-host', userId: demoHost.id, hobbyId: hobby.id, skillLevel: 5, isPrimary: true },
    ]
  });

  // ==================== SUMMARY ====================
  console.log('\n✅ Demo seed complete!\n');
  console.log('='.repeat(50));
  console.log('📧 Demo Users:');
  console.log('   • user-demo@kumele.com (User)');
  console.log('   • host-demo@kumele.com (Host)');
  console.log('   • admin-demo@kumele.com (Admin)');
  console.log('🔐 Password: Demo@1234');
  console.log('📅 Event: Demo Meditation Workshop (₹500)');
  console.log('   ID: event-demo-001');
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
