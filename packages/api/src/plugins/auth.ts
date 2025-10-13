import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  UnauthorizedError,
  ForbiddenError,
  TokenExpiredError,
} from '@oldworldcharm/shared';

// JWT payload interface
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

declare module '@fastify/session' {
  interface FastifySessionObject {
    userId?: string;
    email?: string;
    role?: string;
    loginAt?: Date;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  // Register JWT plugin
  await fastify.register(jwt, {
    secret:
      process.env.JWT_SECRET ||
      'your-super-secret-jwt-key-change-in-production',
    sign: {
      algorithm: 'HS256',
      expiresIn: '24h',
    },
    verify: {
      algorithms: ['HS256'],
    },
    cookie: {
      cookieName: 'auth-token',
      signed: false,
    },
  });

  // Register cookie plugin
  await fastify.register(cookie, {
    secret:
      process.env.COOKIE_SECRET ||
      'your-super-secret-cookie-key-change-in-production',
    hook: 'onRequest',
  });

  // Register session plugin
  await fastify.register(session, {
    secret:
      process.env.SESSION_SECRET ||
      'your-super-secret-session-key-change-in-production',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict',
    },
    // Using memory store for development (not suitable for production)
  });

  // Authentication decorator
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        // Try to verify JWT from cookie first, then from Authorization header
        let token: string | undefined;

        if (request.cookies['auth-token']) {
          token = request.cookies['auth-token'];
        } else if (request.headers.authorization) {
          const authHeader = request.headers.authorization;
          if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          }
        }

        if (!token) {
          throw new UnauthorizedError('Authentication token required');
        }

        try {
          const decoded = fastify.jwt.verify(token) as JWTPayload;
          request.user = decoded;

          // Update session data
          request.session.userId = decoded.userId;
          request.session.email = decoded.email;
          request.session.role = decoded.role;
        } catch (jwtError: any) {
          if (jwtError.message.includes('expired')) {
            throw new TokenExpiredError();
          }
          throw new UnauthorizedError('Invalid authentication token');
        }
      } catch (error) {
        reply.code(
          error instanceof UnauthorizedError ||
            error instanceof TokenExpiredError
            ? 401
            : 500
        );
        throw error;
      }
    }
  );

  // Authorization decorator for role-based access
  fastify.decorate('authorize', function (allowedRoles: string[]) {
    return async function (request: FastifyRequest, _reply: FastifyReply) {
      if (!request.user) {
        throw new UnauthorizedError('Authentication required');
      }

      if (!allowedRoles.includes(request.user.role)) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`
        );
      }
    };
  });

  // Helper to generate JWT token
  fastify.decorate(
    'generateToken',
    function (payload: Omit<JWTPayload, 'iat' | 'exp'>) {
      return fastify.jwt.sign(payload);
    }
  );

  // Helper to set auth cookie
  fastify.decorate(
    'setAuthCookie',
    function (reply: FastifyReply, token: string) {
      reply.setCookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });
    }
  );

  // Helper to clear auth cookie
  fastify.decorate('clearAuthCookie', function (reply: FastifyReply) {
    reply.clearCookie('auth-token', {
      path: '/',
    });
  });
}

// Extend Fastify instance type
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authorize: (
      allowedRoles: string[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    generateToken: (payload: Omit<JWTPayload, 'iat' | 'exp'>) => string;
    setAuthCookie: (reply: FastifyReply, token: string) => void;
    clearAuthCookie: (reply: FastifyReply) => void;
  }
}

export default fp(authPlugin, {
  name: 'auth',
  dependencies: [],
});
