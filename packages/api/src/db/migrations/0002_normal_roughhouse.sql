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
CREATE INDEX IF NOT EXISTS "comments_blog_post_id_idx" ON "comments" ("blog_post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_parent_id_idx" ON "comments" ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_status_idx" ON "comments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_created_at_idx" ON "comments" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_author_email_idx" ON "comments" ("author_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rss_feeds_is_active_idx" ON "rss_feeds" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_blog_post_id_idx" ON "social_shares" ("blog_post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_platform_idx" ON "social_shares" ("platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_shares_blog_post_platform_idx" ON "social_shares" ("blog_post_id","platform");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_blog_post_id_pages_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_blog_post_id_pages_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
