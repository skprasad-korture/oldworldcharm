import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Pages table - stores page content and metadata
export const pages = pgTable(
  'pages',
  {
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
  },
  table => ({
    slugIdx: index('pages_slug_idx').on(table.slug),
    statusIdx: index('pages_status_idx').on(table.status),
    publishedAtIdx: index('pages_published_at_idx').on(table.publishedAt),
  })
);

// Blog posts extend pages with blog-specific fields
export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    excerpt: text('excerpt'),
    featuredImage: varchar('featured_image', { length: 500 }),
    categories: jsonb('categories').notNull().default('[]'), // Array of category strings
    tags: jsonb('tags').notNull().default('[]'), // Array of tag strings
    author: varchar('author', { length: 255 }).notNull(),
    readingTime: integer('reading_time').notNull().default(0), // in minutes
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    pageIdIdx: index('blog_posts_page_id_idx').on(table.pageId),
    authorIdx: index('blog_posts_author_idx').on(table.author),
  })
);

// Themes table - stores theme configurations
export const themes = pgTable(
  'themes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    config: jsonb('config').notNull(), // Theme configuration object
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    nameIdx: index('themes_name_idx').on(table.name),
    isDefaultIdx: index('themes_is_default_idx').on(table.isDefault),
  })
);

// Media assets table - stores uploaded files and their metadata
export const mediaAssets = pgTable(
  'media_assets',
  {
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
  },
  table => ({
    filenameIdx: index('media_assets_filename_idx').on(table.filename),
    mimeTypeIdx: index('media_assets_mime_type_idx').on(table.mimeType),
    folderIdx: index('media_assets_folder_idx').on(table.folder),
    createdAtIdx: index('media_assets_created_at_idx').on(table.createdAt),
  })
);

// A/B tests table - stores A/B test configurations and metadata
export const abTests = pgTable(
  'ab_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    variants: jsonb('variants').notNull(), // Array of variant configurations
    trafficSplit: jsonb('traffic_split').notNull(), // Traffic distribution configuration
    status: varchar('status', { length: 20 }).notNull().default('draft'), // draft, running, completed, paused
    startDate: timestamp('start_date'),
    endDate: timestamp('end_date'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    pageIdIdx: index('ab_tests_page_id_idx').on(table.pageId),
    statusIdx: index('ab_tests_status_idx').on(table.status),
    startDateIdx: index('ab_tests_start_date_idx').on(table.startDate),
  })
);

// A/B test results table - stores conversion data and metrics
export const abTestResults = pgTable(
  'ab_test_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testId: uuid('test_id')
      .notNull()
      .references(() => abTests.id, { onDelete: 'cascade' }),
    variantId: varchar('variant_id', { length: 255 }).notNull(),
    sessionId: varchar('session_id', { length: 255 }).notNull(),
    converted: boolean('converted').notNull().default(false),
    conversionValue: integer('conversion_value').default(0),
    metadata: jsonb('metadata'), // Additional tracking data
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    testIdIdx: index('ab_test_results_test_id_idx').on(table.testId),
    variantIdIdx: index('ab_test_results_variant_id_idx').on(table.variantId),
    sessionIdIdx: index('ab_test_results_session_id_idx').on(table.sessionId),
    convertedIdx: index('ab_test_results_converted_idx').on(table.converted),
  })
);

// User sessions table - for tracking user sessions and A/B test assignments
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
    userId: varchar('user_id', { length: 255 }), // Optional user ID for authenticated users
    testAssignments: jsonb('test_assignments').notNull().default('{}'), // A/B test variant assignments
    metadata: jsonb('metadata'), // Additional session data
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    sessionIdIdx: index('user_sessions_session_id_idx').on(table.sessionId),
    userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  })
);

// Page versions table - stores historical versions of pages for versioning and rollback
export const pageVersions = pgTable(
  'page_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    content: jsonb('content').notNull(), // Component tree structure
    seoData: jsonb('seo_data'), // SEO metadata
    status: varchar('status', { length: 20 }).notNull(),
    publishedAt: timestamp('published_at'),
    createdBy: varchar('created_by', { length: 255 }), // User ID who created this version
    changeNote: text('change_note'), // Optional note about what changed
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    pageIdIdx: index('page_versions_page_id_idx').on(table.pageId),
    versionIdx: index('page_versions_version_idx').on(table.version),
    pageVersionIdx: index('page_versions_page_version_idx').on(table.pageId, table.version),
    createdAtIdx: index('page_versions_created_at_idx').on(table.createdAt),
  })
);

