import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis;
  private publisher: Redis;
  private subscriber: Redis;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    try {
      // Main Redis client for caching
      this.redis = new Redis(redisUrl, {
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });

      // Publisher for pub/sub
      this.publisher = new Redis(redisUrl);

      // Subscriber for pub/sub
      this.subscriber = new Redis(redisUrl);

      this.redis.on('connect', () => {
        this.logger.log('✅ Connected to Redis');
      });

      this.redis.on('error', (err) => {
        this.logger.error(`❌ Redis error: ${err.message}`);
      });

      await this.redis.ping();
      this.logger.log('Redis connection established');
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`);
      this.logger.warn('Running without Redis - cache disabled');
    }
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit();
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error(`Error getting key ${key}: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Error setting key ${key}: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Error deleting key ${key}: ${error.message}`);
    }
  }

  async publish(channel: string, message: any): Promise<void> {
    if (!this.publisher) return;
    try {
      await this.publisher.publish(channel, JSON.stringify(message));
    } catch (error) {
      this.logger.error(`Error publishing to ${channel}: ${error.message}`);
    }
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (!this.subscriber) return;
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) {
          try {
            callback(JSON.parse(msg));
          } catch (error) {
            this.logger.error(`Error parsing message from ${channel}: ${error.message}`);
          }
        }
      });
    } catch (error) {
      this.logger.error(`Error subscribing to ${channel}: ${error.message}`);
    }
  }

  getClient(): Redis | null {
    return this.redis;
  }
}
