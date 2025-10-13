import { createClient, RedisClientType } from 'redis';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create Redis client
export const redis: RedisClientType = createClient({
  url: REDIS_URL,
  socket: {
    connectTimeout: 10000, // 10 seconds
  },
});

// Redis connection event handlers
redis.on('connect', () => {
  console.log('✅ Redis client connected');
});

redis.on('ready', () => {
  console.log('✅ Redis client ready');
});

redis.on('error', (error) => {
  console.error('❌ Redis client error:', error);
});

redis.on('end', () => {
  console.log('Redis client disconnected');
});

// Initialize Redis connection
export async function initializeRedis(): Promise<void> {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }
    console.log('Redis connection initialized');
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    throw error;
  }
}

// Health check function
export async function checkRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

// Session management utilities
export class SessionManager {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

  static async createSession(sessionId: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await redis.setEx(key, ttl, JSON.stringify(data));
  }

  static async getSession(sessionId: string): Promise<any | null> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  static async updateSession(sessionId: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await redis.setEx(key, ttl, JSON.stringify(data));
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    await redis.del(key);
  }

  static async extendSession(sessionId: string, ttl: number = this.DEFAULT_TTL): Promise<boolean> {
    const key = `${this.SESSION_PREFIX}${sessionId}`;
    const result = await redis.expire(key, ttl);
    return result;
  }
}

// Cache management utilities
export class CacheManager {
  private static readonly CACHE_PREFIX = 'cache:';
  private static readonly DEFAULT_TTL = 60 * 60; // 1 hour in seconds

  static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    await redis.setEx(cacheKey, ttl, JSON.stringify(value));
  }

  static async get(key: string): Promise<any | null> {
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    const data = await redis.get(cacheKey);
    return data ? JSON.parse(data) : null;
  }

  static async del(key: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    await redis.del(cacheKey);
  }

  static async exists(key: string): Promise<boolean> {
    const cacheKey = `${this.CACHE_PREFIX}${key}`;
    const result = await redis.exists(cacheKey);
    return result === 1;
  }

  static async invalidatePattern(pattern: string): Promise<number> {
    const keys = await redis.keys(`${this.CACHE_PREFIX}${pattern}`);
    if (keys.length > 0) {
      return await redis.del(keys);
    }
    return 0;
  }
}

// A/B testing utilities
export class ABTestManager {
  private static readonly AB_TEST_PREFIX = 'ab_test:';

  static async assignUserToVariant(testId: string, sessionId: string, variant: string): Promise<void> {
    const key = `${this.AB_TEST_PREFIX}${testId}:${sessionId}`;
    await redis.set(key, variant);
  }

  static async getUserVariant(testId: string, sessionId: string): Promise<string | null> {
    const key = `${this.AB_TEST_PREFIX}${testId}:${sessionId}`;
    return await redis.get(key);
  }

  static async incrementVariantCount(testId: string, variant: string): Promise<number> {
    const key = `${this.AB_TEST_PREFIX}${testId}:count:${variant}`;
    return await redis.incr(key);
  }

  static async getVariantCount(testId: string, variant: string): Promise<number> {
    const key = `${this.AB_TEST_PREFIX}${testId}:count:${variant}`;
    const count = await redis.get(key);
    return count ? parseInt(count, 10) : 0;
  }
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  try {
    if (redis.isOpen) {
      await redis.quit();
    }
    console.log('Redis connection closed');
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
}