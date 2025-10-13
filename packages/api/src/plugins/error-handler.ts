import fp from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ErrorHandler, AppError } from '@oldworldcharm/shared';

async function errorHandlerPlugin(fastify: FastifyInstance) {
  // Global error handler
  fastify.setErrorHandler(async (error: any, request: FastifyRequest, reply: FastifyReply) => {
    // Log the error
    ErrorHandler.log(error, {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      userId: request.user?.userId,
    });

    // Handle different types of errors
    if (ErrorHandler.isAppError(error)) {
      const appError = error as AppError;
      
      reply.code(appError.statusCode).send({
        success: false,
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
        timestamp: appError.timestamp.toISOString(),
      });
      return;
    }

    // Handle Fastify validation errors
    if (error.validation) {
      reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: {
            validation: error.validation,
            validationContext: error.validationContext,
          },
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Handle other Fastify errors
    if (error.statusCode) {
      reply.code(error.statusCode).send({
        success: false,
        error: {
          code: error.code || 'FASTIFY_ERROR',
          message: error.message,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Handle unknown errors
    const normalizedError = ErrorHandler.normalize(error);
    reply.code(normalizedError.statusCode).send({
      success: false,
      error: {
        code: normalizedError.code,
        message: process.env.NODE_ENV === 'production' 
          ? 'An internal server error occurred' 
          : normalizedError.message,
        ...(process.env.NODE_ENV !== 'production' && { 
          details: normalizedError.details,
          stack: normalizedError.stack,
        }),
      },
      timestamp: normalizedError.timestamp.toISOString(),
    });
  });

  // Not found handler
  fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Helper to send success response
  fastify.decorate('sendSuccess', function(reply: FastifyReply, data?: unknown, message?: string) {
    reply.send({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    });
  });

  // Helper to send error response
  fastify.decorate('sendError', function(reply: FastifyReply, error: Error | AppError, statusCode?: number) {
    const normalizedError = ErrorHandler.normalize(error);
    const code = statusCode || normalizedError.statusCode;
    
    reply.code(code).send({
      success: false,
      error: {
        code: normalizedError.code,
        message: normalizedError.message,
        details: normalizedError.details,
      },
      timestamp: normalizedError.timestamp.toISOString(),
    });
  });
}

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    sendSuccess: (reply: FastifyReply, data?: unknown, message?: string) => void;
    sendError: (reply: FastifyReply, error: Error | AppError, statusCode?: number) => void;
  }
}

export default fp(errorHandlerPlugin, {
  name: 'error-handler',
  dependencies: [],
});