import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, desc, asc, and, or, like, sql } from 'drizzle-orm';
import { db, pages, blogPosts } from '../db/index';
import {
  PageStatusSchema,
  SEODataSchema,
  ComponentInstanceSchema,
} from '@oldworldcharm/shared';

// Request schemas for blog API endpoints
type CreateBlogPostRequest = {
  Body: {
    slug: string;
    title: string;
    description?: string;
    excerpt?: string;
    featuredImage?: string;
    categories: string[];
    tags: string[];
    author: string;
    content?: string;
    components: any[];
    seoData: any;
    status: string;
    publishedAt?: Date;
  };
};

const CreateBlogPostSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only'
    ),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  excerpt: z.string().max(300, 'Excerpt too long').optional(),
  featuredImage: z.string().url('Invalid featured image URL').optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  author: z.string().min(1, 'Author is required'),
  content: z.string().optional(),
  components: z.array(ComponentInstanceSchema).default([]),
  seoData: SEODataSchema.default({}),
  status: PageStatusSchema.default('draft'),
  publishedAt: z.date().optional(),
});

const UpdateBlogPostSchema = CreateBlogPostSchema.partial().extend({
  id: z.string().min(1, 'Blog post ID is required'),
});

const BlogPostQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: PageStatusSchema.optional(),
  search: z.string().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  sortBy: z.enum(['title', 'createdAt', 'updatedAt', 'publishedAt', 'readingTime']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const CategoryTagQuerySchema = z.object({
  type: z.enum(['categories', 'tags']),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// Helper function to calculate reading time
function calculateReadingTime(content: string, components: any[]): number {
  // Extract text from content and components
  let textContent = content || '';
  
  // Extract text from components (simplified)
  const extractTextFromComponents = (comps: any[]): string => {
    let text = '';
    for (const comp of comps) {
      if (comp.props) {
        Object.values(comp.props).forEach(prop => {
          if (typeof prop === 'string') {
            text += prop + ' ';
          }
        });
      }
      if (comp.children) {
        text += extractTextFromComponents(comp.children);
      }
    }
    return text;
  };

  textContent += extractTextFromComponents(components);
  
  // Calculate reading time (average 200 words per minute)
  const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export default async function blogRoutes(fastify: FastifyInstance) {
  // Create a new blog post
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Create a new blog post',
        description: 'Create a new blog post with content and metadata',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 500 },
            excerpt: { type: 'string', maxLength: 300 },
            featuredImage: { type: 'string', format: 'uri' },
            categories: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            author: { type: 'string', minLength: 1 },
            content: { type: 'string' },
            components: { type: 'array', items: { type: 'object' } },
            seoData: { type: 'object' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            publishedAt: { type: 'string', format: 'date-time' },
          },
          required: ['slug', 'title', 'author'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  blogPost: { type: 'object' },
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
      preHandler: [fastify.authenticate, fastify.validate({ body: CreateBlogPostSchema })],
    },
    async (request: FastifyRequest<CreateBlogPostRequest>, reply: FastifyReply) => {
      const blogPostData = request.body;

      try {
        // Check if slug already exists
        const existingPage = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.slug, blogPostData.slug))
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

        // Calculate reading time
        const readingTime = calculateReadingTime(
          blogPostData.content || '',
          blogPostData.components
        );

        // Create the page first
        const [newPage] = await db
          .insert(pages)
          .values({
            slug: blogPostData.slug,
            title: blogPostData.title,
            description: blogPostData.description || null,
            content: blogPostData.components || [],
            seoData: blogPostData.seoData,
            status: blogPostData.status,
            publishedAt: blogPostData.status === 'published' 
              ? (blogPostData.publishedAt || new Date()) 
              : null,
          })
          .returning({ id: pages.id, slug: pages.slug, content: pages.content });

        if (!newPage) {
          throw new Error('Failed to create page');
        }

        // Create the blog post entry
        const [newBlogPost] = await db
          .insert(blogPosts)
          .values({
            pageId: newPage.id,
            excerpt: blogPostData.excerpt || null,
            featuredImage: blogPostData.featuredImage || null,
            categories: blogPostData.categories,
            tags: blogPostData.tags,
            author: blogPostData.author,
            readingTime,
          })
          .returning({ id: blogPosts.id, pageId: blogPosts.pageId });

        if (!newBlogPost) {
          throw new Error('Failed to create blog post');
        }

        // Combine page and blog post data
        const combinedBlogPost = {
          ...newPage,
          ...newBlogPost,
          components: newPage.content,
        };

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { blogPost: combinedBlogPost },
          'Blog post created successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error creating blog post');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create blog post',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get all blog posts with filtering and pagination
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Get all blog posts',
        description: 'Retrieve blog posts with filtering, searching, and pagination',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            search: { type: 'string' },
            categories: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            author: { type: 'string' },
            sortBy: { type: 'string', enum: ['title', 'createdAt', 'updatedAt', 'publishedAt', 'readingTime'], default: 'updatedAt' },
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
      preHandler: [fastify.authenticate, fastify.validate({ querystring: BlogPostQuerySchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as z.infer<typeof BlogPostQuerySchema>;

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
              like(pages.slug, `%${query.search}%`),
              like(blogPosts.excerpt, `%${query.search}%`)
            )
          );
        }

        if (query.categories && query.categories.length > 0) {
          conditions.push(
            sql`${blogPosts.categories} ?| ${query.categories}`
          );
        }

        if (query.tags && query.tags.length > 0) {
          conditions.push(
            sql`${blogPosts.tags} ?| ${query.tags}`
          );
        }

        if (query.author) {
          conditions.push(eq(blogPosts.author, query.author));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

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
          case 'readingTime':
            orderBy = query.sortOrder === 'asc' ? asc(blogPosts.readingTime) : desc(blogPosts.readingTime);
            break;
          default:
            orderBy = query.sortOrder === 'asc' ? asc(pages.updatedAt) : desc(pages.updatedAt);
        }

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(pages)
          .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
          .where(whereClause);
        
        const count = countResult[0]?.count || 0;

        // Get paginated results
        const offset = (query.page - 1) * query.pageSize;
        const blogPostsData = await db
          .select({
            // Page fields
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            description: pages.description,
            content: pages.content,
            seoData: pages.seoData,
            status: pages.status,
            publishedAt: pages.publishedAt,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
            // Blog post fields
            excerpt: blogPosts.excerpt,
            featuredImage: blogPosts.featuredImage,
            categories: blogPosts.categories,
            tags: blogPosts.tags,
            author: blogPosts.author,
            readingTime: blogPosts.readingTime,
          })
          .from(pages)
          .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
          .where(whereClause)
          .orderBy(orderBy)
          .limit(query.pageSize)
          .offset(offset);

        // Transform content to components for consistency
        const transformedBlogPosts = blogPostsData.map(post => ({
          ...post,
          components: post.content,
        }));

        const totalPages = Math.ceil(count / query.pageSize);

        const paginatedResponse = {
          items: transformedBlogPosts,
          total: count,
          page: query.page,
          pageSize: query.pageSize,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        };

        fastify.sendSuccess(reply, paginatedResponse);
      } catch (error) {
        fastify.log.error(error, 'Error fetching blog posts');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch blog posts',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get a single blog post by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Get blog post by ID',
        description: 'Retrieve a single blog post by its ID',
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
                  blogPost: { type: 'object' },
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
        const [blogPost] = await db
          .select({
            // Page fields
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            description: pages.description,
            content: pages.content,
            seoData: pages.seoData,
            status: pages.status,
            publishedAt: pages.publishedAt,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
            // Blog post fields
            excerpt: blogPosts.excerpt,
            featuredImage: blogPosts.featuredImage,
            categories: blogPosts.categories,
            tags: blogPosts.tags,
            author: blogPosts.author,
            readingTime: blogPosts.readingTime,
          })
          .from(pages)
          .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
          .where(eq(pages.id, id))
          .limit(1);

        if (!blogPost) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'BLOG_POST_NOT_FOUND',
              message: 'Blog post not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Transform content to components for consistency
        const transformedBlogPost = {
          ...blogPost,
          components: blogPost.content,
        };

        fastify.sendSuccess(reply, { blogPost: transformedBlogPost });
      } catch (error) {
        fastify.log.error(error, 'Error fetching blog post');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch blog post',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Update a blog post
  fastify.put(
    '/:id',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Update a blog post',
        description: 'Update an existing blog post with new data',
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
            excerpt: { type: 'string', maxLength: 300 },
            featuredImage: { type: 'string', format: 'uri' },
            categories: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            author: { type: 'string', minLength: 1 },
            content: { type: 'string' },
            components: { type: 'array', items: { type: 'object' } },
            seoData: { type: 'object' },
            status: { type: 'string', enum: ['draft', 'published', 'archived'] },
            publishedAt: { type: 'string', format: 'date-time' },
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
                  blogPost: { type: 'object' },
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
      preHandler: [fastify.authenticate, fastify.validate({ body: UpdateBlogPostSchema.omit({ id: true }) })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const updateData = request.body as Omit<z.infer<typeof UpdateBlogPostSchema>, 'id'>;

      try {
        // Check if blog post exists
        const [existingBlogPost] = await db
          .select({
            pageId: blogPosts.pageId,
            slug: pages.slug,
            status: pages.status,
          })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id))
          .where(eq(pages.id, id))
          .limit(1);

        if (!existingBlogPost) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'BLOG_POST_NOT_FOUND',
              message: 'Blog post not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Check if slug is being changed and if it conflicts
        if (updateData.slug && updateData.slug !== existingBlogPost.slug) {
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

        // Prepare page update data
        const pageUpdateValues: any = {
          updatedAt: new Date(),
        };

        if (updateData.slug !== undefined) pageUpdateValues.slug = updateData.slug;
        if (updateData.title !== undefined) pageUpdateValues.title = updateData.title;
        if (updateData.description !== undefined) pageUpdateValues.description = updateData.description;
        if (updateData.components !== undefined) pageUpdateValues.content = updateData.components;
        if (updateData.seoData !== undefined) pageUpdateValues.seoData = updateData.seoData;
        if (updateData.status !== undefined) {
          pageUpdateValues.status = updateData.status;
          // Set publishedAt when status changes to published
          if (updateData.status === 'published' && existingBlogPost.status !== 'published') {
            pageUpdateValues.publishedAt = updateData.publishedAt || new Date();
          }
          // Clear publishedAt when status changes from published
          if (updateData.status !== 'published' && existingBlogPost.status === 'published') {
            pageUpdateValues.publishedAt = null;
          }
        }

        // Prepare blog post update data
        const blogPostUpdateValues: any = {
          updatedAt: new Date(),
        };

        if (updateData.excerpt !== undefined) blogPostUpdateValues.excerpt = updateData.excerpt;
        if (updateData.featuredImage !== undefined) blogPostUpdateValues.featuredImage = updateData.featuredImage;
        if (updateData.categories !== undefined) blogPostUpdateValues.categories = updateData.categories;
        if (updateData.tags !== undefined) blogPostUpdateValues.tags = updateData.tags;
        if (updateData.author !== undefined) blogPostUpdateValues.author = updateData.author;

        // Recalculate reading time if content or components changed
        if (updateData.content !== undefined || updateData.components !== undefined) {
          const readingTime = calculateReadingTime(
            updateData.content || '',
            updateData.components || []
          );
          blogPostUpdateValues.readingTime = readingTime;
        }

        // Update both tables
        const [updatedPage] = await db
          .update(pages)
          .set(pageUpdateValues)
          .where(eq(pages.id, id))
          .returning();

        const [updatedBlogPost] = await db
          .update(blogPosts)
          .set(blogPostUpdateValues)
          .where(eq(blogPosts.pageId, id))
          .returning();

        if (!updatedPage || !updatedBlogPost) {
          throw new Error('Failed to update blog post');
        }

        // Combine updated data
        const combinedBlogPost = {
          ...updatedPage,
          ...updatedBlogPost,
          components: updatedPage.content,
        };

        fastify.sendSuccess(
          reply,
          { blogPost: combinedBlogPost },
          'Blog post updated successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error updating blog post');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update blog post',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Delete a blog post
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Delete a blog post',
        description: 'Delete a blog post by its ID',
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
        // Check if blog post exists
        const existingBlogPost = await db
          .select({ pageId: blogPosts.pageId })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id))
          .where(eq(pages.id, id))
          .limit(1);

        if (existingBlogPost.length === 0) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'BLOG_POST_NOT_FOUND',
              message: 'Blog post not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Delete the page (blog post will be deleted via cascade)
        await db.delete(pages).where(eq(pages.id, id));

        fastify.sendSuccess(reply, null, 'Blog post deleted successfully');
      } catch (error) {
        fastify.log.error(error, 'Error deleting blog post');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete blog post',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get categories and tags
  fastify.get(
    '/metadata/:type',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Get blog categories or tags',
        description: 'Retrieve all categories or tags used in blog posts',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        params: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['categories', 'tags'] },
          },
          required: ['type'],
        },
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
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
                  items: { type: 'array', items: { type: 'string' } },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ querystring: CategoryTagQuerySchema.omit({ type: true }) })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { type } = request.params as { type: 'categories' | 'tags' };
      const query = request.query as Omit<z.infer<typeof CategoryTagQuerySchema>, 'type'>;

      try {
        // Get all unique categories or tags
        const field = type === 'categories' ? blogPosts.categories : blogPosts.tags;
        
        const results = await db
          .select({ items: field })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id))
          .where(eq(pages.status, 'published'));

        // Extract and flatten all categories/tags
        const allItems = new Set<string>();
        results.forEach(result => {
          const items = result.items as string[];
          items.forEach(item => {
            if (query.search) {
              if (item.toLowerCase().includes(query.search.toLowerCase())) {
                allItems.add(item);
              }
            } else {
              allItems.add(item);
            }
          });
        });

        // Convert to array and limit results
        const itemsArray = Array.from(allItems)
          .sort()
          .slice(0, query.limit);

        fastify.sendSuccess(reply, { items: itemsArray });
      } catch (error) {
        fastify.log.error(error, `Error fetching blog ${type}`);
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: `Failed to fetch blog ${type}`,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Schedule a blog post for publication
  fastify.post(
    '/:id/schedule',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Schedule blog post publication',
        description: 'Schedule a blog post to be published at a specific date and time',
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
            publishedAt: { type: 'string', format: 'date-time' },
          },
          required: ['publishedAt'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  blogPost: { type: 'object' },
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
      const { publishedAt } = request.body as { publishedAt: string };

      try {
        const scheduledDate = new Date(publishedAt);
        
        // Update the blog post with scheduled publication date
        const [updatedPage] = await db
          .update(pages)
          .set({
            status: 'draft', // Keep as draft until publication time
            publishedAt: scheduledDate,
            updatedAt: new Date(),
          })
          .where(eq(pages.id, id))
          .returning();

        if (!updatedPage) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'BLOG_POST_NOT_FOUND',
              message: 'Blog post not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Get the complete blog post data
        const [blogPost] = await db
          .select({
            // Page fields
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            description: pages.description,
            content: pages.content,
            seoData: pages.seoData,
            status: pages.status,
            publishedAt: pages.publishedAt,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
            // Blog post fields
            excerpt: blogPosts.excerpt,
            featuredImage: blogPosts.featuredImage,
            categories: blogPosts.categories,
            tags: blogPosts.tags,
            author: blogPosts.author,
            readingTime: blogPosts.readingTime,
          })
          .from(pages)
          .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
          .where(eq(pages.id, id))
          .limit(1);

        if (!blogPost) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'BLOG_POST_NOT_FOUND',
              message: 'Blog post not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        const transformedBlogPost = {
          ...blogPost,
          components: blogPost.content,
        };

        fastify.sendSuccess(
          reply,
          { blogPost: transformedBlogPost },
          `Blog post scheduled for publication on ${scheduledDate.toISOString()}`
        );
      } catch (error) {
        fastify.log.error(error, 'Error scheduling blog post');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to schedule blog post',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Publish a blog post immediately
  fastify.post(
    '/:id/publish',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Publish blog post immediately',
        description: 'Publish a blog post immediately',
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
                  blogPost: { type: 'object' },
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
        // Update the blog post to published status
        const [updatedPage] = await db
          .update(pages)
          .set({
            status: 'published',
            publishedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(pages.id, id))
          .returning();

        if (!updatedPage) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'BLOG_POST_NOT_FOUND',
              message: 'Blog post not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Get the complete blog post data
        const [blogPost] = await db
          .select({
            // Page fields
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            description: pages.description,
            content: pages.content,
            seoData: pages.seoData,
            status: pages.status,
            publishedAt: pages.publishedAt,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
            // Blog post fields
            excerpt: blogPosts.excerpt,
            featuredImage: blogPosts.featuredImage,
            categories: blogPosts.categories,
            tags: blogPosts.tags,
            author: blogPosts.author,
            readingTime: blogPosts.readingTime,
          })
          .from(pages)
          .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
          .where(eq(pages.id, id))
          .limit(1);

        if (!blogPost) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'BLOG_POST_NOT_FOUND',
              message: 'Blog post not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        const transformedBlogPost = {
          ...blogPost,
          components: blogPost.content,
        };

        fastify.sendSuccess(
          reply,
          { blogPost: transformedBlogPost },
          'Blog post published successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error publishing blog post');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to publish blog post',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get related blog posts (public endpoint)
  fastify.get(
    '/:id/related',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Get related blog posts',
        description: 'Get blog posts related to the specified post based on categories and tags',
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
            limit: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
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
                  relatedPosts: { type: 'array', items: { type: 'object' } },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { limit = 5 } = request.query as { limit?: number };

      try {
        // First get the current blog post to extract categories and tags
        const [currentPost] = await db
          .select({
            categories: blogPosts.categories,
            tags: blogPosts.tags,
          })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id))
          .where(eq(pages.id, id))
          .limit(1);

        if (!currentPost) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'BLOG_POST_NOT_FOUND',
              message: 'Blog post not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        const conditions = [
          sql`${pages.id} != ${id}`,
          eq(pages.status, 'published'),
        ];

        const categories = currentPost.categories as string[];
        const tags = currentPost.tags as string[];

        // Add category or tag matching conditions
        if (categories.length > 0 || tags.length > 0) {
          const relatedConditions: any[] = [];
          
          if (categories.length > 0) {
            relatedConditions.push(sql`${blogPosts.categories} ?| ${categories}`);
          }
          
          if (tags.length > 0) {
            relatedConditions.push(sql`${blogPosts.tags} ?| ${tags}`);
          }

          if (relatedConditions.length === 1) {
            conditions.push(relatedConditions[0]!);
          } else if (relatedConditions.length > 1) {
            conditions.push(or(...relatedConditions) as any);
          }
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

        const relatedPosts = await db
          .select({
            // Page fields
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            description: pages.description,
            content: pages.content,
            seoData: pages.seoData,
            status: pages.status,
            publishedAt: pages.publishedAt,
            createdAt: pages.createdAt,
            updatedAt: pages.updatedAt,
            // Blog post fields
            excerpt: blogPosts.excerpt,
            featuredImage: blogPosts.featuredImage,
            categories: blogPosts.categories,
            tags: blogPosts.tags,
            author: blogPosts.author,
            readingTime: blogPosts.readingTime,
          })
          .from(pages)
          .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
          .where(whereClause)
          .orderBy(desc(pages.publishedAt))
          .limit(limit);

        const transformedRelatedPosts = relatedPosts.map(post => ({
          ...post,
          components: post.content,
        }));

        fastify.sendSuccess(reply, { relatedPosts: transformedRelatedPosts });
      } catch (error) {
        fastify.log.error(error, 'Error fetching related blog posts');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch related blog posts',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get blog statistics
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Blog'],
        summary: 'Get blog statistics',
        description: 'Get comprehensive statistics about blog posts',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  stats: {
                    type: 'object',
                    properties: {
                      totalPosts: { type: 'integer' },
                      publishedPosts: { type: 'integer' },
                      draftPosts: { type: 'integer' },
                      totalCategories: { type: 'integer' },
                      totalTags: { type: 'integer' },
                      totalAuthors: { type: 'integer' },
                    },
                  },
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
        // Get total counts
        const [totalResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id));

        const [publishedResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id))
          .where(eq(pages.status, 'published'));

        const [draftResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id))
          .where(eq(pages.status, 'draft'));

        // Get unique authors
        const authorsResult = await db
          .selectDistinct({ author: blogPosts.author })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id));

        // Get all categories and tags to count unique ones
        const categoriesAndTags = await db
          .select({ 
            categories: blogPosts.categories,
            tags: blogPosts.tags,
          })
          .from(blogPosts)
          .innerJoin(pages, eq(blogPosts.pageId, pages.id));

        const allCategories = new Set<string>();
        const allTags = new Set<string>();

        categoriesAndTags.forEach(result => {
          (result.categories as string[]).forEach(cat => allCategories.add(cat));
          (result.tags as string[]).forEach(tag => allTags.add(tag));
        });

        const stats = {
          totalPosts: totalResult?.count || 0,
          publishedPosts: publishedResult?.count || 0,
          draftPosts: draftResult?.count || 0,
          totalCategories: allCategories.size,
          totalTags: allTags.size,
          totalAuthors: authorsResult.length,
        };

        fastify.sendSuccess(reply, { stats });
      } catch (error) {
        fastify.log.error(error, 'Error fetching blog statistics');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch blog statistics',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}