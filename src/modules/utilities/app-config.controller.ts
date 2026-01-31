import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('App Config')
@Controller('app')
export class AppConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('config')
  @Public()
  @ApiOperation({ summary: 'Get app configuration (maintenance mode, versions, feature flags)' })
  @ApiResponse({ status: 200, description: 'App configuration' })
  async getConfig() {
    const configs = await this.prisma.appConfig.findMany({
      where: {
        key: {
          in: ['maintenance_mode', 'min_supported_version', 'feature_flags'],
        },
      },
    });

    const result: Record<string, any> = {
      maintenance_mode: false,
      min_supported_version: {
        ios: '1.0.0',
        android: '1.0.0',
        web: '1.0.0',
      },
      feature_flags: {
        ads_enabled: true,
        blogs_enabled: true,
        chat_enabled: true,
        web3_enabled: false,
      },
    };

    for (const config of configs) {
      result[config.key] = config.value;
    }

    return result;
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'App health check (for load balancers)' })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
