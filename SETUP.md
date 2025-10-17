# Old World Charm - Quick Setup Guide

This guide will get your visual website builder up and running in minutes.

## Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose (recommended)
- Or PostgreSQL and Redis running locally

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Database Services

**Option A: Using Docker (Recommended)**
```bash
docker-compose up -d postgres redis
```

**Option B: Local Services**
- Start PostgreSQL on port 5432
- Start Redis on port 6379
- Create database: `oldworldcharm`

### 3. Setup Database

```bash
pnpm db:setup
```

This will:
- Test database connection
- Generate and run migrations
- Seed initial data

### 4. Start the Application

**Option A: Start Both (Recommended)**
```bash
pnpm dev
```

**Option B: Start Individually**
```bash
# Terminal 1 - API Server
pnpm dev:api

# Terminal 2 - Visual Editor  
pnpm dev:editor
```

### 5. Open the Visual Editor

Visit: http://localhost:5173

## What You Can Do

✅ **Visual Page Builder**
- Drag & drop components
- Real-time preview
- Component properties editing
- Responsive design tools

✅ **Content Management**
- Create and edit pages
- Blog post management
- Media library
- SEO optimization

✅ **Advanced Features**
- A/B testing
- Analytics integration
- Template system
- Theme customization

## Troubleshooting

### Database Connection Issues

```bash
# Test connections
pnpm db:test

# Reset database (from packages/api)
cd packages/api && pnpm db:reset

# Check Docker services
docker-compose ps
```

### Port Conflicts

- API Server: http://localhost:3000
- Visual Editor: http://localhost:5173
- PostgreSQL: localhost:5433 (Docker) or 5432 (local)
- Redis: localhost:6379

### Common Issues

1. **"Migration timeout"** - Restart PostgreSQL: `docker-compose restart postgres`
2. **"Port already in use"** - Kill processes or change ports in config
3. **"Connection refused"** - Ensure Docker services are running

## Development

### Database Management

```bash
# Generate new migration
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed data
pnpm db:seed

# Open database studio
pnpm db:studio
```

### Testing

```bash
# Run API tests
cd packages/api
pnpm test

# Run editor tests
cd packages/editor
pnpm test
```

## Architecture

```
packages/
├── api/          # Fastify backend server
├── editor/       # React visual editor
└── shared/       # Shared types and utilities
```

The visual editor communicates with the API to save/load pages, manage media, and handle all content operations.

## Next Steps

1. Create your first page in the visual editor
2. Explore the component palette
3. Set up themes and templates
4. Configure SEO settings
5. Deploy to production

Happy building! 🚀