import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { PaymentsService } from './payments.service';
import { EscrowService } from './escrow.service';
import { FXService } from './fx.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService, EscrowService, FXService],
  exports: [PaymentsService, EscrowService, FXService],
})
export class PaymentsModule {}
