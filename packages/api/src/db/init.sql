-- Initialize the database
-- This file is automatically executed when the PostgreSQL container starts

-- Create the database if it doesn't exist
-- (This is handled by POSTGRES_DB environment variable in docker-compose.yml)

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a simple health check table
CREATE TABLE IF NOT EXISTS health_check (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'ok',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO health_check (status) VALUES ('Database initialized') ON CONFLICT DO NOTHING;