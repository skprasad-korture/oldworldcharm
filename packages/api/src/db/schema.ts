import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Pages table - stores page content and metadata
export const pages = pgTable('pages', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  content: jsonb('content').notNull(), // Component tree structure
  seoData: jsonb('seo_data'), // SEO metadata
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, published, archived
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  slugIdx: index('pages_slug_idx').on(table.slug),
  statusIdx: index('pages_status_idx').on(table.status),
  publishedAtIdx: index('pages_published_at_idx').on(table.publishedAt),
}));

// Blog posts extend pages with blog-specific fields
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  excerpt: text('excerpt'),
  featuredImage: varchar('featured_image', { length: 500 }),
  categories: jsonb('categories').notNull().default('[]'), // Array of category strings
  tags: jsonb('tags').notNull().default('[]'), // Array of tag strings
  author: varchar('author', { length: 255 }).notNull(),
  readingTime: integer('reading_time').notNull().default(0), // in minutes
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pageIdIdx: index('blog_posts_page_id_idx').on(table.pageId),
  authorIdx: index('blog_posts_author_idx').on(table.author),
}));

// Themes table - stores theme configurations
export const themes = pgTable('themes', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  config: jsonb('config').notNull(), // Theme configuration object
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  nameIdx: index('themes_name_idx').on(table.name),
  isDefaultIdx: index('themes_is_default_idx').on(table.isDefault),
}));

// Media assets table - stores uploaded files and their metadata
export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(), // File size in bytes
  url: varchar('url', { length: 500 }).notNull(),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  altText: text('alt_text'),
  tags: jsonb('tags').notNull().default('[]'), // Array of tag strings
  folder: varchar('folder', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  filenameIdx: index('media_assets_filename_idx').on(table.filename),
  mimeTypeIdx: index('media_assets_mime_type_idx').on(table.mimeType),
  folderIdx: index('media_assets_folder_idx').on(table.folder),
  createdAtIdx: index('media_assets_created_at_idx').on(table.createdAt),
}));

// A/B tests table - stores A/B test configurations and metadata
export const abTests = pgTable('ab_tests', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  pageId: uuid('page_id').notNull().references(() => pages.id, { onDelete: 'cascade' }),
  variants: jsonb('variants').notNull(), // Array of variant configurations
  trafficSplit: jsonb('traffic_split').notNull(), // Traffic distribution configuration
  status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, running, completed, paused
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  pageIdIdx: index('ab_tests_page_id_idx').on(table.pageId),
  statusIdx: index('ab_tests_status_idx').on(table.status),
  startDateIdx: index('ab_tests_start_date_idx').on(table.startDate),
}));

// A/B test results table - stores conversion data and metrics
export const abTestResults = pgTable('ab_test_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  testId: uuid('test_id').notNull().references(() => abTests.id, { onDelete: 'cascade' }),
  variantId: varchar('variant_id', { length: 255 }).notNull(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  converted: boolean('converted').notNull().default(false),
  conversionValue: integer('conversion_value').default(0),
  metadata: jsonb('metadata'), // Additional tracking data
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  testIdIdx: index('ab_test_results_test_id_idx').on(table.testId),
  variantIdIdx: index('ab_test_results_variant_id_idx').on(table.variantId),
  sessionIdIdx: index('ab_test_results_session_id_idx').on(table.sessionId),
  convertedIdx: index('ab_test_results_converted_idx').on(table.converted),
}));

// User sessions table - for tracking user sessions and A/B test assignments
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  userId: varchar('user_id', { length: 255 }), // Optional user ID for authenticated users
  testAssignments: jsonb('test_assignments').notNull().default('{}'), // A/B test variant assignments
  metadata: jsonb('metadata'), // Additional session data
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index('user_sessions_session_id_idx').on(table.sessionId),
  userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
}));

// Define relationships between tables
export const pagesRelations = relations(pages, ({ many, one }) => ({
  blogPost: one(blogPosts, {
    fields: [pages.id],
    references: [blogPosts.pageId],
  }),
  abTests: many(abTests),
}));

export const blogPostsRelations = relations(blogPosts, ({ one }) => ({
  page: one(pages, {
    fields: [blogPosts.pageId],
    references: [pages.id],
  }),
}));

export const abTestsRelations = relations(abTests, ({ one, many }) => ({
  page: one(pages, {
    fields: [abTests.pageId],
    references: [pages.id],
  }),
  results: many(abTestResults),
}));

export const abTestResultsRelations = relations(abTestResults, ({ one }) => ({
  test: one(abTests, {
    fields: [abTestResults.testId],
    references: [abTests.id],
  }),
}));

// Export all tables for use in migrations and queries
export const schema = {
  pages,
  blogPosts,
  themes,
  mediaAssets,
  abTests,
  abTestResults,
  userSessions,
  pagesRelations,
  blogPostsRelations,
  abTestsRelations,
  abTestResultsRelations,
};