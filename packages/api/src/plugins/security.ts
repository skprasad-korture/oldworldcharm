import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

async function securityPlugin(fastify: FastifyInstance) {
  // Register CORS
  await fastify.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:3000', // Editor frontend
        'http://localhost:5173', // Vite dev server
        'http://localhost:4321', // Astro dev server
        ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
      ];

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
    ],
  });

  // Register Helmet for security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for development
  });

  // Register rate limiting
  await fastify.register(rateLimit, {
    max: 100, // Maximum 100 requests
    timeWindow: '1 minute', // Per minute
    skipOnError: true, // Don't count failed requests
    keyGenerator: request => {
      // Use IP address as key, but consider user ID if authenticated
      return request.user?.userId || request.ip;
    },
    errorResponseBuilder: (_request, context) => {
      return {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Maximum ${context.max} requests per ${context.after}`,
          details: {
            max: context.max,
            remaining: context.ttl,
            resetTime: new Date(Date.now() + context.ttl),
          },
        },
        timestamp: new Date().toISOString(),
      };
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  });

  // Add security headers hook
  fastify.addHook('onSend', async (_request, reply, payload) => {
    // Add custom security headers
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()'
    );

    // Add API version header
    reply.header('X-API-Version', '1.0.0');

    return payload;
  });

  // Request logging hook
  fastify.addHook('onRequest', async (request, _reply) => {
    fastify.log.info(
      {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        userId: request.user?.userId,
      },
      'Incoming request'
    );
  });

  // Response logging hook
  fastify.addHook('onResponse', async (request, reply) => {
    fastify.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.getResponseTime(),
        userId: request.user?.userId,
      },
      'Request completed'
    );
  });
}

export default fp(securityPlugin, {
  name: 'security',
  dependencies: [],
});
