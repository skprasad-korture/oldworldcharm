import Fastify from 'fastify';

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

// Simple health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Simple auth endpoints for testing
fastify.post('/api/auth/login', async (request, reply) => {
  const { email, password } = request.body;
  
  if (email === 'admin@example.com' && password === 'password123') {
    return {
      success: true,
      data: {
        user: { id: '1', email, name: 'Admin User', role: 'admin' },
        token: 'mock-jwt-token'
      },
      message: 'Login successful'
    };
  }
  
  reply.code(401);
  return {
    success: false,
    error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
  };
});

fastify.get('/api/auth/me', async () => {
  return {
    success: true,
    data: {
      user: { id: '1', email: 'admin@example.com', name: 'Admin User', role: 'admin' }
    }
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🏛️ Test API server running on http://localhost:3001');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();