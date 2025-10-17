#!/usr/bin/env tsx

/**
 * Complete database setup script
 * This will:
 * 1. Test connections
 * 2. Generate migrations if needed
 * 3. Run migrations
 * 4. Seed initial data
 */

import { execSync } from 'child_process';
import { checkDatabaseConnection, closeDatabaseConnection } from './index';

async function setupDatabase() {
  console.log('🚀 Setting up database for Old World Charm...\n');

  try {
    // Step 1: Check database connection
    console.log('1️⃣ Testing database connection...');
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      console.log('❌ Database connection failed!');
      console.log('\n💡 Make sure PostgreSQL is running:');
      console.log('   docker-compose up -d postgres');
      console.log('\n   Or start PostgreSQL locally on port 5432');
      process.exit(1);
    }
    console.log('✅ Database connected successfully');

    // Step 2: Generate migrations
    console.log('\n2️⃣ Generating migrations...');
    try {
      execSync('pnpm db:generate', { stdio: 'inherit', cwd: process.cwd() });
      console.log('✅ Migrations generated');
    } catch (error) {
      console.log('ℹ️ No new migrations needed');
    }

    // Step 3: Run migrations
    console.log('\n3️⃣ Running migrations...');
    execSync('pnpm db:migrate', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Migrations completed');

    // Step 4: Seed database
    console.log('\n4️⃣ Seeding database with initial data...');
    execSync('pnpm db:seed', { stdio: 'inherit', cwd: process.cwd() });
    console.log('✅ Database seeded');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the API server: cd packages/api && pnpm dev');
    console.log('   2. Start the editor: cd packages/editor && pnpm dev');
    console.log('   3. Open http://localhost:5173 to use the visual editor');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Make sure PostgreSQL is running');
    console.log('   - Check DATABASE_URL environment variable');
    console.log('   - Try: docker-compose up -d postgres');
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

setupDatabase();