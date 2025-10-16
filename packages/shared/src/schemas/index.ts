// Zod validation schemas for type-safe runtime validation
import { z } from 'zod';

// Component System Schemas
export const ComponentMetadataSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  previewImage: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  isContainer: z.boolean().default(false),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format'),
});

export const ComponentCategorySchema = z.enum([
  'layout',
  'typography',
  'forms',
  'navigation',
  'media',
  'feedback',
  'data-display',
  'overlay',
]);

const BaseComponentInstanceSchema = z.object({
  id: z.string().min(1, 'Component ID is required'),
  type: z.string().min(1, 'Component type is required'),
  props: z.record(z.unknown()).default({}),
  metadata: ComponentMetadataSchema.optional(),
});

export const ComponentInstanceSchema: z.ZodType<any> =
  BaseComponentInstanceSchema.extend({
    children: z.array(z.lazy(() => ComponentInstanceSchema)).optional(),
  });

export const ComponentDefinitionSchema = z.object({
  id: z.string().min(1, 'Component ID is required'),
  type: z.string().min(1, 'Component type is required'),
  displayName: z.string().min(1, 'Display name is required'),
  category: ComponentCategorySchema,
  component: z.string().min(1, 'Component path is required'),
  defaultProps: z.record(z.unknown()).default({}),
  propSchema: z.record(z.unknown()).default({}),
  styleSchema: z.record(z.unknown()).optional(),
  metadata: ComponentMetadataSchema,
});

// Theme System Schemas
export const ThemeColorsSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  neutral: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  base: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  info: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  success: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  warning: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  error: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  foreground: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  muted: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  'muted-foreground': z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  popover: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  'popover-foreground': z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  card: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  'card-foreground': z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  border: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  input: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
  ring: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color'),
});

export const ThemeTypographySchema = z.object({
  fontFamily: z.string().min(1, 'Font family is required'),
  headingFont: z.string().optional(),
  fontSize: z.record(z.string()).default({}),
  fontWeight: z.record(z.number().min(100).max(900)).default({}),
  lineHeight: z.record(z.string()).default({}),
  letterSpacing: z.record(z.string()).optional(),
});

