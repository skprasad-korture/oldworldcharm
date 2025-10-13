import { FastifyInstance } from 'fastify';
import { checkDatabaseConnection, checkRedisConnection } from '../db/index.js';

export default async function healthRoutes(fastify: FastifyInstance) {
  // Basic health check
  fastify.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check the health status of the API and its dependencies',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', format: 'date-time' },
              services: {
                type: 'object',
                properties: {
                  database: {
                    type: 'string',
                    enum: ['connected', 'disconnected'],
                  },
                  redis: {
                    type: 'string',
                    enum: ['connected', 'disconnected'],
                  },
                },
              },
              version: { type: 'string' },
              uptime: { type: 'number' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const dbStatus = await checkDatabaseConnection();
      const redisStatus = await checkRedisConnection();

      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus ? 'connected' : 'disconnected',
          redis: redisStatus ? 'connected' : 'disconnected',
        },
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
      };

      // If any critical service is down, return 503
      if (!dbStatus || !redisStatus) {
        reply.code(503);
        health.status = 'degraded';
      }

      return health;
    }
  );

  // Detailed health check
  fastify.get(
    '/health/detailed',
    {
      schema: {
        tags: ['Health'],
        summary: 'Detailed health check',
        description: 'Detailed health information including system metrics',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              services: {
                type: 'object',
                properties: {
                  database: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      responseTime: { type: 'number' },
                    },
                  },
                  redis: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      responseTime: { type: 'number' },
                    },
                  },
                },
              },
              system: {
                type: 'object',
                properties: {
                  memory: {
                    type: 'object',
                    properties: {
                      used: { type: 'number' },
                      total: { type: 'number' },
                      percentage: { type: 'number' },
                    },
                  },
                  cpu: {
                    type: 'object',
                    properties: {
                      usage: { type: 'array', items: { type: 'number' } },
                    },
                  },
                  uptime: { type: 'number' },
                  nodeVersion: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const startTime = Date.now();

      // Check database with timing
      const dbStartTime = Date.now();
      const dbStatus = await checkDatabaseConnection();
      const dbResponseTime = Date.now() - dbStartTime;

      // Check Redis with timing
      const redisStartTime = Date.now();
      const redisStatus = await checkRedisConnection();
      const redisResponseTime = Date.now() - redisStartTime;

      // Get system information
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: dbStatus ? 'connected' : 'disconnected',
            responseTime: dbResponseTime,
          },
          redis: {
            status: redisStatus ? 'connected' : 'disconnected',
            responseTime: redisResponseTime,
          },
        },
        system: {
          memory: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal,
            percentage: Math.round(
              (memUsage.heapUsed / memUsage.heapTotal) * 100
            ),
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system,
          },
          uptime: process.uptime(),
          nodeVersion: process.version,
        },
        responseTime: Date.now() - startTime,
      };

      // If any critical service is down, return 503
      if (!dbStatus || !redisStatus) {
        reply.code(503);
        health.status = 'degraded';
      }

      return health;
    }
  );

  // Readiness probe (for Kubernetes)
  fastify.get(
    '/ready',
    {
      schema: {
        tags: ['Health'],
        summary: 'Readiness probe',
        description: 'Check if the service is ready to accept traffic',
        response: {
          200: {
            type: 'object',
            properties: {
              ready: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          503: {
            type: 'object',
            properties: {
              ready: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const dbStatus = await checkDatabaseConnection();

      if (!dbStatus) {
        reply.code(503);
        return {
          ready: false,
          timestamp: new Date().toISOString(),
          reason: 'Database connection failed',
        };
      }

      return {
        ready: true,
        timestamp: new Date().toISOString(),
      };
    }
  );

  // Liveness probe (for Kubernetes)
  fastify.get(
    '/live',
    {
      schema: {
        tags: ['Health'],
        summary: 'Liveness probe',
        description: 'Check if the service is alive',
        response: {
          200: {
            type: 'object',
            properties: {
              alive: { type: 'boolean' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async () => {
      return {
        alive: true,
        timestamp: new Date().toISOString(),
      };
    }
  );
}
