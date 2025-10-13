// Export database connection and utilities
export {
  db,
  client,
  checkDatabaseConnection,
  closeDatabaseConnection,
} from './connection.js';

// Export Redis utilities
export {
  redis,
  initializeRedis,
  checkRedisConnection,
  closeRedisConnection,
  SessionManager,
  CacheManager,
  ABTestManager,
} from './redis.js';

// Export schema
export * from './schema.js';

// Export migration and seeding utilities
export { seedDatabase } from './seed.js';
