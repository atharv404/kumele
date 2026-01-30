import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentsModule } from '../payments/payments.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    forwardRef(() => PaymentsModule),
  ],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