export const ThemeSchema = z.object({
  id: z.string().min(1, 'Theme ID is required'),
  name: z
    .string()
    .min(1, 'Theme name is required')
    .max(100, 'Theme name too long'),
  colors: ThemeColorsSchema,
  typography: ThemeTypographySchema,
  spacing: z.record(z.string()).default({}),
  borderRadius: z.record(z.string()).default({}),
  shadows: z.record(z.string()).default({}),
  isDefault: z.boolean().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Page and Content Schemas
export const PageStatusSchema = z.enum(['draft', 'published', 'archived']);

export const SEODataSchema = z.object({
  metaTitle: z
    .string()
    .max(60, 'Meta title should be under 60 characters')
    .optional(),
  metaDescription: z
    .string()
    .max(160, 'Meta description should be under 160 characters')
    .optional(),
  keywords: z.array(z.string()).optional(),
  ogTitle: z
    .string()
    .max(60, 'OG title should be under 60 characters')
    .optional(),
  ogDescription: z
    .string()
    .max(160, 'OG description should be under 160 characters')
    .optional(),
  ogImage: z.string().url('Invalid OG image URL').optional(),
  twitterCard: z
    .enum(['summary', 'summary_large_image', 'app', 'player'])
    .optional(),
  twitterTitle: z
    .string()
    .max(60, 'Twitter title should be under 60 characters')
    .optional(),
  twitterDescription: z
    .string()
    .max(160, 'Twitter description should be under 160 characters')
    .optional(),
  twitterImage: z.string().url('Invalid Twitter image URL').optional(),
  canonicalUrl: z.string().url('Invalid canonical URL').optional(),
  noIndex: z.boolean().optional(),
  noFollow: z.boolean().optional(),
  structuredData: z.record(z.unknown()).optional(),
});

export const PageSchema = z.object({
  id: z.string().min(1, 'Page ID is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase with hyphens only'
    ),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  components: z.array(ComponentInstanceSchema).default([]),
  seoData: SEODataSchema.default({}),
  status: PageStatusSchema.default('draft'),
  publishedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  version: z.number().int().positive().default(1),
});

export const BlogPostSchema = PageSchema.extend({
  excerpt: z.string().max(300, 'Excerpt too long').optional(),
  featuredImage: z.string().url('Invalid featured image URL').optional(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  author: z.string().min(1, 'Author is required'),
  readingTime: z.number().int().positive().default(1),
  content: z.string().optional(),
});

// Media Management Schemas
export const MediaAssetSchema = z.object({
  id: z.string().min(1, 'Media asset ID is required'),
  filename: z.string().min(1, 'Filename is required'),
  originalName: z.string().min(1, 'Original name is required'),
  mimeType: z.string().regex(/^[a-z]+\/[a-z0-9\-+]+$/, 'Invalid MIME type'),
  size: z.number().int().positive('File size must be positive'),
  url: z.string().url('Invalid URL'),
  thumbnailUrl: z.string().url('Invalid thumbnail URL').optional(),
  alt: z.string().max(200, 'Alt text too long').optional(),
  tags: z.array(z.string()).default([]),
  folder: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MediaFolderSchema = z.object({
  id: z.string().min(1, 'Folder ID is required'),
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(100, 'Folder name too long'),
  parentId: z.string().optional(),
  path: z.string().min(1, 'Path is required'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const MediaUploadSchema = z.object({
  altText: z.string().max(200, 'Alt text too long').optional(),
  tags: z.array(z.string()).default([]),
  folder: z.string().optional(),
});

export const MediaUpdateSchema = z.object({
  altText: z.string().max(200, 'Alt text too long').optional(),
  tags: z.array(z.string()).optional(),
  folder: z.string().optional(),
});

export const MediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  mimeType: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['filename', 'size', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const BulkMediaDeleteSchema = z.object({
  ids: z.array(z.string().min(1, 'Media asset ID is required')).min(1, 'At least one ID is required'),
});

export const BulkMediaUpdateSchema = z.object({
  ids: z.array(z.string().min(1, 'Media asset ID is required')).min(1, 'At least one ID is required'),
  updates: z.object({
    tags: z.array(z.string()).optional(),
    folder: z.string().optional(),
  }),
});

// A/B Testing Schemas
export const ABTestStatusSchema = z.enum([
  'draft',
  'running',
  'paused',
  'completed',
  'archived',
]);

export const ABTestVariantSchema = z.object({
  id: z.string().min(1, 'Variant ID is required'),
  name: z
    .string()
    .min(1, 'Variant name is required')
    .max(100, 'Variant name too long'),
  components: z.array(ComponentInstanceSchema).default([]),
  trafficPercentage: z
    .number()
    .min(0)
    .max(100, 'Traffic percentage must be between 0 and 100'),
  isControl: z.boolean().default(false),
});

export const ABTestResultsSchema = z.object({
  totalVisitors: z.number().int().nonnegative(),
  conversions: z.record(z.number().int().nonnegative()),
  conversionRates: z.record(z.number().min(0).max(1)),
  statisticalSignificance: z.number().min(0).max(1),
  winner: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export const ABTestSchema = z
  .object({
    id: z.string().min(1, 'A/B test ID is required'),
    name: z
      .string()
      .min(1, 'Test name is required')
      .max(100, 'Test name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    pageId: z.string().min(1, 'Page ID is required'),
    variants: z
      .array(ABTestVariantSchema)
      .min(2, 'At least 2 variants required'),
    trafficSplit: z.record(z.number().min(0).max(100)),
    status: ABTestStatusSchema.default('draft'),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    conversionGoal: z.string().min(1, 'Conversion goal is required'),
    results: ABTestResultsSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
  })
  .refine(
    data => {
      const totalTraffic = Object.values(data.trafficSplit).reduce(
        (sum, val) => sum + val,
        0
      );
      return Math.abs(totalTraffic - 100) < 0.01; // Allow for floating point precision
    },
    { message: 'Traffic split must total 100%', path: ['trafficSplit'] }
  );

// User and Authentication Schemas
export const UserRoleSchema = z.enum(['admin', 'editor', 'author', 'viewer']);

export const NotificationSettingsSchema = z.object({
  email: z.boolean().default(true),
  push: z.boolean().default(true),
  comments: z.boolean().default(true),
  mentions: z.boolean().default(true),
  updates: z.boolean().default(false),
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().length(2, 'Language must be 2 characters').default('en'),
  timezone: z.string().min(1, 'Timezone is required').default('UTC'),
  notifications: NotificationSettingsSchema.default({}),
});

export const UserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  role: UserRoleSchema.default('viewer'),
  avatar: z.string().url('Invalid avatar URL').optional(),
  preferences: UserPreferencesSchema.default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
});

// API Response Schemas
export const APIErrorSchema = z.object({
  code: z.string().min(1, 'Error code is required'),
  message: z.string().min(1, 'Error message is required'),
  details: z.record(z.unknown()).optional(),
  field: z.string().optional(),
});

export const APIResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: APIErrorSchema.optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const PaginatedResponseSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// Build and Deployment Schemas
export const BuildOptionsSchema = z.object({
  minify: z.boolean().default(true),
  generateSitemap: z.boolean().default(true),
  optimizeImages: z.boolean().default(true),
  enablePWA: z.boolean().default(false),
  customCSS: z.string().optional(),
  customJS: z.string().optional(),
  analyticsId: z.string().optional(),
});

export const BuildConfigSchema = z.object({
  id: z.string().min(1, 'Build config ID is required'),
  pageId: z.string().min(1, 'Page ID is required'),
  theme: ThemeSchema,
  components: z.array(ComponentInstanceSchema).default([]),
  seoData: SEODataSchema.default({}),
  buildOptions: BuildOptionsSchema.default({}),
  createdAt: z.date(),
});

export const DeploymentStatusSchema = z.enum([
  'pending',
  'building',
  'deploying',
  'success',
  'failed',
]);

export const DeploymentResultSchema = z.object({
  id: z.string().min(1, 'Deployment result ID is required'),
  buildId: z.string().min(1, 'Build ID is required'),
  status: DeploymentStatusSchema,
  url: z.string().url('Invalid deployment URL').optional(),
  error: z.string().optional(),
  buildTime: z.number().nonnegative(),
  deployTime: z.number().nonnegative(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

// Validation helper functions
export const validateComponentInstance = (data: unknown) =>
  ComponentInstanceSchema.parse(data);
export const validateTheme = (data: unknown) => ThemeSchema.parse(data);
export const validatePage = (data: unknown) => PageSchema.parse(data);
export const validateBlogPost = (data: unknown) => BlogPostSchema.parse(data);
export const validateMediaAsset = (data: unknown) =>
  MediaAssetSchema.parse(data);
export const validateABTest = (data: unknown) => ABTestSchema.parse(data);
export const validateUser = (data: unknown) => UserSchema.parse(data);

// Safe validation functions that return results instead of throwing
export const safeValidateComponentInstance = (data: unknown) =>
  ComponentInstanceSchema.safeParse(data);
export const safeValidateTheme = (data: unknown) => ThemeSchema.safeParse(data);
export const safeValidatePage = (data: unknown) => PageSchema.safeParse(data);
export const safeValidateBlogPost = (data: unknown) =>
  BlogPostSchema.safeParse(data);
export const safeValidateMediaAsset = (data: unknown) =>
  MediaAssetSchema.safeParse(data);
export const safeValidateABTest = (data: unknown) =>
  ABTestSchema.safeParse(data);
export const safeValidateUser = (data: unknown) => UserSchema.safeParse(data);
// SEO Analysis and Optimization Schemas
export const SEOIssueTypeSchema = z.enum([
  'missing_title',
  'title_too_long',
  'title_too_short',
  'missing_description',
  'description_too_long',
  'description_too_short',
  'missing_h1',
  'multiple_h1',
  'missing_alt_text',
  'broken_links',
  'slow_loading_images',
  'missing_structured_data',
  'poor_keyword_density',
  'duplicate_content',
  'missing_canonical',
  'poor_url_structure',
  'missing_og_tags',
  'missing_twitter_cards',
  'low_text_content',
  'poor_heading_structure',
]);

export const SEOIssueSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const SEOIssueSchema = z.object({
  type: SEOIssueTypeSchema,
  severity: SEOIssueSeveritySchema,
  message: z.string().min(1, 'Issue message is required'),
  element: z.string().optional(), // CSS selector or element identifier
  recommendation: z.string().min(1, 'Recommendation is required'),
  impact: z.string().optional(), // Description of SEO impact
});

export const SEORecommendationSchema = z.object({
  type: z.string().min(1, 'Recommendation type is required'),
  priority: z.enum(['low', 'medium', 'high']),
  title: z.string().min(1, 'Recommendation title is required'),
  description: z.string().min(1, 'Recommendation description is required'),
  action: z.string().min(1, 'Recommended action is required'),
  estimatedImpact: z.string().optional(),
});

export const SEOAnalysisSchema = z.object({
  score: z.number().min(0).max(100, 'SEO score must be between 0 and 100'),
  issues: z.array(SEOIssueSchema).default([]),
  recommendations: z.array(SEORecommendationSchema).default([]),
  keywords: z.array(z.string()).default([]),
  readabilityScore: z.number().min(0).max(100).optional(),
  performanceScore: z.number().min(0).max(100).optional(),
  analyzedAt: z.date(),
});

export const StructuredDataTypeSchema = z.enum([
  'Article',
  'BlogPosting',
  'WebPage',
  'Organization',
  'Person',
  'Product',
  'Review',
  'Event',
  'Recipe',
  'FAQ',
  'BreadcrumbList',
]);

export const StructuredDataSchema = z.object({
  '@context': z.string().default('https://schema.org'),
  '@type': StructuredDataTypeSchema,
  name: z.string().optional(),
  headline: z.string().optional(),
  description: z.string().optional(),
  author: z.object({
    '@type': z.string().default('Person'),
    name: z.string(),
  }).optional(),
  datePublished: z.string().optional(),
  dateModified: z.string().optional(),
  image: z.string().url().optional(),
  url: z.string().url().optional(),
  publisher: z.object({
    '@type': z.string().default('Organization'),
    name: z.string(),
    logo: z.object({
      '@type': z.string().default('ImageObject'),
      url: z.string().url(),
    }).optional(),
  }).optional(),
});

export const MetaTagsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.string().optional(),
  robots: z.string().optional(),
  canonical: z.string().url().optional(),
  'og:title': z.string().optional(),
  'og:description': z.string().optional(),
  'og:image': z.string().url().optional(),
  'og:url': z.string().url().optional(),
  'og:type': z.string().optional(),
  'og:site_name': z.string().optional(),
  'twitter:card': z.string().optional(),
  'twitter:title': z.string().optional(),
  'twitter:description': z.string().optional(),
  'twitter:image': z.string().url().optional(),
  'twitter:site': z.string().optional(),
  'twitter:creator': z.string().optional(),
});

export const SitemapEntrySchema = z.object({
  url: z.string().url('Invalid URL'),
  lastModified: z.date(),
  changeFrequency: z.enum(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']).optional(),
  priority: z.number().min(0).max(1).optional(),
});

export const SitemapSchema = z.object({
  entries: z.array(SitemapEntrySchema),
  generatedAt: z.date(),
});

export const URLRedirectSchema = z.object({
  id: z.string().min(1, 'Redirect ID is required'),
  fromUrl: z.string().min(1, 'Source URL is required'),
  toUrl: z.string().url('Invalid destination URL'),
  statusCode: z.enum(['301', '302', '307', '308']).default('301'),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// SEO validation helper functions
export const validateSEOAnalysis = (data: unknown) => SEOAnalysisSchema.parse(data);
export const validateStructuredData = (data: unknown) => StructuredDataSchema.parse(data);
export const validateMetaTags = (data: unknown) => MetaTagsSchema.parse(data);
export const validateSitemap = (data: unknown) => SitemapSchema.parse(data);
export const validateURLRedirect = (data: unknown) => URLRedirectSchema.parse(data);

// Safe SEO validation functions
export const safeValidateSEOAnalysis = (data: unknown) => SEOAnalysisSchema.safeParse(data);
export const safeValidateStructuredData = (data: unknown) => StructuredDataSchema.safeParse(data);
export const safeValidateMetaTags = (data: unknown) => MetaTagsSchema.safeParse(data);
export const safeValidateSitemap = (data: unknown) => SitemapSchema.safeParse(data);
export const safeValidateURLRedirect = (data: unknown) => URLRedirectSchema.safeParse(data);