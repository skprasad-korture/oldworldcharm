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
CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blog_post_id" uuid NOT NULL,
	"parent_id" uuid,
	"author_name" varchar(255) NOT NULL,
	"author_email" varchar(255) NOT NULL,
	"author_website" varchar(500),
	"content" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) NOT NULL,
	"category" varchar(100),
	"content" jsonb NOT NULL,
	"preview_image" varchar(500),
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_by" varchar(255),
	"usage_count" integer DEFAULT 0 NOT NULL,
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
CREATE TABLE IF NOT EXISTS "page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"content" jsonb NOT NULL,
	"seo_data" jsonb,
	"status" varchar(20) NOT NULL,
	"published_at" timestamp,
	"created_by" varchar(255),
	"change_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rss_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"link" varchar(500) NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"categories" jsonb DEFAULT '[]' NOT NULL,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"max_items" integer DEFAULT 20 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blog_post_id" uuid NOT NULL,
	"platform" varchar(50) NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "seo_analysis" ALTER COLUMN "issues" SET DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "seo_analysis" ALTER COLUMN "recommendations" SET DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "seo_analysis" ALTER COLUMN "keywords" SET DEFAULT '[]';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_results_test_id_idx" ON "ab_test_results" ("test_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_results_variant_id_idx" ON "ab_test_results" ("variant_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_results_session_id_idx" ON "ab_test_results" ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_test_results_converted_idx" ON "ab_test_results" ("converted");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_page_id_idx" ON "ab_tests" ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_status_idx" ON "ab_tests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ab_tests_start_date_idx" ON "ab_tests" ("start_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_page_id_idx" ON "blog_posts" ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "blog_posts_author_idx" ON "blog_posts" ("author");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_blog_post_id_idx" ON "comments" ("blog_post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_parent_id_idx" ON "comments" ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_status_idx" ON "comments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_created_at_idx" ON "comments" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_author_email_idx" ON "comments" ("author_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_name_idx" ON "content_templates" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_type_idx" ON "content_templates" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_category_idx" ON "content_templates" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_is_public_idx" ON "content_templates" ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_created_by_idx" ON "content_templates" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_usage_count_idx" ON "content_templates" ("usage_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_filename_idx" ON "media_assets" ("filename");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_mime_type_idx" ON "media_assets" ("mime_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_folder_idx" ON "media_assets" ("folder");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "media_assets_created_at_idx" ON "media_assets" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_versions_page_id_idx" ON "page_versions" ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_versions_version_idx" ON "page_versions" ("version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_versions_page_version_idx" ON "page_versions" ("page_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_versions_created_at_idx" ON "page_versions" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rss_feeds_is_active_idx" ON "rss_feeds" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_blog_post_id_idx" ON "social_shares" ("blog_post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_platform_idx" ON "social_shares" ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_blog_post_platform_idx" ON "social_shares" ("blog_post_id","platform");--> statement-breakpoint
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
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_blog_post_id_pages_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_blog_post_id_pages_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
