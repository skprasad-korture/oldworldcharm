import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createClient } from 'redis';
import { schema } from './schema';

// Re-export all schema tables for convenience
export * from './schema';

// Database configuration
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/oldworldcharm';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create postgres client
const client = postgres(DATABASE_URL, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create Drizzle database instance
export const db = drizzle(client, { schema });
export { client };

// Redis client
let redisClient: ReturnType<typeof createClient> | null = null;

export async function initializeRedis(): Promise<ReturnType<typeof createClient>> {
  if (!redisClient) {
    redisClient = createClient({ url: REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
}

export function getRedisClient(): ReturnType<typeof createClient> | null {
  return redisClient;
}

// Health check functions
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function checkRedisConnection(): Promise<boolean> {
  try {
    if (!redisClient) {
      await initializeRedis();
    }
    await redisClient!.ping();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await client.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

export async function closeRedisConnection(): Promise<void> {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis connection closed');
    }
  } catch (error) {
    console.error('Error closing Redis connection:', error);
  }
}