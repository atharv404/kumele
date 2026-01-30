import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentExpiryService } from './payment-expiry.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
  ],
  providers: [PaymentExpiryService],
  exports: [PaymentExpiryService],
})
export class JobsModule {}
