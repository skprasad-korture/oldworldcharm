import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from './schema.js';

// Database configuration
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/oldworldcharm';

// Create postgres client
const client = postgres(DATABASE_URL, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
  // Don't attempt connection in test environment without database
  lazy: process.env.NODE_ENV === 'test' || process.env.CI === 'true',
});

// Create Drizzle database instance with schema
export const db = drizzle(client, { schema });

// Export client for direct access if needed
export { client };

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
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
