import { Injectable, Inject } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Try to set and get a value to verify Redis connection
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();

      await this.cacheManager.set(testKey, testValue, 5000); // 5 second TTL
      const retrieved = await this.cacheManager.get(testKey);

      if (retrieved === testValue) {
        return this.getStatus(key, true);
      }

      throw new Error('Redis read/write verification failed');
    } catch (error) {
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    }
  }
}
