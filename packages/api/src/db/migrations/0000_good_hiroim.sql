CREATE TABLE IF NOT EXISTS "ab_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"variant_id" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"converted" boolean DEFAULT false NOT NULL,
	"conversion_value" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ab_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"page_id" uuid NOT NULL,
	"variants" jsonb NOT NULL,
	"traffic_split" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"excerpt" text,
	"featured_image" varchar(500),
	"categories" jsonb DEFAULT '[]' NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"author" varchar(255) NOT NULL,
	"reading_time" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" varchar(255) NOT NULL,
	"original_name" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"url" varchar(500) NOT NULL,
	"thumbnail_url" varchar(500),
	"alt_text" text,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"folder" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"content" jsonb NOT NULL,
	"seo_data" jsonb,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"config" jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"user_id" varchar(255),
	"test_assignments" jsonb DEFAULT '{}' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_results_test_id_idx" ON "ab_test_results" ("test_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_results_variant_id_idx" ON "ab_test_results" ("variant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_results_session_id_idx" ON "ab_test_results" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_results_converted_idx" ON "ab_test_results" ("converted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_page_id_idx" ON "ab_tests" ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_status_idx" ON "ab_tests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_start_date_idx" ON "ab_tests" ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_page_id_idx" ON "blog_posts" ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_author_idx" ON "blog_posts" ("author");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_filename_idx" ON "media_assets" ("filename");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_mime_type_idx" ON "media_assets" ("mime_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_folder_idx" ON "media_assets" ("folder");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_created_at_idx" ON "media_assets" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_slug_idx" ON "pages" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_status_idx" ON "pages" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_published_at_idx" ON "pages" ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "themes_name_idx" ON "themes" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "themes_is_default_idx" ON "themes" ("is_default");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_session_id_idx" ON "user_sessions" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" ("user_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_test_id_ab_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "ab_tests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ab_tests" ADD CONSTRAINT "ab_tests_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
