import { Module } from '@nestjs/common';
import { DevSeedController } from './dev-seed.controller';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * ⚠️ TEMPORARY MODULE FOR DEMO PURPOSES ONLY
 * 
 * Remove this module after demo!
 * Also remove from app.module.ts imports
 */
@Module({
  imports: [PrismaModule],
  controllers: [DevSeedController],
})
export class DevModule {}
