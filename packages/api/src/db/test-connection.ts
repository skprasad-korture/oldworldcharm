#!/usr/bin/env tsx

/**
 * Simple script to test database and Redis connections
 * Run with: tsx src/db/test-connection.ts
 */

import {
  checkDatabaseConnection,
  closeDatabaseConnection,
  initializeRedis,
  checkRedisConnection,
  closeRedisConnection,
} from './index.js';

async function testConnections() {
  console.log('🧪 Testing database and Redis connections...\n');

  try {
    // Test database connection
    console.log('📊 Testing PostgreSQL connection...');
    const dbConnected = await checkDatabaseConnection();
    console.log(`Database: ${dbConnected ? '✅ Connected' : '❌ Failed'}`);

    // Test Redis connection
    console.log('\n🔴 Testing Redis connection...');
    await initializeRedis();
    const redisConnected = await checkRedisConnection();
    console.log(`Redis: ${redisConnected ? '✅ Connected' : '❌ Failed'}`);

    if (dbConnected && redisConnected) {
      console.log('\n🎉 All connections successful!');
      console.log('\nNext steps:');
      console.log('1. Run migrations: pnpm db:migrate');
      console.log('2. Seed database: pnpm db:seed');
      console.log('3. Start the API server: pnpm dev');
    } else {
      console.log('\n⚠️  Some connections failed. Please check:');
      if (!dbConnected) {
        console.log('- PostgreSQL is running (docker-compose up -d postgres)');
        console.log('- DATABASE_URL is correct');
      }
      if (!redisConnected) {
        console.log('- Redis is running (docker-compose up -d redis)');
        console.log('- REDIS_URL is correct');
      }
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error);
  } finally {
    // Clean up connections
    await closeDatabaseConnection();
    await closeRedisConnection();
    process.exit(0);
  }
}

testConnections();
