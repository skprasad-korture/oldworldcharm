import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, desc, asc, and, or, like, sql } from 'drizzle-orm';
import { db, contentTemplates } from '../db/index.js';
import { ComponentInstanceSchema } from '@oldworldcharm/shared';

// Request schemas for template endpoints
const CreateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['page', 'block', 'section']),
  category: z.string().max(100, 'Category too long').optional(),
  content: z.array(ComponentInstanceSchema).min(1, 'Content is required'),
  previewImage: z.string().url('Invalid preview image URL').optional(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
});

const UpdateTemplateSchema = CreateTemplateSchema.partial().extend({
  id: z.string().min(1, 'Template ID is required'),
});

const TemplateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['page', 'block', 'section']).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  isPublic: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'usageCount']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export default async function templateRoutes(fastify: FastifyInstance) {
  // Create a new template
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Create a new template',
        description: 'Create a new content template or reusable block',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 500 },
            type: { type: 'string', enum: ['page', 'block', 'section'] },
            category: { type: 'string', maxLength: 100 },
            content: { type: 'array', items: { type: 'object' }, minItems: 1 },
            previewImage: { type: 'string', format: 'uri' },
            tags: { type: 'array', items: { type: 'string' } },
            isPublic: { type: 'boolean' },
          },
          required: ['name', 'type', 'content'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  template: { type: 'object' },
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
      preHandler: [fastify.authenticate, fastify.validate({ body: CreateTemplateSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const templateData = request.body as z.infer<typeof CreateTemplateSchema>;

      try {
        // Check if template name already exists for this user
        const existingTemplate = await db
          .select({ id: contentTemplates.id })
          .from(contentTemplates)
          .where(
            and(
              eq(contentTemplates.name, templateData.name),
              eq(contentTemplates.createdBy, request.user!.userId)
            )
          )
          .limit(1);

        if (existingTemplate.length > 0) {
          return reply.code(409).send({
            success: false,
            error: {
              code: 'TEMPLATE_EXISTS',
              message: 'A template with this name already exists',
              field: 'name',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Create the template
        const [newTemplate] = await db
          .insert(contentTemplates)
          .values({
            name: templateData.name,
            description: templateData.description || null,
            type: templateData.type,
            category: templateData.category || null,
            content: templateData.content,
            previewImage: templateData.previewImage || null,
            tags: templateData.tags,
            isPublic: templateData.isPublic,
            createdBy: request.user!.userId,
          })
          .returning();

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { template: newTemplate },
          'Template created successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error creating template');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create template',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get all templates with filtering and pagination
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Get all templates',
        description: 'Retrieve templates with filtering, searching, and pagination',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            type: { type: 'string', enum: ['page', 'block', 'section'] },
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            search: { type: 'string' },
            isPublic: { type: 'boolean' },
            sortBy: { type: 'string', enum: ['name', 'createdAt', 'updatedAt', 'usageCount'], default: 'updatedAt' },
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
      preHandler: [fastify.authenticate, fastify.validate({ querystring: TemplateQuerySchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as z.infer<typeof TemplateQuerySchema>;

      try {
        // Build where conditions
        const conditions = [];
        
        // User can see their own templates or public templates
        conditions.push(
          or(
            eq(contentTemplates.createdBy, request.user!.userId),
            eq(contentTemplates.isPublic, true)
          )
        );

        if (query.type) {
          conditions.push(eq(contentTemplates.type, query.type));
        }

        if (query.category) {
          conditions.push(eq(contentTemplates.category, query.category));
        }

        if (query.isPublic !== undefined) {
          conditions.push(eq(contentTemplates.isPublic, query.isPublic));
        }

        if (query.search) {
          conditions.push(
            or(
              like(contentTemplates.name, `%${query.search}%`),
              like(contentTemplates.description, `%${query.search}%`),
              sql`${contentTemplates.tags}::text ILIKE ${'%' + query.search + '%'}`
            )
          );
        }

        if (query.tags && query.tags.length > 0) {
          conditions.push(
            sql`${contentTemplates.tags} ?| array[${query.tags.join(',')}]`
          );
        }

        const whereClause = and(...conditions);

        // Build order by clause
        let orderBy;
        switch (query.sortBy) {
          case 'name':
            orderBy = query.sortOrder === 'asc' ? asc(contentTemplates.name) : desc(contentTemplates.name);
            break;
          case 'createdAt':
            orderBy = query.sortOrder === 'asc' ? asc(contentTemplates.createdAt) : desc(contentTemplates.createdAt);
            break;
          case 'usageCount':
            orderBy = query.sortOrder === 'asc' ? asc(contentTemplates.usageCount) : desc(contentTemplates.usageCount);
            break;
          default:
            orderBy = query.sortOrder === 'asc' ? asc(contentTemplates.updatedAt) : desc(contentTemplates.updatedAt);
        }

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(contentTemplates)
          .where(whereClause);
        
        const count = countResult[0]?.count || 0;

        // Get paginated results
        const offset = (query.page - 1) * query.pageSize;
        const templatesData = await db
          .select()
          .from(contentTemplates)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(query.pageSize)
          .offset(offset);

        const totalPages = Math.ceil(count / query.pageSize);

        const paginatedResponse = {
          items: templatesData,
          total: count,
          page: query.page,
          pageSize: query.pageSize,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        };

        fastify.sendSuccess(reply, paginatedResponse);
      } catch (error) {
        fastify.log.error(error, 'Error fetching templates');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch templates',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get a single template by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Get template by ID',
        description: 'Retrieve a single template by its ID',
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
                  template: { type: 'object' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
          403: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const [template] = await db
          .select()
          .from(contentTemplates)
          .where(eq(contentTemplates.id, id))
          .limit(1);

        if (!template) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: 'Template not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Check if user can access this template
        if (!template.isPublic && template.createdBy !== request.user!.userId) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You do not have permission to access this template',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(reply, { template });
      } catch (error) {
        fastify.log.error(error, 'Error fetching template');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch template',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Use a template (increment usage count)
  fastify.post(
    '/:id/use',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Use a template',
        description: 'Mark a template as used and increment its usage count',
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
                  template: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
          403: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        // Check if template exists and user can access it
        const [template] = await db
          .select()
          .from(contentTemplates)
          .where(eq(contentTemplates.id, id))
          .limit(1);

        if (!template) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: 'Template not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (!template.isPublic && template.createdBy !== request.user!.userId) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You do not have permission to use this template',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Increment usage count
        const [updatedTemplate] = await db
          .update(contentTemplates)
          .set({
            usageCount: sql`${contentTemplates.usageCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(contentTemplates.id, id))
          .returning();

        fastify.sendSuccess(
          reply,
          { template: updatedTemplate },
          'Template usage recorded'
        );
      } catch (error) {
        fastify.log.error(error, 'Error using template');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to use template',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Update a template
  fastify.put(
    '/:id',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Update a template',
        description: 'Update an existing template',
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
            name: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string', maxLength: 500 },
            type: { type: 'string', enum: ['page', 'block', 'section'] },
            category: { type: 'string', maxLength: 100 },
            content: { type: 'array', items: { type: 'object' } },
            previewImage: { type: 'string', format: 'uri' },
            tags: { type: 'array', items: { type: 'string' } },
            isPublic: { type: 'boolean' },
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
                  template: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
          403: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: UpdateTemplateSchema.omit({ id: true }) })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const updateData = request.body as Omit<z.infer<typeof UpdateTemplateSchema>, 'id'>;

      try {
        // Check if template exists and user owns it
        const [existingTemplate] = await db
          .select()
          .from(contentTemplates)
          .where(eq(contentTemplates.id, id))
          .limit(1);

        if (!existingTemplate) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: 'Template not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (existingTemplate.createdBy !== request.user!.userId) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You can only update your own templates',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Prepare update data
        const updateValues: any = {
          updatedAt: new Date(),
        };

        if (updateData.name !== undefined) updateValues.name = updateData.name;
        if (updateData.description !== undefined) updateValues.description = updateData.description;
        if (updateData.type !== undefined) updateValues.type = updateData.type;
        if (updateData.category !== undefined) updateValues.category = updateData.category;
        if (updateData.content !== undefined) updateValues.content = updateData.content;
        if (updateData.previewImage !== undefined) updateValues.previewImage = updateData.previewImage;
        if (updateData.tags !== undefined) updateValues.tags = updateData.tags;
        if (updateData.isPublic !== undefined) updateValues.isPublic = updateData.isPublic;

        // Update the template
        const [updatedTemplate] = await db
          .update(contentTemplates)
          .set(updateValues)
          .where(eq(contentTemplates.id, id))
          .returning();

        fastify.sendSuccess(
          reply,
          { template: updatedTemplate },
          'Template updated successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error updating template');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update template',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Delete a template
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Templates'],
        summary: 'Delete a template',
        description: 'Delete a template by its ID',
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
          403: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        // Check if template exists and user owns it
        const [existingTemplate] = await db
          .select()
          .from(contentTemplates)
          .where(eq(contentTemplates.id, id))
          .limit(1);

        if (!existingTemplate) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'TEMPLATE_NOT_FOUND',
              message: 'Template not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        if (existingTemplate.createdBy !== request.user!.userId) {
          return reply.code(403).send({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You can only delete your own templates',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Delete the template
        await db.delete(contentTemplates).where(eq(contentTemplates.id, id));

        fastify.sendSuccess(reply, null, 'Template deleted successfully');
      } catch (error) {
        fastify.log.error(error, 'Error deleting template');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete template',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}