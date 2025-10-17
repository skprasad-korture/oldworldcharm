#!/usr/bin/env node

/**
 * Test the database API functionality directly
 */

import { 
  checkDatabaseConnection, 
  closeDatabaseConnection,
  db,
  pages 
} from './src/db/index.ts';

console.log('🧪 Testing Database API functionality...\n');

async function testDatabaseAPI() {
  try {
    // Test 1: Database connection
    console.log('1️⃣ Testing database connection...');
    const connected = await checkDatabaseConnection();
    if (!connected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connected');

    // Test 2: Query existing data
    console.log('\n2️⃣ Testing data retrieval...');
    const existingPages = await db.select().from(pages).limit(3);
    console.log(`✅ Found ${existingPages.length} pages in database:`);
    existingPages.forEach(page => {
      console.log(`   - ${page.title} (${page.slug}) - ${page.status}`);
    });

    // Test 3: Create a new page
    console.log('\n3️⃣ Testing page creation...');
    const newPage = await db.insert(pages).values({
      title: 'Test Page from API',
      slug: 'test-page-api',
      content: { 
        type: 'div',
        props: { className: 'container' },
        children: [
          {
            type: 'h1',
            props: {},
            children: ['Test Page Created via API']
          }
        ]
      },
      status: 'draft'
    }).returning();
    
    console.log(`✅ Created new page: ${newPage[0].title} (ID: ${newPage[0].id})`);

    // Test 4: Update the page
    console.log('\n4️⃣ Testing page update...');
    const updatedPage = await db.update(pages)
      .set({ 
        status: 'published',
        title: 'Updated Test Page from API'
      })
      .where(eq(pages.id, newPage[0].id))
      .returning();
    
    console.log(`✅ Updated page status to: ${updatedPage[0].status}`);

    // Test 5: Delete the test page
    console.log('\n5️⃣ Testing page deletion...');
    await db.delete(pages).where(eq(pages.id, newPage[0].id));
    console.log('✅ Test page deleted');

    console.log('\n🎉 All database API tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Database connection works');
    console.log('   ✅ Data retrieval works');
    console.log('   ✅ Page creation works');
    console.log('   ✅ Page updates work');
    console.log('   ✅ Page deletion works');
    console.log('\n🚀 The database backend is fully functional!');

  } catch (error) {
    console.error('\n❌ Database API test failed:', error);
    return false;
  } finally {
    await closeDatabaseConnection();
  }
  
  return true;
}

// Import eq function
import { eq } from 'drizzle-orm';

const success = await testDatabaseAPI();
process.exit(success ? 0 : 1);