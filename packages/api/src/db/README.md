# Database Setup

This directory contains the database schema, migrations, and utilities for the Old World Charm visual website builder.

## Quick Start

1. **Start the database services:**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Run migrations:**
   ```bash
   pnpm db:migrate
   ```

3. **Seed the database with sample data:**
   ```bash
   pnpm db:seed
   ```

## Database Schema

### Core Tables

- **`pages`** - Stores page content and metadata
- **`blog_posts`** - Blog-specific data extending pages
- **`themes`** - Theme configurations and styling
- **`media_assets`** - Uploaded files and media metadata
- **`ab_tests`** - A/B test configurations
- **`ab_test_results`** - A/B test conversion data
- **`user_sessions`** - User session tracking

### Key Features

- **UUID Primary Keys** - All tables use UUID for better scalability
- **JSONB Storage** - Flexible content and configuration storage
- **Proper Indexing** - Optimized for common query patterns
- **Foreign Key Constraints** - Data integrity with cascade deletes
- **Timestamps** - Automatic created_at and updated_at tracking

## Available Scripts

- `pnpm db:generate` - Generate new migration files from schema changes
- `pnpm db:migrate` - Run pending migrations
- `pnpm db:seed` - Populate database with sample data
- `pnpm db:studio` - Open Drizzle Studio for database exploration
- `pnpm db:reset` - Generate, migrate, and seed (full reset)

## Redis Configuration

Redis is used for:
- **Session Management** - User session storage and tracking
- **Caching** - Page and component caching for performance
- **A/B Testing** - User variant assignments and counters

### Redis Utilities

- `SessionManager` - Session CRUD operations with TTL
- `CacheManager` - General caching with pattern invalidation
- `ABTestManager` - A/B test user assignments and metrics

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/oldworldcharm
REDIS_URL=redis://localhost:6379
```

## Development Workflow

1. **Schema Changes:**
   - Modify `schema.ts`
   - Run `pnpm db:generate` to create migration
   - Run `pnpm db:migrate` to apply changes

2. **Data Seeding:**
   - Modify `seed.ts` for new sample data
   - Run `pnpm db:seed` to populate

3. **Database Exploration:**
   - Run `pnpm db:studio` to open Drizzle Studio
   - Browse tables and data visually

## Production Considerations

- Use connection pooling for high traffic
- Set up proper backup strategies
- Configure Redis persistence
- Monitor query performance
- Set up database monitoring and alerts