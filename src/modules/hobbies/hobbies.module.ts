import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { HobbiesController } from './hobbies.controller';
import { HobbiesService } from './hobbies.service';

@Module({
  imports: [PrismaModule],
  controllers: [HobbiesController],
  providers: [HobbiesService],
  exports: [HobbiesService],
})
export class HobbiesModule {}
