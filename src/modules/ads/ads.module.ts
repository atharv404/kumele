import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { AdsServingService } from './ads-serving.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [AdsController],
  providers: [AdsService, AdsServingService],
  exports: [AdsService, AdsServingService],
})
export class AdsModule {}
