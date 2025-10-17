import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RSSService } from '../services/rss-service';

// Request schemas for RSS endpoints
const CreateRSSFeedSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  link: z.string().url('Invalid link URL'),
  language: z.string().length(2, 'Language must be 2 characters').default('en'),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  maxItems: z.number().int().positive().max(100).default(20),
  isActive: z.boolean().default(true),
});

const UpdateRSSFeedSchema = CreateRSSFeedSchema.partial();

const RSSQuerySchema = z.object({
  baseUrl: z.string().url('Invalid base URL'),
  title: z.string().optional(),
  description: z.string().optional(),
  maxItems: z.coerce.number().int().positive().max(100).default(20),
});

export default async function rssRoutes(fastify: FastifyInstance) {
  // Create RSS feed configuration (admin endpoint)
  fastify.post(
    '/feeds',
    {
      schema: {
        tags: ['RSS'],
        summary: 'Create RSS feed configuration',
        description: 'Create a new RSS feed configuration (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 500 },
            link: { type: 'string', format: 'uri' },
            language: { type: 'string', minLength: 2, maxLength: 2 },
            categories: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            maxItems: { type: 'integer', minimum: 1, maximum: 100 },
            isActive: { type: 'boolean' },
          },
          required: ['title', 'link'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  feed: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: { type: 'object', properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }, timestamp: { type: 'string', format: 'date-time' } } },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: CreateRSSFeedSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const feedData = request.body as z.infer<typeof CreateRSSFeedSchema>;

      try {
        const feedDataToCreate: any = { ...feedData };
        if (!feedDataToCreate.description) {
          delete feedDataToCreate.description;
        }
        const newFeed = await RSSService.createRSSFeed(feedDataToCreate);

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { feed: newFeed },
          'RSS feed configuration created successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error creating RSS feed');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create RSS feed',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get all RSS feed configurations (admin endpoint)
  fastify.get(
    '/feeds',
    {
      schema: {
        tags: ['RSS'],
        summary: 'Get RSS feed configurations',
        description: 'Retrieve all RSS feed configurations (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  feeds: { type: 'array', items: { type: 'object' } },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const feeds = await RSSService.getRSSFeeds();

        fastify.sendSuccess(reply, { feeds });
      } catch (error) {
        fastify.log.error(error, 'Error fetching RSS feeds');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch RSS feeds',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get RSS feed configuration by ID (admin endpoint)
  fastify.get(
    '/feeds/:id',
    {
      schema: {
        tags: ['RSS'],
        summary: 'Get RSS feed configuration by ID',
        description: 'Retrieve a specific RSS feed configuration (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  feed: { type: 'object' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { type: 'object', properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }, timestamp: { type: 'string', format: 'date-time' } } },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const feed = await RSSService.getRSSFeedById(id);

        if (!feed) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'RSS_FEED_NOT_FOUND',
              message: 'RSS feed not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(reply, { feed });
      } catch (error) {
        fastify.log.error(error, 'Error fetching RSS feed');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch RSS feed',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Update RSS feed configuration (admin endpoint)
  fastify.put(
    '/feeds/:id',
    {
      schema: {
        tags: ['RSS'],
        summary: 'Update RSS feed configuration',
        description: 'Update an existing RSS feed configuration (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 500 },
            link: { type: 'string', format: 'uri' },
            language: { type: 'string', minLength: 2, maxLength: 2 },
            categories: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            maxItems: { type: 'integer', minimum: 1, maximum: 100 },
            isActive: { type: 'boolean' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  feed: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { type: 'object', properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }, timestamp: { type: 'string', format: 'date-time' } } },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: UpdateRSSFeedSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const updateData = request.body as z.infer<typeof UpdateRSSFeedSchema>;

      try {
        const updateDataToUse: any = { ...updateData };
        // Remove undefined values to avoid TypeScript issues
        Object.keys(updateDataToUse).forEach(key => {
          if (updateDataToUse[key] === undefined) {
            delete updateDataToUse[key];
          }
        });
        const updatedFeed = await RSSService.updateRSSFeed(id, updateDataToUse);

        if (!updatedFeed) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'RSS_FEED_NOT_FOUND',
              message: 'RSS feed not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(
          reply,
          { feed: updatedFeed },
          'RSS feed configuration updated successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error updating RSS feed');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update RSS feed',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Delete RSS feed configuration (admin endpoint)
  fastify.delete(
    '/feeds/:id',
    {
      schema: {
        tags: ['RSS'],
        summary: 'Delete RSS feed configuration',
        description: 'Delete an RSS feed configuration (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { type: 'object', properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }, timestamp: { type: 'string', format: 'date-time' } } },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const deleted = await RSSService.deleteRSSFeed(id);

        if (!deleted) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'RSS_FEED_NOT_FOUND',
              message: 'RSS feed not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(reply, null, 'RSS feed configuration deleted successfully');
      } catch (error) {
        fastify.log.error(error, 'Error deleting RSS feed');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete RSS feed',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Generate RSS XML for a specific feed (public endpoint)
  fastify.get(
    '/feeds/:id/xml',
    {
      schema: {
        tags: ['RSS'],
        summary: 'Generate RSS XML for a feed',
        description: 'Generate RSS XML content for a specific feed configuration',
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
          },
          required: ['id'],
        },
        querystring: {
          type: 'object',
          properties: {
            baseUrl: { type: 'string', format: 'uri' },
          },
          required: ['baseUrl'],
        },
        response: {
          200: {
            type: 'string',
            description: 'RSS XML content',
          },
          404: { type: 'object', properties: { success: { type: 'boolean', example: false }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } }, timestamp: { type: 'string', format: 'date-time' } } },
        },
      },
      preHandler: [fastify.validate({ querystring: z.object({ baseUrl: z.string().url() }) })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { baseUrl } = request.query as { baseUrl: string };

      try {
        const rssXml = await RSSService.generateRSSXML(id, baseUrl);

        reply.type('application/rss+xml; charset=utf-8');
        reply.send(rssXml);
      } catch (error) {
        fastify.log.error(error, 'Error generating RSS XML');
        
        if (error instanceof Error && error.message === 'RSS feed not found or inactive') {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'RSS_FEED_NOT_FOUND',
              message: 'RSS feed not found or inactive',
            },
            timestamp: new Date().toISOString(),
          });
        }

        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate RSS XML',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Generate default RSS feed (public endpoint)
  fastify.get(
    '/rss.xml',
    {
      schema: {
        tags: ['RSS'],
        summary: 'Generate default RSS feed',
        description: 'Generate RSS XML for all published blog posts',
        querystring: {
          type: 'object',
          properties: {
            baseUrl: { type: 'string', format: 'uri' },
            title: { type: 'string' },
            description: { type: 'string' },
            maxItems: { type: 'integer', minimum: 1, maximum: 100 },
          },
          required: ['baseUrl'],
        },
        response: {
          200: {
            type: 'string',
            description: 'RSS XML content',
          },
        },
      },
      preHandler: [fastify.validate({ querystring: RSSQuerySchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { baseUrl, title, description, maxItems } = request.query as z.infer<typeof RSSQuerySchema>;

      try {
        const options: any = { maxItems };
        if (title) options.title = title;
        if (description) options.description = description;
        
        const rssXml = await RSSService.generateDefaultRSSXML(baseUrl, options);

        reply.type('application/rss+xml; charset=utf-8');
        reply.send(rssXml);
      } catch (error) {
        fastify.log.error(error, 'Error generating default RSS XML');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate RSS XML',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}