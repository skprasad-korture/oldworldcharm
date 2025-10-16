import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { seoService } from '../services/seo-service';
import { urlService } from '../services/url-service';
import { db } from '../db/connection';
import { pages, sitemapEntries } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  SEOAnalysisSchema,
  URLRedirectSchema,
  MetaTagsSchema,
  StructuredDataSchema,
} from '@oldworldcharm/shared';

// Request/Response schemas
const AnalyzePageRequestSchema = z.object({
  pageId: z.string().uuid('Invalid page ID'),
  forceReanalysis: z.boolean().optional().default(false),
});

const GenerateMetaTagsRequestSchema = z.object({
  pageId: z.string().uuid('Invalid page ID'),
  baseUrl: z.string().url('Invalid base URL').optional(),
});

const GenerateStructuredDataRequestSchema = z.object({
  pageId: z.string().uuid('Invalid page ID'),
  contentType: z.enum(['WebPage', 'Article', 'BlogPosting']).optional().default('WebPage'),
});

const CreateRedirectRequestSchema = z.object({
  fromUrl: z.string().min(1, 'Source URL is required'),
  toUrl: z.string().url('Invalid destination URL'),
  statusCode: z.enum(['301', '302', '307', '308']).default('301'),
});

const UpdateRedirectRequestSchema = z.object({
  toUrl: z.string().url('Invalid destination URL').optional(),
  statusCode: z.enum(['301', '302', '307', '308']).optional(),
  isActive: z.boolean().optional(),
});

const GenerateSitemapRequestSchema = z.object({
  baseUrl: z.string().url('Invalid base URL'),
  includeLastModified: z.boolean().optional().default(true),
  includePriority: z.boolean().optional().default(true),
  includeChangeFreq: z.boolean().optional().default(true),
  excludePatterns: z.array(z.string()).optional().default([]),
});

const ValidateSlugRequestSchema = z.object({
  slug: z.string().min(1, 'Slug is required'),
  pageId: z.string().uuid('Invalid page ID').optional(),
});

const GenerateSlugRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

const GenerateRobotsRequestSchema = z.object({
  baseUrl: z.string().url('Invalid base URL'),
  allowAll: z.boolean().optional().default(true),
  disallowPatterns: z.array(z.string()).optional().default([]),
  customRules: z.array(z.string()).optional().default([]),
});