// Content templates table - stores reusable page templates and blocks
export const contentTemplates = pgTable(
  'content_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(), // 'page', 'block', 'section'
    category: varchar('category', { length: 100 }), // 'landing', 'blog', 'header', 'footer', etc.
    content: jsonb('content').notNull(), // Component tree structure
    previewImage: varchar('preview_image', { length: 500 }),
    tags: jsonb('tags').notNull().default('[]'), // Array of tag strings
    isPublic: boolean('is_public').notNull().default(false), // Whether template is available to all users
    createdBy: varchar('created_by', { length: 255 }), // User ID who created the template
    usageCount: integer('usage_count').notNull().default(0), // Track how often template is used
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    nameIdx: index('content_templates_name_idx').on(table.name),
    typeIdx: index('content_templates_type_idx').on(table.type),
    categoryIdx: index('content_templates_category_idx').on(table.category),
    isPublicIdx: index('content_templates_is_public_idx').on(table.isPublic),
    createdByIdx: index('content_templates_created_by_idx').on(table.createdBy),
    usageCountIdx: index('content_templates_usage_count_idx').on(table.usageCount),
  })
);

// Define relationships between tables
export const pagesRelations = relations(pages, ({ many, one }) => ({
  blogPost: one(blogPosts, {
    fields: [pages.id],
    references: [blogPosts.pageId],
  }),
  abTests: many(abTests),
  versions: many(pageVersions),
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

export const pageVersionsRelations = relations(pageVersions, ({ one }) => ({
  page: one(pages, {
    fields: [pageVersions.pageId],
    references: [pages.id],
  }),
}));

export const contentTemplatesRelations = relations(contentTemplates, ({ }) => ({
  // Templates don't have direct relations but could be extended in the future
}));

// Comments table - stores user comments on blog posts
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blogPostId: uuid('blog_post_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id'), // For nested comments - will be set up with foreign key later
    authorName: varchar('author_name', { length: 255 }).notNull(),
    authorEmail: varchar('author_email', { length: 255 }).notNull(),
    authorWebsite: varchar('author_website', { length: 500 }),
    content: text('content').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected, spam
    ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
    userAgent: text('user_agent'),
    isVerified: boolean('is_verified').notNull().default(false), // Email verification
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    blogPostIdIdx: index('comments_blog_post_id_idx').on(table.blogPostId),
    parentIdIdx: index('comments_parent_id_idx').on(table.parentId),
    statusIdx: index('comments_status_idx').on(table.status),
    createdAtIdx: index('comments_created_at_idx').on(table.createdAt),
    authorEmailIdx: index('comments_author_email_idx').on(table.authorEmail),
  })
);

// Social shares table - tracks social media shares
export const socialShares = pgTable(
  'social_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blogPostId: uuid('blog_post_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 50 }).notNull(), // twitter, facebook, linkedin, etc.
    shareCount: integer('share_count').notNull().default(0),
    lastUpdated: timestamp('last_updated').notNull().defaultNow(),
  },
  table => ({
    blogPostIdIdx: index('social_shares_blog_post_id_idx').on(table.blogPostId),
    platformIdx: index('social_shares_platform_idx').on(table.platform),
    blogPostPlatformIdx: index('social_shares_blog_post_platform_idx').on(table.blogPostId, table.platform),
  })
);

// RSS feeds table - stores RSS feed configurations
export const rssFeeds = pgTable(
  'rss_feeds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    link: varchar('link', { length: 500 }).notNull(),
    language: varchar('language', { length: 10 }).notNull().default('en'),
    categories: jsonb('categories').notNull().default('[]'), // Array of category filters
    tags: jsonb('tags').notNull().default('[]'), // Array of tag filters
    maxItems: integer('max_items').notNull().default(20),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    isActiveIdx: index('rss_feeds_is_active_idx').on(table.isActive),
  })
);

