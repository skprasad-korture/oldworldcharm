# Visual Website Builder API

A modern, type-safe REST API built with Fastify for the Visual Website Builder platform.

## Features

- **Fastify Server** with TypeScript and plugin architecture
- **JWT Authentication** with cookie and bearer token support
- **Session Management** with Redis support
- **Request Validation** using Zod schemas
- **OpenAPI Documentation** with Swagger UI
- **Security Middleware** (CORS, Helmet, Rate Limiting)
- **Standardized Error Handling** with custom error types
- **Health Check Endpoints** for monitoring
- **Comprehensive Logging** with Pino

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis server (optional, uses memory store in development)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Set up database
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/visual_website_builder

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
COOKIE_SECRET=your-super-secret-cookie-key-change-in-production-min-32-chars
SESSION_SECRET=your-super-secret-session-key-change-in-production-min-32-chars

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with system metrics
- `GET /ready` - Readiness probe (Kubernetes)
- `GET /live` - Liveness probe (Kubernetes)

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token (placeholder)

### Documentation
- `GET /docs` - Swagger UI documentation

## Architecture

### Plugin System

The API uses Fastify's plugin architecture for modularity:

- **Security Plugin** - CORS, Helmet, Rate Limiting
- **Auth Plugin** - JWT, Sessions, Authentication middleware
- **Validation Plugin** - Zod schema validation
- **Error Handler Plugin** - Standardized error responses
- **Swagger Plugin** - OpenAPI documentation

### Authentication

Supports multiple authentication methods:
- JWT tokens via Authorization header (`Bearer <token>`)
- JWT tokens via HTTP-only cookies
- Session-based authentication

### Error Handling

Standardized error responses with:
- Error codes and messages
- Field-level validation errors
- Request context logging
- Development vs production error details

### Validation

Type-safe request validation using Zod schemas:
- Request body validation
- Query parameter validation
- Route parameter validation
- Header validation

## Development

### Scripts

```bash
# Development
pnpm dev          # Start development server with hot reload
pnpm build        # Build for production
pnpm start        # Start production server

# Database
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database with sample data
pnpm db:reset     # Reset database (migrate + seed)
pnpm db:studio    # Open Drizzle Studio

# Testing & Quality
pnpm test         # Run tests
pnpm type-check   # TypeScript type checking
pnpm lint         # ESLint
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Run tests in watch mode (development)
pnpm test --watch
```

### Database

The API uses Drizzle ORM with PostgreSQL:

```bash
# Generate migrations after schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Seed with sample data
pnpm db:seed
```

## Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database URL
3. Set secure JWT/cookie/session secrets (min 32 characters)
4. Configure Redis for session storage
5. Set up proper CORS origins
6. Configure rate limiting as needed

### Security Considerations

- Use HTTPS in production
- Set secure cookie flags
- Configure proper CORS origins
- Use Redis for session storage
- Set up proper rate limiting
- Use environment variables for secrets
- Enable security headers via Helmet

### Health Checks

The API provides health check endpoints for monitoring:

- `/health` - Basic health status
- `/ready` - Kubernetes readiness probe
- `/live` - Kubernetes liveness probe

### Logging

Structured logging with Pino:
- Request/response logging
- Error logging with context
- Performance metrics
- Security event logging

## API Documentation

Interactive API documentation is available at `/docs` when the server is running.

The API follows OpenAPI 3.0 specification with:
- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Error response formats

## Contributing

1. Follow TypeScript strict mode
2. Add tests for new features
3. Update OpenAPI schemas
4. Follow conventional commits
5. Ensure all checks pass

## License

MIT License - see LICENSE file for details.