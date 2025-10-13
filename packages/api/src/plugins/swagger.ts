import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';

async function swaggerPlugin(fastify: FastifyInstance) {
  // Register Swagger documentation
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Visual Website Builder API',
        description:
          'API for the Visual Website Builder with CMS functionality built on Astro',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@oldworldcharm.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
        {
          url: 'https://api.oldworldcharm.com',
          description: 'Production server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'auth-token',
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string', example: 'VALIDATION_ERROR' },
                  message: { type: 'string', example: 'Validation failed' },
                  details: { type: 'object' },
                  field: { type: 'string' },
                },
                required: ['code', 'message'],
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
            required: ['success', 'error', 'timestamp'],
          },
          Success: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
            required: ['success', 'timestamp'],
          },
          PaginatedResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: {} },
                  total: { type: 'integer', minimum: 0 },
                  page: { type: 'integer', minimum: 1 },
                  pageSize: { type: 'integer', minimum: 1 },
                  totalPages: { type: 'integer', minimum: 0 },
                  hasNext: { type: 'boolean' },
                  hasPrev: { type: 'boolean' },
                },
                required: [
                  'items',
                  'total',
                  'page',
                  'pageSize',
                  'totalPages',
                  'hasNext',
                  'hasPrev',
                ],
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
            required: ['success', 'data', 'timestamp'],
          },
          ComponentInstance: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1 },
              type: { type: 'string', minLength: 1 },
              props: { type: 'object' },
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/ComponentInstance' },
              },
              metadata: {
                type: 'object',
                properties: {
                  description: { type: 'string', minLength: 1 },
                  previewImage: { type: 'string', format: 'uri' },
                  tags: { type: 'array', items: { type: 'string' } },
                  isContainer: { type: 'boolean' },
                  version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
                },
                required: ['description', 'tags', 'isContainer', 'version'],
              },
            },
            required: ['id', 'type', 'props'],
          },
          Theme: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1 },
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
                },
                required: [
                  'primary',
                  'secondary',
                  'accent',
                  'neutral',
                  'base',
                  'info',
                  'success',
                  'warning',
                  'error',
                ],
              },
              typography: {
                type: 'object',
                properties: {
                  fontFamily: { type: 'string', minLength: 1 },
                  headingFont: { type: 'string' },
                  fontSize: { type: 'object' },
                  fontWeight: { type: 'object' },
                  lineHeight: { type: 'object' },
                },
                required: ['fontFamily'],
              },
              spacing: { type: 'object' },
              borderRadius: { type: 'object' },
              shadows: { type: 'object' },
              isDefault: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
            required: [
              'id',
              'name',
              'colors',
              'typography',
              'createdAt',
              'updatedAt',
            ],
          },
          Page: {
            type: 'object',
            properties: {
              id: { type: 'string', minLength: 1 },
              slug: {
                type: 'string',
                minLength: 1,
                pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
              },
              title: { type: 'string', minLength: 1, maxLength: 200 },
              description: { type: 'string', maxLength: 500 },
              components: {
                type: 'array',
                items: { $ref: '#/components/schemas/ComponentInstance' },
              },
              seoData: {
                type: 'object',
                properties: {
                  metaTitle: { type: 'string', maxLength: 60 },
                  metaDescription: { type: 'string', maxLength: 160 },
                  keywords: { type: 'array', items: { type: 'string' } },
                  ogTitle: { type: 'string', maxLength: 60 },
                  ogDescription: { type: 'string', maxLength: 160 },
                  ogImage: { type: 'string', format: 'uri' },
                  canonicalUrl: { type: 'string', format: 'uri' },
                  noIndex: { type: 'boolean' },
                  noFollow: { type: 'boolean' },
                },
              },
              status: {
                type: 'string',
                enum: ['draft', 'published', 'archived'],
              },
              publishedAt: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              version: { type: 'integer', minimum: 1 },
            },
            required: [
              'id',
              'slug',
              'title',
              'components',
              'status',
              'createdAt',
              'updatedAt',
              'version',
            ],
          },
        },
      },
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Auth', description: 'Authentication and authorization' },
        { name: 'Pages', description: 'Page management' },
        { name: 'Components', description: 'Component management' },
        { name: 'Themes', description: 'Theme management' },
        { name: 'Media', description: 'Media asset management' },
        { name: 'A/B Tests', description: 'A/B testing management' },
        { name: 'SEO', description: 'SEO optimization' },
        { name: 'Build', description: 'Build and deployment' },
      ],
    },
    hideUntagged: true,
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
    uiHooks: {
      onRequest: function (_request, _reply, next) {
        next();
      },
      preHandler: function (_request, _reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: header => header,
    transformSpecification: (swaggerObject, _request, _reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });
}

export default fp(swaggerPlugin, {
  name: 'swagger',
  dependencies: [],
});
