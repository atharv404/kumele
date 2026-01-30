import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsController, UserAttendanceController } from './events.controller';
import { EventsService } from './events.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [PrismaModule, ConfigModule, forwardRef(() => ChatModule)],
  controllers: [EventsController, UserAttendanceController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
