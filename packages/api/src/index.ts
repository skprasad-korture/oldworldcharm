import Fastify from 'fastify';
import { 
  checkDatabaseConnection, 
  closeDatabaseConnection,
  initializeRedis,
  closeRedisConnection
} from './db/index.js';

// Import plugins
import sensiblePlugin from './plugins/sensible.js';
import errorHandlerPlugin from './plugins/error-handler.js';
import securityPlugin from './plugins/security.js';
import authPlugin from './plugins/auth.js';
import validationPlugin from './plugins/validation.js';
import swaggerPlugin from './plugins/swagger.js';

// Import routes
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'development' ? {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  } : {
    level: process.env.LOG_LEVEL || 'info',
  },
  trustProxy: true, // Enable if behind a proxy
  disableRequestLogging: false,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
});

// Register plugins in order
async function registerPlugins() {
  // Core plugins first
  await fastify.register(sensiblePlugin);
  await fastify.register(errorHandlerPlugin);
  
  // Security plugins
  await fastify.register(securityPlugin);
  
  // Authentication and validation
  await fastify.register(authPlugin);
  await fastify.register(validationPlugin);
  
  // Documentation (register last to capture all routes)
  await fastify.register(swaggerPlugin);
}

// Register routes
async function registerRoutes() {
  // Health routes (no prefix)
  await fastify.register(healthRoutes);
  
  // API routes with /api prefix
  await fastify.register(async function(fastify) {
    await fastify.register(authRoutes, { prefix: '/auth' });
    
    // Placeholder for other route groups
    // await fastify.register(pageRoutes, { prefix: '/pages' });
    // await fastify.register(componentRoutes, { prefix: '/components' });
    // await fastify.register(themeRoutes, { prefix: '/themes' });
    // await fastify.register(mediaRoutes, { prefix: '/media' });
  }, { prefix: '/api' });
}

// Graceful shutdown handler
const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');
  
  try {
    await fastify.close();
    await closeDatabaseConnection();
    await closeRedisConnection();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const start = async () => {
  try {
    // Initialize Redis connection
    await initializeRedis();
    
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    
    // Register plugins and routes
    await registerPlugins();
    await registerRoutes();
    
    // Start server
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    console.log('🏛️ Visual Website Builder API server running');
    console.log(`📡 Server: http://localhost:${port}`);
    console.log(`📊 Health: http://localhost:${port}/health`);
    console.log(`📚 Docs: http://localhost:${port}/docs`);
    console.log(`🔐 Auth: http://localhost:${port}/api/auth`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();