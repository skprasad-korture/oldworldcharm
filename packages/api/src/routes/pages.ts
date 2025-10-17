import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, desc, asc, and, or, like, sql } from 'drizzle-orm';
import { db, pages, pageVersions } from '../db/index';
import {
  PageStatusSchema,
  SEODataSchema,
  ComponentInstanceSchema,
} from '@oldworldcharm/shared';

// Request schemas for API endpoints
const CreatePageSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only'
    ),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  components: z.array(ComponentInstanceSchema).default([]),
  seoData: SEODataSchema.default({}),
  status: PageStatusSchema.default('draft'),
});

const UpdatePageSchema = CreatePageSchema.partial().extend({
  id: z.string().min(1, 'Page ID is required'),
});

const PageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: PageStatusSchema.optional(),
  search: z.string().optional(),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'publishedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export default async function pageRoutes(fastify: FastifyInstance) {
  // Helper function to create a page version
  async function createPageVersion(pageId: string, pageData: any, userId?: string, changeNote?: string) {
    try {
      // Get the next version number
      const result = await db
        .select({ nextVersion: sql<number>`COALESCE(MAX(${pageVersions.version}), 0) + 1` })
        .from(pageVersions)
        .where(eq(pageVersions.pageId, pageId));
      
      const nextVersion = result[0]?.nextVersion || 1;

      // Create the version
      await db.insert(pageVersions).values({
        pageId,
        version: nextVersion,
        title: pageData.title,
        description: pageData.description,
        content: pageData.content,
        seoData: pageData.seoData,
        status: pageData.status,
        publishedAt: pageData.publishedAt,
        createdBy: userId || null,
        changeNote: changeNote || null,
      });

      return nextVersion;
    } catch (error) {
      fastify.log.error(error, 'Error creating page version');
      throw error;
    }
  }

  // Create a new page
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Pages'],
        summary: 'Create a new page',
        description: 'Create a new page with components and SEO data',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 500 },
            components: { type: 'array', items: { type: 'object' } },
            seoData: { type: 'object' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
          },
          required: ['slug', 'title'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  page: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: { $ref: '#/components/schemas/Error' },
          409: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: CreatePageSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const pageData = request.body as z.infer<typeof CreatePageSchema>;

      try {
        // Check if slug already exists
        const existingPage = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.slug, pageData.slug))
          .limit(1);

        if (existingPage.length > 0) {
          return reply.code(409).send({
            success: false,
            error: {
              code: 'SLUG_EXISTS',
              message: 'A page with this slug already exists',
              field: 'slug',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Create the page
        const [newPage] = await db
          .insert(pages)
          .values({
            slug: pageData.slug,
            title: pageData.title,
            description: pageData.description || null,
            content: pageData.components,
            seoData: pageData.seoData,
            status: pageData.status,
            publishedAt: pageData.status === 'published' ? new Date() : null,
          })
          .returning();

        // Create initial version
        if (newPage) {
          await createPageVersion(
            newPage.id,
            newPage,
            request.user?.userId,
            'Initial version'
          );
        }

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { page: newPage },
          'Page created successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error creating page');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create page',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get all pages with filtering and pagination
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Pages'],
        summary: 'Get all pages',
        description: 'Retrieve pages with filtering, searching, and pagination',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            search: { type: 'string' },
            sortBy: { type: 'string', enum: ['title', 'createdAt', 'updatedAt', 'publishedAt'], default: 'updatedAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
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
                  items: { type: 'array', items: { type: 'object' } },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                  totalPages: { type: 'integer' },
                  hasNext: { type: 'boolean' },
                  hasPrev: { type: 'boolean' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ querystring: PageQuerySchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as z.infer<typeof PageQuerySchema>;

      try {
        // Build where conditions
        const conditions = [];
        
        if (query.status) {
          conditions.push(eq(pages.status, query.status));
        }

        if (query.search) {
          conditions.push(
            or(
              like(pages.title, `%${query.search}%`),
              like(pages.description, `%${query.search}%`),
              like(pages.slug, `%${query.search}%`)
            )
          );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Build order by clause
        let orderBy;
        switch (query.sortBy) {
          case 'title':
            orderBy = query.sortOrder === 'asc' ? asc(pages.title) : desc(pages.title);
            break;
          case 'createdAt':
            orderBy = query.sortOrder === 'asc' ? asc(pages.createdAt) : desc(pages.createdAt);
            break;
          case 'publishedAt':
            orderBy = query.sortOrder === 'asc' ? asc(pages.publishedAt) : desc(pages.publishedAt);
            break;
          default:
            orderBy = query.sortOrder === 'asc' ? asc(pages.updatedAt) : desc(pages.updatedAt);
        }

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(pages)
          .where(whereClause);
        
        const count = countResult[0]?.count || 0;

        // Get paginated results
        const offset = (query.page - 1) * query.pageSize;
        const pagesData = await db
          .select()
          .from(pages)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(query.pageSize)
          .offset(offset);

        const totalPages = Math.ceil(count / query.pageSize);

        const paginatedResponse = {
          items: pagesData,
          total: count,
          page: query.page,
          pageSize: query.pageSize,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        };

        fastify.sendSuccess(reply, paginatedResponse);
      } catch (error) {
        fastify.log.error(error, 'Error fetching pages');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch pages',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get a single page by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Pages'],
        summary: 'Get page by ID',
        description: 'Retrieve a single page by its ID',
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
                  page: { type: 'object' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const [page] = await db
          .select()
          .from(pages)
          .where(eq(pages.id, id))
          .limit(1);

        if (!page) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'PAGE_NOT_FOUND',
              message: 'Page not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(reply, { page });
      } catch (error) {
        fastify.log.error(error, 'Error fetching page');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch page',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Update a page
  fastify.put(
    '/:id',
    {
      schema: {
        tags: ['Pages'],
        summary: 'Update a page',
        description: 'Update an existing page with new data',
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
            slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 500 },
            components: { type: 'array', items: { type: 'object' } },
            seoData: { type: 'object' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
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
                  page: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
          409: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: UpdatePageSchema.omit({ id: true }) })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const updateData = request.body as Omit<z.infer<typeof UpdatePageSchema>, 'id'>;

      try {
        // Check if page exists
        const [existingPage] = await db
          .select()
          .from(pages)
          .where(eq(pages.id, id))
          .limit(1);

        if (!existingPage) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'PAGE_NOT_FOUND',
              message: 'Page not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Check if slug is being changed and if it conflicts
        if (updateData.slug && updateData.slug !== existingPage.slug) {
          const conflictingPage = await db
            .select({ id: pages.id })
            .from(pages)
            .where(and(eq(pages.slug, updateData.slug), sql`${pages.id} != ${id}`))
            .limit(1);

          if (conflictingPage.length > 0) {
            return reply.code(409).send({
              success: false,
              error: {
                code: 'SLUG_EXISTS',
                message: 'A page with this slug already exists',
                field: 'slug',
              },
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Prepare update data
        const updateValues: any = {
          updatedAt: new Date(),
        };

        if (updateData.slug !== undefined) updateValues.slug = updateData.slug;
        if (updateData.title !== undefined) updateValues.title = updateData.title;
        if (updateData.description !== undefined) updateValues.description = updateData.description;
        if (updateData.components !== undefined) updateValues.content = updateData.components;
        if (updateData.seoData !== undefined) updateValues.seoData = updateData.seoData;
        if (updateData.status !== undefined) {
          updateValues.status = updateData.status;
          // Set publishedAt when status changes to published
          if (updateData.status === 'published' && existingPage.status !== 'published') {
            updateValues.publishedAt = new Date();
          }
          // Clear publishedAt when status changes from published
          if (updateData.status !== 'published' && existingPage.status === 'published') {
            updateValues.publishedAt = null;
          }
        }

        // Update the page
        const [updatedPage] = await db
          .update(pages)
          .set(updateValues)
          .where(eq(pages.id, id))
          .returning();

        // Create a new version after update
        if (updatedPage) {
          await createPageVersion(
            updatedPage.id,
            updatedPage,
            request.user?.userId,
            'Page updated'
          );
        }

        fastify.sendSuccess(
          reply,
          { page: updatedPage },
          'Page updated successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error updating page');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update page',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Delete a page
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Pages'],
        summary: 'Delete a page',
        description: 'Delete a page by its ID',
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
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        // Check if page exists
        const existingPage = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.id, id))
          .limit(1);

        if (existingPage.length === 0) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'PAGE_NOT_FOUND',
              message: 'Page not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Delete the page
        await db.delete(pages).where(eq(pages.id, id));

        fastify.sendSuccess(reply, null, 'Page deleted successfully');
      } catch (error) {
        fastify.log.error(error, 'Error deleting page');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete page',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}