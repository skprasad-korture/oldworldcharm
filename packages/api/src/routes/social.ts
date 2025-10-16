import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { SocialService } from '../services/social-service.js';
import { BlogService } from '../services/blog-service.js';

// Request schemas for social endpoints
const RecordShareSchema = z.object({
  platform: z.enum(['twitter', 'facebook', 'linkedin', 'reddit', 'pinterest', 'whatsapp', 'telegram', 'email']),
});

const SocialMetaQuerySchema = z.object({
  baseUrl: z.string().url('Invalid base URL'),
  siteName: z.string().optional(),
  twitterSite: z.string().optional(),
  twitterCreator: z.string().optional(),
});

export default async function socialRoutes(fastify: FastifyInstance) {
  // Record a social share (public endpoint)
  fastify.post(
    '/share/:blogPostId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Record a social share',
        description: 'Record when a blog post is shared on social media',
        params: {
          type: 'object',
          properties: {
            blogPostId: { type: 'string', minLength: 1 },
          },
          required: ['blogPostId'],
        },
        body: {
          type: 'object',
          properties: {
            platform: { 
              type: 'string', 
              enum: ['twitter', 'facebook', 'linkedin', 'reddit', 'pinterest', 'whatsapp', 'telegram', 'email'] 
            },
          },
          required: ['platform'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  share: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: [fastify.validate({ body: RecordShareSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { blogPostId } = request.params as { blogPostId: string };
      const { platform } = request.body as z.infer<typeof RecordShareSchema>;

      try {
        // Verify blog post exists
        const blogPost = await BlogService.getBlogPostById(blogPostId);
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

        const share = await SocialService.recordShare(blogPostId, platform);

        fastify.sendSuccess(
          reply,
          { share },
          `Share recorded for ${platform}`
        );
      } catch (error) {
        fastify.log.error(error, 'Error recording social share');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to record social share',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get share counts for a blog post (public endpoint)
  fastify.get(
    '/shares/:blogPostId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get share counts for a blog post',
        description: 'Retrieve social media share counts for a specific blog post',
        params: {
          type: 'object',
          properties: {
            blogPostId: { type: 'string', minLength: 1 },
          },
          required: ['blogPostId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  shares: { type: 'object' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { blogPostId } = request.params as { blogPostId: string };

      try {
        const shares = await SocialService.getShareCounts(blogPostId);

        fastify.sendSuccess(reply, { shares });
      } catch (error) {
        fastify.log.error(error, 'Error fetching share counts');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch share counts',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get sharing URLs for a blog post (public endpoint)
  fastify.get(
    '/sharing-urls/:blogPostId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get sharing URLs for a blog post',
        description: 'Generate social media sharing URLs for a specific blog post',
        params: {
          type: 'object',
          properties: {
            blogPostId: { type: 'string', minLength: 1 },
          },
          required: ['blogPostId'],
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
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  sharingUrls: { type: 'object' },
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
      const { blogPostId } = request.params as { blogPostId: string };
      const { baseUrl } = request.query as { baseUrl: string };

      try {
        const blogPost = await BlogService.getBlogPostById(blogPostId);
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

        const url = `${baseUrl}/blog/${blogPost.slug}`;
        const title = blogPost.title;
        const description = blogPost.excerpt || blogPost.description;

        const sharingUrls = SocialService.generateSharingUrls(url, title, description);

        fastify.sendSuccess(reply, { sharingUrls });
      } catch (error) {
        fastify.log.error(error, 'Error generating sharing URLs');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate sharing URLs',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get social meta tags for a blog post (public endpoint)
  fastify.get(
    '/meta-tags/:blogPostId',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get social meta tags for a blog post',
        description: 'Generate Open Graph and Twitter Card meta tags for a blog post',
        params: {
          type: 'object',
          properties: {
            blogPostId: { type: 'string', minLength: 1 },
          },
          required: ['blogPostId'],
        },
        querystring: {
          type: 'object',
          properties: {
            baseUrl: { type: 'string', format: 'uri' },
            siteName: { type: 'string' },
            twitterSite: { type: 'string' },
            twitterCreator: { type: 'string' },
            format: { type: 'string', enum: ['json', 'html'], default: 'json' },
          },
          required: ['baseUrl'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  metaTags: { type: 'object' },
                  html: { type: 'string' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: [fastify.validate({ querystring: SocialMetaQuerySchema.extend({ format: z.enum(['json', 'html']).default('json') }) })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { blogPostId } = request.params as { blogPostId: string };
      const { baseUrl, siteName, twitterSite, twitterCreator, format = 'json' } = request.query as z.infer<typeof SocialMetaQuerySchema> & { format?: string };

      try {
        const blogPost = await BlogService.getBlogPostById(blogPostId);
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

        const options: any = {};
        if (siteName) options.siteName = siteName;
        if (twitterSite) options.twitterSite = twitterSite;
        if (twitterCreator) options.twitterCreator = twitterCreator;
        
        const metaTags = SocialService.generateSocialMetaTags(blogPost, baseUrl, options);

        if (format === 'html') {
          const html = SocialService.generateMetaTagsHtml(metaTags);
          fastify.sendSuccess(reply, { html });
        } else {
          fastify.sendSuccess(reply, { metaTags });
        }
      } catch (error) {
        fastify.log.error(error, 'Error generating meta tags');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate meta tags',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get total share counts across all platforms (admin endpoint)
  fastify.get(
    '/stats/total-shares',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get total share counts',
        description: 'Get total share counts across all platforms (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  totalShares: { type: 'object' },
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
        const totalShares = await SocialService.getTotalShareCounts();

        fastify.sendSuccess(reply, { totalShares });
      } catch (error) {
        fastify.log.error(error, 'Error fetching total share counts');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch total share counts',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get most shared blog posts (admin endpoint)
  fastify.get(
    '/stats/most-shared',
    {
      schema: {
        tags: ['Social'],
        summary: 'Get most shared blog posts',
        description: 'Get blog posts with the highest share counts (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
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
                  mostShared: { type: 'array', items: { type: 'object' } },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { limit = 10 } = request.query as { limit?: number };

      try {
        const mostShared = await SocialService.getMostSharedPosts(limit);

        fastify.sendSuccess(reply, { mostShared });
      } catch (error) {
        fastify.log.error(error, 'Error fetching most shared posts');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch most shared posts',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}