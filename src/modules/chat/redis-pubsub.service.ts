import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

type MessageHandler = (message: any) => void;

@Injectable()
export class RedisPubSubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPubSubService.name);
  
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    
    try {
      // Create publisher connection
      this.publisher = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });

      this.publisher.on('connect', () => {
        this.logger.log('Redis publisher connected');
      });

      this.publisher.on('error', (err) => {
        this.logger.error(`Redis publisher error: ${err.message}`);
      });

      // Create subscriber connection
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });

      this.subscriber.on('connect', () => {
        this.logger.log('Redis subscriber connected');
      });

      this.subscriber.on('error', (err) => {
        this.logger.error(`Redis subscriber error: ${err.message}`);
      });

      // Handle incoming messages
      this.subscriber.on('message', (channel, message) => {
        this.handleMessage(channel, message);
      });

    } catch (error: any) {
      this.logger.error(`Failed to initialize Redis: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.publisher?.quit();
    await this.subscriber?.quit();
    this.logger.log('Redis connections closed');
  }

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, handler: MessageHandler) {
    if (!this.subscriber) {
      this.logger.warn(`Cannot subscribe to ${channel}: Redis not available`);
      return;
    }

    // Track handler
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.subscriber.subscribe(channel);
      this.logger.log(`Subscribed to channel: ${channel}`);
    }
    
    this.handlers.get(channel)!.add(handler);
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, handler?: MessageHandler) {
    if (!this.subscriber) return;

    if (handler) {
      this.handlers.get(channel)?.delete(handler);
    }

    // If no more handlers, unsubscribe from Redis
    if (!handler || this.handlers.get(channel)?.size === 0) {
      await this.subscriber.unsubscribe(channel);
      this.handlers.delete(channel);
      this.logger.log(`Unsubscribed from channel: ${channel}`);
    }
  }

  /**
   * Publish a message to a channel
   */
  async publish(channel: string, message: any) {
    if (!this.publisher) {
      this.logger.warn(`Cannot publish to ${channel}: Redis not available`);
      return;
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    await this.publisher.publish(channel, payload);
    this.logger.debug(`Published to ${channel}: ${payload.substring(0, 100)}...`);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(channel: string, message: string) {
    const handlers = this.handlers.get(channel);
    if (!handlers || handlers.size === 0) {
      return;
    }

    let parsedMessage: any;
    try {
      parsedMessage = JSON.parse(message);
    } catch {
      parsedMessage = message;
    }

    handlers.forEach((handler) => {
      try {
        handler(parsedMessage);
      } catch (error: any) {
        this.logger.error(`Handler error for ${channel}: ${error.message}`);
      }
    });
  }

  /**
   * Get a Redis client for direct operations (caching, etc.)
   */
  getClient(): Redis | null {
    return this.publisher;
  }

  /**
   * Set a value with expiration (for caching)
   */
  async setex(key: string, seconds: number, value: any): Promise<void> {
    if (!this.publisher) return;
    
    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    await this.publisher.setex(key, seconds, payload);
  }

  /**
   * Get a cached value
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.publisher) return null;
    
    const value = await this.publisher.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  }

  /**
   * Delete a cached value
   */
  async del(key: string): Promise<void> {
    if (!this.publisher) return;
    await this.publisher.del(key);
  }

  /**
   * Check if Redis is connected
   */
  isConnected(): boolean {
    return this.publisher?.status === 'ready' && this.subscriber?.status === 'ready';
  }
}
