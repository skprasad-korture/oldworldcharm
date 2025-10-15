import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, desc, asc, and, like, sql } from 'drizzle-orm';
import { db, themes } from '../db/index.js';
import {
  ThemeColorsSchema,
  ThemeTypographySchema,
} from '@oldworldcharm/shared';

// Request schemas for API endpoints
const CreateThemeSchema = z.object({
  name: z
    .string()
    .min(1, 'Theme name is required')
    .max(100, 'Theme name too long'),
  colors: ThemeColorsSchema,
  typography: ThemeTypographySchema,
  spacing: z.record(z.string()).default({}),
  borderRadius: z.record(z.string()).default({}),
  shadows: z.record(z.string()).default({}),
  isDefault: z.boolean().optional(),
});

const UpdateThemeSchema = CreateThemeSchema.partial().extend({
  id: z.string().min(1, 'Theme ID is required'),
});

const ThemeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  isDefault: z.coerce.boolean().optional(),
});

const ThemeImportSchema = z.object({
  theme: CreateThemeSchema,
  overwrite: z.boolean().default(false),
});

export default async function themeRoutes(fastify: FastifyInstance) {
  // Helper function to ensure only one default theme
  async function ensureOnlyOneDefault(excludeId?: string) {
    try {
      const conditions = excludeId 
        ? and(eq(themes.isDefault, true), sql`${themes.id} != ${excludeId}`)
        : eq(themes.isDefault, true);
      
      await db
        .update(themes)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(conditions);
    } catch (error) {
      fastify.log.error(error, 'Error ensuring only one default theme');
      throw error;
    }
  }

  // Create a new theme
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Create a new theme',
        description: 'Create a new theme with colors, typography, and styling options',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            colors: {
              type: 'object',
              properties: {
                primary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                secondary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                accent: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                neutral: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                base: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                info: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                success: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                warning: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                error: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                background: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                foreground: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                muted: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                'muted-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                popover: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                'popover-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                card: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                'card-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                border: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                input: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                ring: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
              },
              required: ['primary', 'secondary', 'accent', 'neutral', 'base', 'info', 'success', 'warning', 'error', 'background', 'foreground', 'muted', 'muted-foreground', 'popover', 'popover-foreground', 'card', 'card-foreground', 'border', 'input', 'ring'],
            },
            typography: {
              type: 'object',
              properties: {
                fontFamily: { type: 'string', minLength: 1 },
                headingFont: { type: 'string' },
                fontSize: { type: 'object' },
                fontWeight: { type: 'object' },
                lineHeight: { type: 'object' },
                letterSpacing: { type: 'object' },
              },
              required: ['fontFamily'],
            },
            spacing: { type: 'object' },
            borderRadius: { type: 'object' },
            shadows: { type: 'object' },
            isDefault: { type: 'boolean' },
          },
          required: ['name', 'colors', 'typography'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  theme: { type: 'object' },
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
      preHandler: [fastify.authenticate, fastify.validate({ body: CreateThemeSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const themeData = request.body as z.infer<typeof CreateThemeSchema>;

      try {
        // Check if theme name already exists
        const existingTheme = await db
          .select({ id: themes.id })
          .from(themes)
          .where(eq(themes.name, themeData.name))
          .limit(1);

        if (existingTheme.length > 0) {
          return reply.code(409).send({
            success: false,
            error: {
              code: 'THEME_NAME_EXISTS',
              message: 'A theme with this name already exists',
              field: 'name',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // If this theme is set as default, ensure no other theme is default
        if (themeData.isDefault) {
          await ensureOnlyOneDefault();
        }

        // Create the theme configuration object
        const themeConfig = {
          colors: themeData.colors,
          typography: themeData.typography,
          spacing: themeData.spacing,
          borderRadius: themeData.borderRadius,
          shadows: themeData.shadows,
        };

        // Create the theme
        const [newTheme] = await db
          .insert(themes)
          .values({
            name: themeData.name,
            config: themeConfig,
            isDefault: themeData.isDefault || false,
          })
          .returning();

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { theme: newTheme },
          'Theme created successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error creating theme');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create theme',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get all themes with filtering and pagination
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Get all themes',
        description: 'Retrieve themes with filtering, searching, and pagination',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string' },
            sortBy: { type: 'string', enum: ['name', 'createdAt', 'updatedAt'], default: 'updatedAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
            isDefault: { type: 'boolean' },
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
      preHandler: [fastify.authenticate, fastify.validate({ querystring: ThemeQuerySchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as z.infer<typeof ThemeQuerySchema>;

      try {
        // Build where conditions
        const conditions = [];
        
        if (query.search) {
          conditions.push(like(themes.name, `%${query.search}%`));
        }

        if (query.isDefault !== undefined) {
          conditions.push(eq(themes.isDefault, query.isDefault));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Build order by clause
        let orderBy;
        switch (query.sortBy) {
          case 'name':
            orderBy = query.sortOrder === 'asc' ? asc(themes.name) : desc(themes.name);
            break;
          case 'createdAt':
            orderBy = query.sortOrder === 'asc' ? asc(themes.createdAt) : desc(themes.createdAt);
            break;
          default:
            orderBy = query.sortOrder === 'asc' ? asc(themes.updatedAt) : desc(themes.updatedAt);
        }

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(themes)
          .where(whereClause);
        
        const count = countResult[0]?.count || 0;

        // Get paginated results
        const offset = (query.page - 1) * query.pageSize;
        const themesData = await db
          .select()
          .from(themes)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(query.pageSize)
          .offset(offset);

        const totalPages = Math.ceil(count / query.pageSize);

        const paginatedResponse = {
          items: themesData,
          total: count,
          page: query.page,
          pageSize: query.pageSize,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        };

        fastify.sendSuccess(reply, paginatedResponse);
      } catch (error) {
        fastify.log.error(error, 'Error fetching themes');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch themes',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get a single theme by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Get theme by ID',
        description: 'Retrieve a single theme by its ID',
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
                  theme: { type: 'object' },
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
        const [theme] = await db
          .select()
          .from(themes)
          .where(eq(themes.id, id))
          .limit(1);

        if (!theme) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'THEME_NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(reply, { theme });
      } catch (error) {
        fastify.log.error(error, 'Error fetching theme');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch theme',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Update a theme
  fastify.put(
    '/:id',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Update a theme',
        description: 'Update an existing theme with new data',
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
            name: { type: 'string', minLength: 1, maxLength: 100 },
            colors: {
              type: 'object',
              properties: {
                primary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                secondary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                accent: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                neutral: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                base: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                info: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                success: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                warning: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                error: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                background: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                foreground: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                muted: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                'muted-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                popover: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                'popover-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                card: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                'card-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                border: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                input: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                ring: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
              },
            },
            typography: {
              type: 'object',
              properties: {
                fontFamily: { type: 'string', minLength: 1 },
                headingFont: { type: 'string' },
                fontSize: { type: 'object' },
                fontWeight: { type: 'object' },
                lineHeight: { type: 'object' },
                letterSpacing: { type: 'object' },
              },
            },
            spacing: { type: 'object' },
            borderRadius: { type: 'object' },
            shadows: { type: 'object' },
            isDefault: { type: 'boolean' },
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
                  theme: { type: 'object' },
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
      preHandler: [fastify.authenticate, fastify.validate({ body: UpdateThemeSchema.omit({ id: true }) })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const updateData = request.body as Omit<z.infer<typeof UpdateThemeSchema>, 'id'>;

      try {
        // Check if theme exists
        const [existingTheme] = await db
          .select()
          .from(themes)
          .where(eq(themes.id, id))
          .limit(1);

        if (!existingTheme) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'THEME_NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Check if name is being changed and if it conflicts
        if (updateData.name && updateData.name !== existingTheme.name) {
          const conflictingTheme = await db
            .select({ id: themes.id })
            .from(themes)
            .where(and(eq(themes.name, updateData.name), sql`${themes.id} != ${id}`))
            .limit(1);

          if (conflictingTheme.length > 0) {
            return reply.code(409).send({
              success: false,
              error: {
                code: 'THEME_NAME_EXISTS',
                message: 'A theme with this name already exists',
                field: 'name',
              },
              timestamp: new Date().toISOString(),
            });
          }
        }

        // If this theme is being set as default, ensure no other theme is default
        if (updateData.isDefault) {
          await ensureOnlyOneDefault(id);
        }

        // Prepare update data
        const updateValues: any = {
          updatedAt: new Date(),
        };

        if (updateData.name !== undefined) updateValues.name = updateData.name;
        if (updateData.isDefault !== undefined) updateValues.isDefault = updateData.isDefault;

        // Update theme config if any theme properties are provided
        if (updateData.colors || updateData.typography || updateData.spacing || updateData.borderRadius || updateData.shadows) {
          const currentConfig = existingTheme.config as any;
          const newConfig = {
            colors: updateData.colors || currentConfig.colors,
            typography: updateData.typography || currentConfig.typography,
            spacing: updateData.spacing !== undefined ? updateData.spacing : currentConfig.spacing,
            borderRadius: updateData.borderRadius !== undefined ? updateData.borderRadius : currentConfig.borderRadius,
            shadows: updateData.shadows !== undefined ? updateData.shadows : currentConfig.shadows,
          };
          updateValues.config = newConfig;
        }

        // Update the theme
        const [updatedTheme] = await db
          .update(themes)
          .set(updateValues)
          .where(eq(themes.id, id))
          .returning();

        fastify.sendSuccess(
          reply,
          { theme: updatedTheme },
          'Theme updated successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error updating theme');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update theme',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Delete a theme
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Delete a theme',
        description: 'Delete a theme by its ID',
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
          400: { $ref: '#/components/schemas/Error' },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        // Check if theme exists
        const [existingTheme] = await db
          .select({ id: themes.id, isDefault: themes.isDefault })
          .from(themes)
          .where(eq(themes.id, id))
          .limit(1);

        if (!existingTheme) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'THEME_NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Prevent deletion of default theme
        if (existingTheme.isDefault) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'CANNOT_DELETE_DEFAULT_THEME',
              message: 'Cannot delete the default theme. Set another theme as default first.',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Delete the theme
        await db.delete(themes).where(eq(themes.id, id));

        fastify.sendSuccess(reply, null, 'Theme deleted successfully');
      } catch (error) {
        fastify.log.error(error, 'Error deleting theme');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete theme',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Set theme as default
  fastify.post(
    '/:id/set-default',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Set theme as default',
        description: 'Set a theme as the default theme',
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
                  theme: { type: 'object' },
                },
              },
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
        // Check if theme exists
        const [existingTheme] = await db
          .select()
          .from(themes)
          .where(eq(themes.id, id))
          .limit(1);

        if (!existingTheme) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'THEME_NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Ensure only this theme is default
        await ensureOnlyOneDefault(id);

        // Set this theme as default
        const [updatedTheme] = await db
          .update(themes)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(themes.id, id))
          .returning();

        fastify.sendSuccess(
          reply,
          { theme: updatedTheme },
          'Theme set as default successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error setting theme as default');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to set theme as default',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Export theme
  fastify.get(
    '/:id/export',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Export theme',
        description: 'Export a theme configuration as JSON',
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
                  theme: { type: 'object' },
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
        const [theme] = await db
          .select()
          .from(themes)
          .where(eq(themes.id, id))
          .limit(1);

        if (!theme) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'THEME_NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Create exportable theme object
        const exportableTheme = {
          name: theme.name,
          ...(theme.config as Record<string, any>),
        };

        fastify.sendSuccess(reply, { theme: exportableTheme });
      } catch (error) {
        fastify.log.error(error, 'Error exporting theme');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to export theme',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Import theme
  fastify.post(
    '/import',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Import theme',
        description: 'Import a theme configuration from JSON',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            theme: {
              type: 'object',
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 100 },
                colors: {
                  type: 'object',
                  properties: {
                    primary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    secondary: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    accent: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    neutral: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    base: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    info: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    success: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    warning: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    error: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    background: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    foreground: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    muted: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    'muted-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    popover: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    'popover-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    card: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    'card-foreground': { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    border: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    input: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                    ring: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
                  },
                  required: ['primary', 'secondary', 'accent', 'neutral', 'base', 'info', 'success', 'warning', 'error', 'background', 'foreground', 'muted', 'muted-foreground', 'popover', 'popover-foreground', 'card', 'card-foreground', 'border', 'input', 'ring'],
                },
                typography: {
                  type: 'object',
                  properties: {
                    fontFamily: { type: 'string', minLength: 1 },
                    headingFont: { type: 'string' },
                    fontSize: { type: 'object' },
                    fontWeight: { type: 'object' },
                    lineHeight: { type: 'object' },
                    letterSpacing: { type: 'object' },
                  },
                  required: ['fontFamily'],
                },
                spacing: { type: 'object' },
                borderRadius: { type: 'object' },
                shadows: { type: 'object' },
                isDefault: { type: 'boolean' },
              },
              required: ['name', 'colors', 'typography'],
            },
            overwrite: { type: 'boolean', default: false },
          },
          required: ['theme'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  theme: { type: 'object' },
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
      preHandler: [fastify.authenticate, fastify.validate({ body: ThemeImportSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { theme: themeData, overwrite } = request.body as z.infer<typeof ThemeImportSchema>;

      try {
        // Check if theme name already exists
        const [existingTheme] = await db
          .select({ id: themes.id })
          .from(themes)
          .where(eq(themes.name, themeData.name))
          .limit(1);

        if (existingTheme && !overwrite) {
          return reply.code(409).send({
            success: false,
            error: {
              code: 'THEME_NAME_EXISTS',
              message: 'A theme with this name already exists. Set overwrite to true to replace it.',
              field: 'name',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // If this theme is set as default, ensure no other theme is default
        if (themeData.isDefault) {
          await ensureOnlyOneDefault(existingTheme?.id);
        }

        // Create the theme configuration object
        const themeConfig = {
          colors: themeData.colors,
          typography: themeData.typography,
          spacing: themeData.spacing,
          borderRadius: themeData.borderRadius,
          shadows: themeData.shadows,
        };

        let newTheme;

        if (existingTheme && overwrite) {
          // Update existing theme
          [newTheme] = await db
            .update(themes)
            .set({
              config: themeConfig,
              isDefault: themeData.isDefault || false,
              updatedAt: new Date(),
            })
            .where(eq(themes.id, existingTheme.id))
            .returning();
        } else {
          // Create new theme
          [newTheme] = await db
            .insert(themes)
            .values({
              name: themeData.name,
              config: themeConfig,
              isDefault: themeData.isDefault || false,
            })
            .returning();
        }

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { theme: newTheme },
          `Theme ${overwrite && existingTheme ? 'updated' : 'imported'} successfully`
        );
      } catch (error) {
        fastify.log.error(error, 'Error importing theme');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to import theme',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Generate CSS from theme
  fastify.get(
    '/:id/css',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Generate CSS from theme',
        description: 'Generate CSS custom properties and utility classes from theme configuration',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
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
            selector: { type: 'string', default: ':root' },
            preview: { type: 'boolean', default: false },
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
                  css: { type: 'string' },
                  customProperties: { type: 'object' },
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
      const { selector = ':root', preview = false } = request.query as { selector?: string; preview?: boolean };

      try {
        // Import ThemeService dynamically to avoid circular dependencies
        const { ThemeService } = await import('../services/theme-service.js');
        
        const result = await ThemeService.getThemeById(id);
        if (!result) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'THEME_NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        const { config } = result;
        const customProperties = ThemeService.generateCSSCustomProperties(config);
        const css = preview 
          ? ThemeService.generatePreviewCSS(config, selector)
          : ThemeService.generateCSS(config, selector);

        fastify.sendSuccess(reply, { css, customProperties });
      } catch (error) {
        fastify.log.error(error, 'Error generating CSS from theme');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate CSS from theme',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Validate theme accessibility
  fastify.get(
    '/:id/accessibility',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Validate theme accessibility',
        description: 'Check theme for accessibility issues including contrast ratios and color blindness',
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
                  isValid: { type: 'boolean' },
                  score: { type: 'number' },
                  issues: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['contrast', 'color-blindness', 'readability'] },
                        severity: { type: 'string', enum: ['error', 'warning', 'info'] },
                        message: { type: 'string' },
                        suggestion: { type: 'string' },
                        colors: {
                          type: 'object',
                          properties: {
                            foreground: { type: 'string' },
                            background: { type: 'string' },
                            ratio: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
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
        const { ThemeService } = await import('../services/theme-service.js');
        
        const result = await ThemeService.getThemeById(id);
        if (!result) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'THEME_NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        const { config } = result;
        const validation = ThemeService.validateAccessibility(config);

        fastify.sendSuccess(reply, validation);
      } catch (error) {
        fastify.log.error(error, 'Error validating theme accessibility');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to validate theme accessibility',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Create theme version for rollback
  fastify.post(
    '/:id/versions',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Create theme version',
        description: 'Create a version snapshot of the theme for rollback capability',
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
            changeNote: { type: 'string', maxLength: 500 },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  versionId: { type: 'string' },
                },
              },
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
      const { changeNote } = request.body as { changeNote?: string };

      try {
        const { ThemeService } = await import('../services/theme-service.js');
        
        const versionId = await ThemeService.createThemeVersion(id, changeNote);

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { versionId },
          'Theme version created successfully'
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('Theme not found')) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'THEME_NOT_FOUND',
              message: 'Theme not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.log.error(error, 'Error creating theme version');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create theme version',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get default theme CSS
  fastify.get(
    '/default/css',
    {
      schema: {
        tags: ['Themes'],
        summary: 'Get default theme CSS',
        description: 'Generate CSS from the default theme',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            selector: { type: 'string', default: ':root' },
            preview: { type: 'boolean', default: false },
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
                  css: { type: 'string' },
                  customProperties: { type: 'object' },
                  theme: { type: 'object' },
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
      const { selector = ':root', preview = false } = request.query as { selector?: string; preview?: boolean };

      try {
        const { ThemeService } = await import('../services/theme-service.js');
        
        const result = await ThemeService.getDefaultTheme();
        if (!result) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'DEFAULT_THEME_NOT_FOUND',
              message: 'No default theme found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        const { theme, config } = result;
        const customProperties = ThemeService.generateCSSCustomProperties(config);
        const css = preview 
          ? ThemeService.generatePreviewCSS(config, selector)
          : ThemeService.generateCSS(config, selector);

        fastify.sendSuccess(reply, { css, customProperties, theme });
      } catch (error) {
        fastify.log.error(error, 'Error generating default theme CSS');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate default theme CSS',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}