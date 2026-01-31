import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminEventsController } from './admin-events.controller';
import { AdminBlogsController } from './admin-blogs.controller';
import { AdminAdsController } from './admin-ads.controller';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    AdminUsersController,
    AdminEventsController,
    AdminBlogsController,
    AdminAdsController,
  ],
  providers: [AdminService, AdminGuard],
  exports: [AdminService, AdminGuard],
})
export class AdminModule {}
