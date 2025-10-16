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
CREATE INDEX IF NOT EXISTS "content_templates_name_idx" ON "content_templates" ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_type_idx" ON "content_templates" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_category_idx" ON "content_templates" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_is_public_idx" ON "content_templates" ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_created_by_idx" ON "content_templates" ("created_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "content_templates_usage_count_idx" ON "content_templates" ("usage_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_versions_page_id_idx" ON "page_versions" ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_versions_version_idx" ON "page_versions" ("version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_versions_page_version_idx" ON "page_versions" ("page_id","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_versions_created_at_idx" ON "page_versions" ("created_at");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
