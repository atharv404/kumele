import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { EmailService } from './email.service';
import { NotificationCapsService } from './notification-caps.service';
import { NotificationJobsService } from './notification-jobs.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushService,
    EmailService,
    NotificationCapsService,
    NotificationJobsService,
  ],
  exports: [NotificationsService, PushService, EmailService, NotificationCapsService],
})
export class NotificationsModule {}
