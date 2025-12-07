import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

@Injectable()
export class RedisService {
  private client: any;

  constructor(private configService: ConfigService) {
    // Support Redis URL (for Upstash, Railway, Render) or individual config
    const redisUrl = this.configService.get('REDIS_URL');
    
    if (redisUrl) {
      // Use Redis URL format: redis://username:password@host:port
      this.client = createClient({
        url: redisUrl,
      });
    } else {
      // Fallback to individual config for local development
      const host = this.configService.get('REDIS_HOST', 'localhost');
      const port = this.configService.get('REDIS_PORT', 6379);
      const password = this.configService.get('REDIS_PASSWORD', '');

      this.client = createClient({
        socket: {
          host,
          port,
        },
        password: password || undefined,
      });
    }

    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      console.log('✓ Redis connected');
    });
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    await this.connect();
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.connect();
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.connect();
    await this.client.del(key);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    await this.connect();
    return this.client.hGetAll(key);
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    await this.connect();
    await this.client.hSet(key, field, value);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.connect();
    await this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.connect();
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, callback);
  }

  getClient() {
    return this.client;
  }
}
