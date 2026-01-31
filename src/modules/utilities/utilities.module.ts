import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { LocalizationController } from './localization.controller';
import { AppConfigController } from './app-config.controller';
import { ShareController } from './share.controller';
import { MediaController } from './media.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    LocalizationController,
    AppConfigController,
    ShareController,
    MediaController,
  ],
  providers: [],
  exports: [],
})
export class UtilitiesModule {}
