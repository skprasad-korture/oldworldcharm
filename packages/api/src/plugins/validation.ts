import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError, ErrorHandler } from '@oldworldcharm/shared';

// Validation options
interface ValidationOptions {
  body?: ZodSchema;
  querystring?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

async function validationPlugin(fastify: FastifyInstance) {
  // Validation decorator
  fastify.decorate('validate', function (schemas: ValidationOptions) {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        // Validate request body
        if (schemas.body && request.body !== undefined) {
          try {
            request.body = schemas.body.parse(request.body);
          } catch (error) {
            if (error instanceof ZodError) {
              throw ErrorHandler.fromZodError(
                error,
                'Request body validation failed'
              );
            }
            throw new ValidationError('Invalid request body');
          }
        }

        // Validate query parameters
        if (schemas.querystring && request.query !== undefined) {
          try {
            request.query = schemas.querystring.parse(request.query);
          } catch (error) {
            if (error instanceof ZodError) {
              throw ErrorHandler.fromZodError(
                error,
                'Query parameters validation failed'
              );
            }
            throw new ValidationError('Invalid query parameters');
          }
        }

        // Validate route parameters
        if (schemas.params && request.params !== undefined) {
          try {
            request.params = schemas.params.parse(request.params);
          } catch (error) {
            if (error instanceof ZodError) {
              throw ErrorHandler.fromZodError(
                error,
                'Route parameters validation failed'
              );
            }
            throw new ValidationError('Invalid route parameters');
          }
        }

        // Validate headers
        if (schemas.headers && request.headers !== undefined) {
          try {
            // Only validate specified headers, not all headers
            const headersToValidate: Record<string, unknown> = {};

            // Get schema keys - this is a simplified approach
            // In production, you might want to use a more robust method
            const schemaKeys = Object.keys(
              (schemas.headers as any)._def?.shape || {}
            );

            for (const key of schemaKeys) {
              if (request.headers[key] !== undefined) {
                headersToValidate[key] = request.headers[key];
              }
            }

            schemas.headers.parse(headersToValidate);
          } catch (error) {
            if (error instanceof ZodError) {
              throw ErrorHandler.fromZodError(
                error,
                'Headers validation failed'
              );
            }
            throw new ValidationError('Invalid headers');
          }
        }
      } catch (error) {
        reply.code(400);
        throw error;
      }
    };
  });

  // Helper to create Fastify JSON schema from Zod schema
  fastify.decorate('zodToJsonSchema', function (_zodSchema: ZodSchema): Record<
    string,
    unknown
  > {
    // This is a simplified conversion - in production you might want to use a library like zod-to-json-schema
    return {
      type: 'object',
      additionalProperties: true,
    };
  });

  // Prevalidation hook for automatic validation
  fastify.addHook('preValidation', async (_request, _reply) => {
    // This hook can be used for global validation logic if needed
    // For now, we'll rely on route-specific validation
  });
}

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    validate: (
      schemas: ValidationOptions
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    zodToJsonSchema: (zodSchema: ZodSchema) => Record<string, unknown>;
  }
}

export default fp(validationPlugin, {
  name: 'validation',
  dependencies: [],
});
