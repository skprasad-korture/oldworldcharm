import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// Auth schemas
const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// Mock user data (in production, this would come from database)
const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    password: 'password123', // In production, this would be hashed
    name: 'Admin User',
    role: 'admin',
  },
  {
    id: '2',
    email: 'editor@example.com',
    password: 'password123',
    name: 'Editor User',
    role: 'editor',
  },
];

export default async function authRoutes(fastify: FastifyInstance) {
  // Login endpoint
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['Auth'],
        summary: 'User login',
        description: 'Authenticate user and return JWT token',
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
          },
          required: ['email', 'password'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                  token: { type: 'string' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: { $ref: '#/components/schemas/Error' },
          401: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.validate({ body: LoginSchema }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password } = request.body as z.infer<typeof LoginSchema>;

      // Find user (in production, query database)
      const user = mockUsers.find(
        u => u.email === email && u.password === password
      );

      if (!user) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Generate JWT token
      const token = fastify.generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Set auth cookie
      fastify.setAuthCookie(reply, token);

      // Update session
      request.session.userId = user.id;
      request.session.email = user.email;
      request.session.role = user.role;
      request.session.loginAt = new Date();

      fastify.sendSuccess(
        reply,
        {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          token,
        },
        'Login successful'
      );
    }
  );

  // Register endpoint
  fastify.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'User registration',
        description: 'Register a new user account',
        body: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
          },
          required: ['email', 'password', 'name'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                  token: { type: 'string' },
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
      preHandler: fastify.validate({ body: RegisterSchema }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { email, password, name } = request.body as z.infer<
        typeof RegisterSchema
      >;

      // Check if user already exists
      const existingUser = mockUsers.find(u => u.email === email);
      if (existingUser) {
        return reply.code(409).send({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Create new user (in production, save to database with hashed password)
      const newUser = {
        id: String(mockUsers.length + 1),
        email,
        password, // In production, hash this password
        name,
        role: 'editor', // Default role
      };

      mockUsers.push(newUser);

      // Generate JWT token
      const token = fastify.generateToken({
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      // Set auth cookie
      fastify.setAuthCookie(reply, token);

      // Update session
      request.session.userId = newUser.id;
      request.session.email = newUser.email;
      request.session.role = newUser.role;
      request.session.loginAt = new Date();

      reply.code(201);
      fastify.sendSuccess(
        reply,
        {
          user: {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            role: newUser.role,
          },
          token,
        },
        'Registration successful'
      );
    }
  );

  // Logout endpoint
  fastify.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'User logout',
        description: 'Logout user and clear authentication',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Clear auth cookie
      fastify.clearAuthCookie(reply);

      // Clear session
      delete request.session.userId;
      delete request.session.email;
      delete request.session.role;
      delete request.session.loginAt;

      fastify.sendSuccess(reply, null, 'Logout successful');
    }
  );

  // Get current user endpoint
  fastify.get(
    '/me',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Get current user',
        description: 'Get information about the currently authenticated user',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          401: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = mockUsers.find(u => u.id === request.user!.userId);

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
        });
      }

      fastify.sendSuccess(reply, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    }
  );

  // Refresh token endpoint (placeholder for future implementation)
  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh authentication token',
        description: 'Refresh JWT token using refresh token',
        body: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string', minLength: 1 },
          },
          required: ['refreshToken'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  refreshToken: { type: 'string' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: { $ref: '#/components/schemas/Error' },
          401: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.validate({ body: RefreshTokenSchema }),
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // This is a placeholder implementation
      // In production, you would validate the refresh token and generate new tokens
      reply.code(501).send({
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Refresh token functionality not yet implemented',
        },
        timestamp: new Date().toISOString(),
      });
    }
  );
}
