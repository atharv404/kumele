import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DevSeedController } from './dev-seed.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PasswordService } from '../auth/services/password.service';

/**
 * ⚠️ TEMPORARY MODULE FOR DEMO PURPOSES ONLY
 * 
 * Remove this module after demo!
 * Also remove from app.module.ts imports
 */
@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [DevSeedController],
  providers: [PasswordService],
})
export class DevModule {}
