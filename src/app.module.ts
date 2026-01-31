import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';

// Prisma
import { PrismaModule } from './prisma/prisma.module';

// Feature Modules
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';

// Days 6-9 Feature Modules
import { EventsModule } from './modules/events/events.module';
import { HobbiesModule } from './modules/hobbies/hobbies.module';
import { BlogsModule } from './modules/blogs/blogs.module';
import { JobsModule } from './modules/jobs/jobs.module';

// Days 10-13 Feature Modules
import { ChatModule } from './modules/chat/chat.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { RefundsModule } from './modules/refunds/refunds.module';

// Days 14-18 Feature Modules
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdsModule } from './modules/ads/ads.module';
import { AdminModule } from './modules/admin/admin.module';
import { UtilitiesModule } from './modules/utilities/utilities.module';
import { SupportModule } from './modules/support/support.module';

// Redis cache store
import { redisStore } from 'cache-manager-ioredis-yet';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Redis Cache
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', ''),
          ttl: 60 * 1000, // 60 seconds default TTL
        }),
      }),
    }),

    // Prisma
    PrismaModule,

    // Scheduling for cron jobs
    ScheduleModule.forRoot(),

    // Feature Modules (Days 1-5)
    HealthModule,
    AuthModule,
    UsersModule,
    UploadModule,

    // Feature Modules (Days 6-9)
    EventsModule,
    HobbiesModule,
    BlogsModule,
    JobsModule,

    // Feature Modules (Days 10-13)
    ChatModule,
    PaymentsModule,
    DiscountsModule,
    SubscriptionsModule,
    RefundsModule,

    // Feature Modules (Days 14-18)
    NotificationsModule,
    AdsModule,
    AdminModule,
    UtilitiesModule,
    SupportModule,
  ],
  providers: [
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
