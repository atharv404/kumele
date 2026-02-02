import { Injectable, Inject, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

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

  /**
   * Soft check - returns healthy even if Redis is unavailable (optional service)
   */
  async isHealthySoft(key: string): Promise<HealthIndicatorResult> {
    try {
      const testKey = 'health_check_test';
      const testValue = Date.now().toString();

      await this.cacheManager.set(testKey, testValue, 5000);
      const retrieved = await this.cacheManager.get(testKey);

      if (retrieved === testValue) {
        return this.getStatus(key, true);
      }

      return this.getStatus(key, true, { status: 'degraded', message: 'Using memory cache' });
    } catch (error) {
      this.logger.warn(`Redis not available: ${(error as Error).message}`);
      return this.getStatus(key, true, { status: 'degraded', message: 'Using memory cache' });
    }
  }
}