const seoRoutes: FastifyPluginAsync = async (fastify) => {
  // Analyze page for SEO
  fastify.post<{
    Body: z.infer<typeof AnalyzePageRequestSchema>;
  }>('/analyze', {
    schema: {
      body: AnalyzePageRequestSchema,
      response: {
        200: SEOAnalysisSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { pageId, forceReanalysis } = request.body;

      // Check if page exists
      const [page] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, pageId))
        .limit(1);

      if (!page) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Page not found',
        });
      }

      // Get existing analysis if not forcing reanalysis
      if (!forceReanalysis) {
        const existingAnalysis = await seoService.getPageAnalysis(pageId);
        if (existingAnalysis) {
          return reply.send(existingAnalysis);
        }
      }

      // Perform new analysis
      const analysis = await seoService.analyzePage(pageId, page.content);
      return reply.send(analysis);
    } catch (error) {
      fastify.log.error({ error }, 'SEO analysis failed');
      return reply.status(500).send({
        error: 'ANALYSIS_FAILED',
        message: 'Failed to analyze page for SEO',
      });
    }
  });

  // Get SEO analysis for a page
  fastify.get<{
    Params: { pageId: string };
  }>('/analysis/:pageId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          pageId: { type: 'string', format: 'uuid' },
        },
        required: ['pageId'],
      },
      response: {
        200: SEOAnalysisSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { pageId } = request.params;

      const analysis = await seoService.getPageAnalysis(pageId);
      
      if (!analysis) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'No SEO analysis found for this page',
        });
      }

      return reply.send(analysis);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get SEO analysis');
      return reply.status(500).send({
        error: 'FETCH_FAILED',
        message: 'Failed to retrieve SEO analysis',
      });
    }
  });

  // Generate meta tags for a page
  fastify.post<{
    Body: z.infer<typeof GenerateMetaTagsRequestSchema>;
  }>('/meta-tags', {
    schema: {
      body: GenerateMetaTagsRequestSchema,
      response: {
        200: MetaTagsSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { pageId, baseUrl } = request.body;

      // Get page data
      const [page] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, pageId))
        .limit(1);

      if (!page) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Page not found',
        });
      }

      const effectiveBaseUrl = baseUrl || process.env.BASE_URL || 'http://localhost:3000';
      const metaTags = seoService.generateMetaTags(page, effectiveBaseUrl);

      return reply.send(metaTags);
    } catch (error) {
      fastify.log.error({ error }, 'Meta tags generation failed');
      return reply.status(500).send({
        error: 'GENERATION_FAILED',
        message: 'Failed to generate meta tags',
      });
    }
  });

  // Generate structured data for a page
  fastify.post<{
    Body: z.infer<typeof GenerateStructuredDataRequestSchema>;
  }>('/structured-data', {
    schema: {
      body: GenerateStructuredDataRequestSchema,
      response: {
        200: StructuredDataSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { pageId, contentType } = request.body;

      // Get page data
      const [page] = await db
        .select()
        .from(pages)
        .where(eq(pages.id, pageId))
        .limit(1);

      if (!page) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Page not found',
        });
      }

      const structuredData = seoService.generateStructuredData(page, contentType);
      return reply.send(structuredData);
    } catch (error) {
      fastify.log.error({ error }, 'Structured data generation failed');
      return reply.status(500).send({
        error: 'GENERATION_FAILED',
        message: 'Failed to generate structured data',
      });
    }
  });

  // Create URL redirect
  fastify.post<{
    Body: z.infer<typeof CreateRedirectRequestSchema>;
  }>('/redirects', {
    schema: {
      body: CreateRedirectRequestSchema,
      response: {
        201: URLRedirectSchema,
        409: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { fromUrl, toUrl, statusCode } = request.body;

      const redirect = await urlService.createRedirect(fromUrl, toUrl, statusCode);
      return reply.status(201).send(redirect);
    } catch (error) {
      if (error instanceof Error && error.message === 'Redirect already exists for this URL') {
        return reply.status(409).send({
          error: 'REDIRECT_EXISTS',
          message: error.message,
        });
      }

      fastify.log.error({ error }, 'Redirect creation failed');
      return reply.status(500).send({
        error: 'CREATION_FAILED',
        message: 'Failed to create redirect',
      });
    }
  });

  // Get all redirects
  fastify.get('/redirects', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: URLRedirectSchema,
        },
      },
    },
  }, async (_request, reply) => {
    try {
      const redirects = await urlService.getRedirects();
      return reply.send(redirects);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get redirects');
      return reply.status(500).send({
        error: 'FETCH_FAILED',
        message: 'Failed to retrieve redirects',
      });
    }
  });

  // Update redirect
  fastify.put<{
    Params: { redirectId: string };
    Body: z.infer<typeof UpdateRedirectRequestSchema>;
  }>('/redirects/:redirectId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          redirectId: { type: 'string', format: 'uuid' },
        },
        required: ['redirectId'],
      },
      body: UpdateRedirectRequestSchema,
      response: {
        200: URLRedirectSchema,
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { redirectId } = request.params;
      const updates = request.body;

      const filteredUpdates = {
        ...(updates.toUrl && { toUrl: updates.toUrl }),
        ...(updates.statusCode && { statusCode: updates.statusCode }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
      };
      
      const redirect = await urlService.updateRedirect(redirectId, filteredUpdates);

      if (!redirect) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Redirect not found',
        });
      }

      return reply.send(redirect);
    } catch (error) {
      fastify.log.error({ error }, 'Redirect update failed');
      return reply.status(500).send({
        error: 'UPDATE_FAILED',
        message: 'Failed to update redirect',
      });
    }
  });

  // Delete redirect
  fastify.delete<{
    Params: { redirectId: string };
  }>('/redirects/:redirectId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          redirectId: { type: 'string', format: 'uuid' },
        },
        required: ['redirectId'],
      },
      response: {
        204: { type: 'null' },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { redirectId } = request.params;

      const deleted = await urlService.deleteRedirect(redirectId);

      if (!deleted) {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Redirect not found',
        });
      }

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error({ error }, 'Redirect deletion failed');
      return reply.status(500).send({
        error: 'DELETION_FAILED',
        message: 'Failed to delete redirect',
      });
    }
  });

  // Validate URL slug
  fastify.post<{
    Body: z.infer<typeof ValidateSlugRequestSchema>;
  }>('/validate-slug', {
    schema: {
      body: ValidateSlugRequestSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean' },
            conflicts: { type: 'array', items: { type: 'string' } },
            suggestions: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { slug, pageId } = request.body;
      const validation = await urlService.validateSlug(slug, pageId);
      return reply.send(validation);
    } catch (error) {
      fastify.log.error({ error }, 'Slug validation failed');
      return reply.status(500).send({
        error: 'VALIDATION_FAILED',
        message: 'Failed to validate slug',
      });
    }
  });

  // Generate slug from title
  fastify.post<{
    Body: z.infer<typeof GenerateSlugRequestSchema>;
  }>('/generate-slug', {
    schema: {
      body: GenerateSlugRequestSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { title } = request.body;
      const slug = urlService.generateSlugFromTitle(title);
      return reply.send({ slug });
    } catch (error) {
      fastify.log.error({ error }, 'Slug generation failed');
      return reply.status(500).send({
        error: 'GENERATION_FAILED',
        message: 'Failed to generate slug',
      });
    }
  });

  // Generate robots.txt
  fastify.post<{
    Body: z.infer<typeof GenerateRobotsRequestSchema>;
  }>('/robots', {
    schema: {
      body: GenerateRobotsRequestSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            content: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { baseUrl, allowAll, disallowPatterns, customRules } = request.body;
      const robotsTxt = await urlService.generateRobotsTxt(baseUrl, {
        allowAll,
        disallowPatterns,
        customRules,
      });
      return reply.send({ content: robotsTxt });
    } catch (error) {
      fastify.log.error({ error }, 'Robots.txt generation failed');
      return reply.status(500).send({
        error: 'GENERATION_FAILED',
        message: 'Failed to generate robots.txt',
      });
    }
  });

  // Generate sitemap
  fastify.post<{
    Body: z.infer<typeof GenerateSitemapRequestSchema>;
  }>('/sitemap', {
    schema: {
      body: GenerateSitemapRequestSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            xml: { type: 'string' },
            entries: { type: 'number' },
            generatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { baseUrl, includeLastModified, includePriority, includeChangeFreq, excludePatterns } = request.body;

      const xml = await urlService.generateSitemap({
        baseUrl,
        includeLastModified,
        includePriority,
        includeChangeFreq,
        excludePatterns,
      });

      // Count entries by parsing XML (simple approach)
      const entryCount = (xml.match(/<url>/g) || []).length;

      return reply.send({
        xml,
        entries: entryCount,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error({ error }, 'Sitemap generation failed');
      return reply.status(500).send({
        error: 'GENERATION_FAILED',
        message: 'Failed to generate sitemap',
      });
    }
  });

  // Get sitemap entries
  fastify.get('/sitemap/entries', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              url: { type: 'string' },
              lastModified: { type: 'string', format: 'date-time' },
              changeFrequency: { type: 'string' },
              priority: { type: 'number' },
              isActive: { type: 'boolean' },
              pageId: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    try {
      const entries = await db
        .select()
        .from(sitemapEntries)
        .where(eq(sitemapEntries.isActive, true))
        .orderBy(desc(sitemapEntries.lastModified));

      const formattedEntries = entries.map(entry => ({
        id: entry.id,
        url: entry.url,
        lastModified: entry.lastModified.toISOString(),
        changeFrequency: entry.changeFrequency,
        priority: entry.priority ? entry.priority / 100 : undefined, // Convert back to 0.0-1.0
        isActive: entry.isActive,
        pageId: entry.pageId,
      }));

      return reply.send(formattedEntries);
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get sitemap entries');
      return reply.status(500).send({
        error: 'FETCH_FAILED',
        message: 'Failed to retrieve sitemap entries',
      });
    }
  });
};

export default seoRoutes;