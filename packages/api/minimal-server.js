#!/usr/bin/env node

/**
 * Minimal API server to prove the core functionality works
 */

import Fastify from 'fastify';
import { 
  checkDatabaseConnection, 
  closeDatabaseConnection,
  db,
  pages 
} from './src/db/index.ts';
import { eq } from 'drizzle-orm';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Health check route
fastify.get('/health', async (request, reply) => {
  const dbConnected = await checkDatabaseConnection();
  return {
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  };
});

// Get all pages
fastify.get('/api/pages', async (request, reply) => {
  try {
    const allPages = await db.select().from(pages);
    return {
      success: true,
      data: allPages,
      count: allPages.length
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});

// Create a new page
fastify.post('/api/pages', async (request, reply) => {
  try {
    const { title, slug, content } = request.body;
    
    const newPage = await db.insert(pages).values({
      title: title || 'New Page',
      slug: slug || `page-${Date.now()}`,
      content: content || { type: 'div', children: ['Empty page'] },
      status: 'draft'
    }).returning();
    
    return {
      success: true,
      data: newPage[0]
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});

// Get page by ID
fastify.get('/api/pages/:id', async (request, reply) => {
  try {
    const { id } = request.params;
    const page = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
    
    if (page.length === 0) {
      reply.code(404);
      return {
        success: false,
        error: 'Page not found'
      };
    }
    
    return {
      success: true,
      data: page[0]
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
});

const start = async () => {
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Start server
    const port = 3001;
    const host = '0.0.0.0';

    await fastify.listen({ port, host });

    console.log('🎉 Minimal API server is running!');
    console.log(`📡 Server: http://localhost:${port}`);
    console.log(`📊 Health: http://localhost:${port}/health`);
    console.log(`📄 Pages: http://localhost:${port}/api/pages`);
    console.log('\n✅ Database backend is fully operational!');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await fastify.close();
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await fastify.close();
  await closeDatabaseConnection();
  process.exit(0);
});

start();