// Define relationships for new tables
export const commentsRelations = relations(comments, ({ one, many }) => ({
  blogPost: one(pages, {
    fields: [comments.blogPostId],
    references: [pages.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'parentComment',
  }),
  replies: many(comments, {
    relationName: 'parentComment',
  }),
}));

export const socialSharesRelations = relations(socialShares, ({ one }) => ({
  blogPost: one(pages, {
    fields: [socialShares.blogPostId],
    references: [pages.id],
  }),
}));

export const rssRelations = relations(rssFeeds, ({ }) => ({
  // RSS feeds don't have direct relations but could be extended in the future
}));

// Update blog posts relations to include comments and social shares
export const blogPostsRelationsExtended = relations(blogPosts, ({ one, many }) => ({
  page: one(pages, {
    fields: [blogPosts.pageId],
    references: [pages.id],
  }),
  comments: many(comments),
  socialShares: many(socialShares),
}));

// SEO redirects table - manages URL redirects for SEO
export const seoRedirects = pgTable(
  'seo_redirects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fromUrl: varchar('from_url', { length: 500 }).notNull(),
    toUrl: varchar('to_url', { length: 500 }).notNull(),
    statusCode: varchar('status_code', { length: 3 }).notNull().default('301'), // 301, 302, 307, 308
    isActive: boolean('is_active').notNull().default(true),
    hitCount: integer('hit_count').notNull().default(0), // Track redirect usage
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    fromUrlIdx: index('seo_redirects_from_url_idx').on(table.fromUrl),
    isActiveIdx: index('seo_redirects_is_active_idx').on(table.isActive),
    statusCodeIdx: index('seo_redirects_status_code_idx').on(table.statusCode),
  })
);

// SEO analysis results table - stores SEO analysis data for pages
export const seoAnalysis = pgTable(
  'seo_analysis',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(), // SEO score 0-100
    issues: jsonb('issues').notNull().default('[]'), // Array of SEO issues
    recommendations: jsonb('recommendations').notNull().default('[]'), // Array of recommendations
    keywords: jsonb('keywords').notNull().default('[]'), // Extracted keywords
    readabilityScore: integer('readability_score'), // Readability score 0-100
    performanceScore: integer('performance_score'), // Performance score 0-100
    analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => ({
    pageIdIdx: index('seo_analysis_page_id_idx').on(table.pageId),
    scoreIdx: index('seo_analysis_score_idx').on(table.score),
    analyzedAtIdx: index('seo_analysis_analyzed_at_idx').on(table.analyzedAt),
  })
);

// Sitemap entries table - manages sitemap generation
export const sitemapEntries = pgTable(
  'sitemap_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    url: varchar('url', { length: 500 }).notNull().unique(),
    lastModified: timestamp('last_modified').notNull(),
    changeFrequency: varchar('change_frequency', { length: 20 }), // always, hourly, daily, weekly, monthly, yearly, never
    priority: integer('priority'), // 0-100 (will be converted to 0.0-1.0)
    isActive: boolean('is_active').notNull().default(true),
    pageId: uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }), // Optional reference to page
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => ({
    urlIdx: index('sitemap_entries_url_idx').on(table.url),
    isActiveIdx: index('sitemap_entries_is_active_idx').on(table.isActive),
    lastModifiedIdx: index('sitemap_entries_last_modified_idx').on(table.lastModified),
    pageIdIdx: index('sitemap_entries_page_id_idx').on(table.pageId),
  })
);

// Define relationships for SEO tables
export const seoRedirectsRelations = relations(seoRedirects, ({ }) => ({
  // Redirects don't have direct relations but could be extended
}));

export const seoAnalysisRelations = relations(seoAnalysis, ({ one }) => ({
  page: one(pages, {
    fields: [seoAnalysis.pageId],
    references: [pages.id],
  }),
}));

export const sitemapEntriesRelations = relations(sitemapEntries, ({ one }) => ({
  page: one(pages, {
    fields: [sitemapEntries.pageId],
    references: [pages.id],
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
  pageVersions,
  contentTemplates,
  comments,
  socialShares,
  rssFeeds,
  seoRedirects,
  seoAnalysis,
  sitemapEntries,
  pagesRelations,
  blogPostsRelations: blogPostsRelationsExtended,
  abTestsRelations,
  abTestResultsRelations,
  pageVersionsRelations,
  contentTemplatesRelations,
  commentsRelations,
  socialSharesRelations,
  rssRelations,
  seoRedirectsRelations,
  seoAnalysisRelations,
  sitemapEntriesRelations,
};
