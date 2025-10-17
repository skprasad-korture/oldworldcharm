import { FastifyPluginAsync } from 'fastify';
import { ABTestService } from '../services/ab-test-service.js';
import type { ABTest } from '@shared/types';

const abTestRoutes: FastifyPluginAsync = async (fastify) => {
  // Schema definitions for request/response validation
  const abTestSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      pageId: { type: 'string' },
      variants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            components: { type: 'array' },
            trafficPercentage: { type: 'number' },
            isControl: { type: 'boolean' },
          },
          required: ['id', 'name', 'components', 'trafficPercentage', 'isControl'],
        },
      },
      trafficSplit: { type: 'object' },
      status: { 
        type: 'string',
        enum: ['draft', 'running', 'paused', 'completed', 'archived']
      },
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
      conversionGoal: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
    required: ['name', 'pageId', 'variants', 'trafficSplit'],
  };

  const createTestSchema = {
    body: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1 },
        description: { type: 'string' },
        pageId: { type: 'string', minLength: 1 },
        variants: {
          type: 'array',
          minItems: 2,
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              components: { type: 'array' },
              trafficPercentage: { type: 'number', minimum: 0, maximum: 100 },
              isControl: { type: 'boolean' },
            },
            required: ['id', 'name', 'components', 'trafficPercentage', 'isControl'],
          },
        },
        trafficSplit: { 
          type: 'object',
          additionalProperties: { type: 'number', minimum: 0, maximum: 100 }
        },
        conversionGoal: { type: 'string' },
        startDate: { type: 'string', format: 'date-time' },
        endDate: { type: 'string', format: 'date-time' },
      },
      required: ['name', 'pageId', 'variants', 'trafficSplit'],
    },
    response: {
      201: abTestSchema,
    },
  };

  // Create A/B test
  fastify.post<{
    Body: Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>;
  }>('/ab-tests', { schema: createTestSchema }, async (request, reply) => {
    try {
      const test = await ABTestService.createTest(request.body);
      return reply.code(201).send(test);
    } catch (error) {
      fastify.log.error({ error }, 'Error creating A/B test');
      return reply.code(400).send({
        error: 'Failed to create A/B test',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get all A/B tests with optional filtering
  fastify.get<{
    Querystring: {
      status?: string;
      pageId?: string;
      limit?: number;
      offset?: number;
    };
  }>('/ab-tests', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          pageId: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'number', minimum: 0, default: 0 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            tests: { type: 'array', items: abTestSchema },
            total: { type: 'number' },
            page: { type: 'number' },
            pageSize: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { status, pageId, limit = 50, offset = 0 } = request.query;
      const filters: { status?: string; pageId?: string; limit?: number; offset?: number } = {
        limit,
        offset,
      };
      if (status) filters.status = status;
      if (pageId) filters.pageId = pageId;
      
      const { tests, total } = await ABTestService.getAllTests(filters);

      const totalPages = Math.ceil(total / limit);
      const page = Math.floor(offset / limit) + 1;

      return reply.send({
        tests,
        total,
        page,
        pageSize: limit,
        totalPages,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching A/B tests');
      return reply.code(500).send({
        error: 'Failed to fetch A/B tests',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get A/B test by ID
  fastify.get<{
    Params: { testId: string };
  }>('/ab-tests/:testId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      response: {
        200: abTestSchema,
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
      const test = await ABTestService.getTestById(request.params.testId);
      
      if (!test) {
        reply.code(404).send({
          error: 'Not found',
          message: 'A/B test not found',
        });
        return;
      }

      reply.send(test);
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching A/B test');
      reply.code(500).send({
        error: 'Failed to fetch A/B test',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Update A/B test
  fastify.put<{
    Params: { testId: string };
    Body: Partial<Omit<ABTest, 'id' | 'createdAt' | 'updatedAt'>>;
  }>('/ab-tests/:testId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          variants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                components: { type: 'array' },
                trafficPercentage: { type: 'number' },
                isControl: { type: 'boolean' },
              },
            },
          },
          trafficSplit: { type: 'object' },
          status: { 
            type: 'string',
            enum: ['draft', 'running', 'paused', 'completed', 'archived']
          },
          conversionGoal: { type: 'string' },
          startDate: { type: 'string', format: 'date-time' },
          endDate: { type: 'string', format: 'date-time' },
        },
      },
      response: {
        200: abTestSchema,
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
      const test = await ABTestService.updateTest(request.params.testId, request.body);
      
      if (!test) {
        reply.code(404).send({
          error: 'Not found',
          message: 'A/B test not found',
        });
        return;
      }

      reply.send(test);
    } catch (error) {
      fastify.log.error({ error }, 'Error updating A/B test');
      reply.code(400).send({
        error: 'Failed to update A/B test',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Delete A/B test
  fastify.delete<{
    Params: { testId: string };
  }>('/ab-tests/:testId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
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
      const deleted = await ABTestService.deleteTest(request.params.testId);
      
      if (!deleted) {
        reply.code(404).send({
          error: 'Not found',
          message: 'A/B test not found',
        });
        return;
      }

      reply.code(204).send();
    } catch (error) {
      fastify.log.error({ error }, 'Error deleting A/B test');
      reply.code(500).send({
        error: 'Failed to delete A/B test',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Start A/B test
  fastify.post<{
    Params: { testId: string };
  }>('/ab-tests/:testId/start', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      response: {
        200: abTestSchema,
        400: {
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
      const test = await ABTestService.startTest(request.params.testId);
      reply.send(test);
    } catch (error) {
      fastify.log.error({ error }, 'Error starting A/B test');
      reply.code(400).send({
        error: 'Failed to start A/B test',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Pause A/B test
  fastify.post<{
    Params: { testId: string };
  }>('/ab-tests/:testId/pause', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      response: {
        200: abTestSchema,
        400: {
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
      const test = await ABTestService.pauseTest(request.params.testId);
      reply.send(test);
    } catch (error) {
      fastify.log.error({ error }, 'Error pausing A/B test');
      reply.code(400).send({
        error: 'Failed to pause A/B test',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Complete A/B test
  fastify.post<{
    Params: { testId: string };
  }>('/ab-tests/:testId/complete', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      response: {
        200: abTestSchema,
        400: {
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
      const test = await ABTestService.completeTest(request.params.testId);
      reply.send(test);
    } catch (error) {
      fastify.log.error({ error }, 'Error completing A/B test');
      reply.code(400).send({
        error: 'Failed to complete A/B test',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Assign user to variant (for frontend integration)
  fastify.post<{
    Params: { testId: string };
    Body: { sessionId: string };
  }>('/ab-tests/:testId/assign', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      body: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
        },
        required: ['sessionId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            variantId: { type: 'string' },
            variant: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                components: { type: 'array' },
                trafficPercentage: { type: 'number' },
                isControl: { type: 'boolean' },
              },
            },
          },
        },
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
      const assignment = await ABTestService.assignUserToVariant(
        request.params.testId,
        request.body.sessionId
      );

      if (!assignment) {
        reply.code(404).send({
          error: 'Not found',
          message: 'A/B test not found or not running',
        });
        return;
      }

      reply.send(assignment);
    } catch (error) {
      fastify.log.error({ error }, 'Error assigning user to variant');
      reply.code(500).send({
        error: 'Failed to assign user to variant',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Record conversion
  fastify.post<{
    Params: { testId: string };
    Body: {
      sessionId: string;
      conversionValue?: number;
      metadata?: Record<string, unknown>;
    };
  }>('/ab-tests/:testId/convert', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      body: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          conversionValue: { type: 'number' },
          metadata: { type: 'object' },
        },
        required: ['sessionId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      await ABTestService.recordConversion(
        request.params.testId,
        request.body.sessionId,
        request.body.conversionValue,
        request.body.metadata
      );

      reply.send({
        success: true,
        message: 'Conversion recorded successfully',
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error recording conversion');
      reply.code(400).send({
        error: 'Failed to record conversion',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get A/B test results
  fastify.get<{
    Params: { testId: string };
  }>('/ab-tests/:testId/results', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalVisitors: { type: 'number' },
            conversions: { type: 'object' },
            conversionRates: { type: 'object' },
            statisticalSignificance: { type: 'number' },
            winner: { type: 'string' },
            confidence: { type: 'number' },
          },
        },
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
      const results = await ABTestService.getTestResults(request.params.testId);
      
      if (!results) {
        reply.code(404).send({
          error: 'Not found',
          message: 'A/B test not found',
        });
        return;
      }

      reply.send(results);
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching A/B test results');
      reply.code(500).send({
        error: 'Failed to fetch A/B test results',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get detailed analytics for A/B test
  fastify.get<{
    Params: { testId: string };
  }>('/ab-tests/:testId/analytics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            results: {
              type: 'object',
              properties: {
                totalVisitors: { type: 'number' },
                conversions: { type: 'object' },
                conversionRates: { type: 'object' },
                statisticalSignificance: { type: 'number' },
                winner: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
            timeline: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  variantId: { type: 'string' },
                  visitors: { type: 'number' },
                  conversions: { type: 'number' },
                },
              },
            },
            variantPerformance: { type: 'object' },
          },
        },
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
      const analytics = await ABTestService.getDetailedAnalytics(request.params.testId);
      
      if (!analytics) {
        reply.code(404).send({
          error: 'Not found',
          message: 'A/B test not found',
        });
        return;
      }

      reply.send(analytics);
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching A/B test analytics');
      reply.code(500).send({
        error: 'Failed to fetch A/B test analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get A/B test summary for dashboard
  fastify.get<{
    Params: { testId: string };
  }>('/ab-tests/:testId/summary', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            test: abTestSchema,
            status: { type: 'string' },
            duration: { type: 'number' },
            totalVisitors: { type: 'number' },
            totalConversions: { type: 'number' },
            overallConversionRate: { type: 'number' },
            winner: {
              type: 'object',
              properties: {
                variantId: { type: 'string' },
                variantName: { type: 'string' },
                improvement: { type: 'number' },
                confidence: { type: 'number' },
              },
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
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
      const summary = await ABTestService.getTestSummary(request.params.testId);
      
      if (!summary) {
        reply.code(404).send({
          error: 'Not found',
          message: 'A/B test not found',
        });
        return;
      }

      reply.send(summary);
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching A/B test summary');
      reply.code(500).send({
        error: 'Failed to fetch A/B test summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Export A/B test results
  fastify.get<{
    Params: { testId: string };
    Querystring: { format?: 'json' | 'csv' | 'xlsx' };
  }>('/ab-tests/:testId/export', {
    schema: {
      params: {
        type: 'object',
        properties: {
          testId: { type: 'string' },
        },
        required: ['testId'],
      },
      querystring: {
        type: 'object',
        properties: {
          format: {
            type: 'string',
            enum: ['json', 'csv', 'xlsx'],
            default: 'json',
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { format = 'json' } = request.query;
      const exportData = await ABTestService.exportTestResults(request.params.testId, format);
      
      reply
        .header('Content-Type', exportData.mimeType)
        .header('Content-Disposition', `attachment; filename="${exportData.filename}"`)
        .send(exportData.data);
    } catch (error) {
      fastify.log.error({ error }, 'Error exporting A/B test results');
      reply.code(500).send({
        error: 'Failed to export A/B test results',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Get A/B tests by page ID
  fastify.get<{
    Params: { pageId: string };
  }>('/pages/:pageId/ab-tests', {
    schema: {
      params: {
        type: 'object',
        properties: {
          pageId: { type: 'string' },
        },
        required: ['pageId'],
      },
      response: {
        200: {
          type: 'array',
          items: abTestSchema,
        },
      },
    },
  }, async (request, reply) => {
    try {
      const tests = await ABTestService.getTestsByPageId(request.params.pageId);
      reply.send(tests);
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching A/B tests for page');
      reply.code(500).send({
        error: 'Failed to fetch A/B tests for page',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};

export default abTestRoutes;