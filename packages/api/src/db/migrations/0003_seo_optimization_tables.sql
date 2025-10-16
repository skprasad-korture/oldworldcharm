-- Migration: Add SEO optimization tables
-- Created: 2024-01-01
-- Description: Add tables for SEO redirects, analysis, and sitemap management

-- SEO redirects table - manages URL redirects for SEO
CREATE TABLE IF NOT EXISTS "seo_redirects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_url" varchar(500) NOT NULL,
	"to_url" varchar(500) NOT NULL,
	"status_code" varchar(3) DEFAULT '301' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- SEO analysis results table - stores SEO analysis data for pages
CREATE TABLE IF NOT EXISTS "seo_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"readability_score" integer,
	"performance_score" integer,
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Sitemap entries table - manages sitemap generation
CREATE TABLE IF NOT EXISTS "sitemap_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" varchar(500) NOT NULL UNIQUE,
	"last_modified" timestamp NOT NULL,
	"change_frequency" varchar(20),
	"priority" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"page_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "seo_analysis" ADD CONSTRAINT "seo_analysis_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "sitemap_entries" ADD CONSTRAINT "sitemap_entries_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "seo_redirects_from_url_idx" ON "seo_redirects" ("from_url");
CREATE INDEX IF NOT EXISTS "seo_redirects_is_active_idx" ON "seo_redirects" ("is_active");
CREATE INDEX IF NOT EXISTS "seo_redirects_status_code_idx" ON "seo_redirects" ("status_code");

CREATE INDEX IF NOT EXISTS "seo_analysis_page_id_idx" ON "seo_analysis" ("page_id");
CREATE INDEX IF NOT EXISTS "seo_analysis_score_idx" ON "seo_analysis" ("score");
CREATE INDEX IF NOT EXISTS "seo_analysis_analyzed_at_idx" ON "seo_analysis" ("analyzed_at");

CREATE INDEX IF NOT EXISTS "sitemap_entries_url_idx" ON "sitemap_entries" ("url");
CREATE INDEX IF NOT EXISTS "sitemap_entries_is_active_idx" ON "sitemap_entries" ("is_active");
CREATE INDEX IF NOT EXISTS "sitemap_entries_last_modified_idx" ON "sitemap_entries" ("last_modified");
CREATE INDEX IF NOT EXISTS "sitemap_entries_page_id_idx" ON "sitemap_entries" ("page_id");