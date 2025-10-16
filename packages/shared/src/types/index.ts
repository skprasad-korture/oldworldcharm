// Core type definitions for the visual website builder

// Component System Types
export interface ComponentInstance {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: ComponentInstance[];
  metadata?: ComponentMetadata;
}

export interface ComponentDefinition {
  id: string;
  type: string;
  displayName: string;
  category: ComponentCategory;
  component: string; // Component name/path for dynamic import
  defaultProps: Record<string, unknown>;
  propSchema: Record<string, unknown>; // JSON Schema
  styleSchema?: Record<string, unknown>; // JSON Schema for styling
  metadata: ComponentMetadata;
}

export interface ComponentMetadata {
  description: string;
  previewImage?: string;
  tags: string[];
  isContainer: boolean;
  version: string;
}

export type ComponentCategory =
  | 'layout'
  | 'typography'
  | 'forms'
  | 'navigation'
  | 'media'
  | 'feedback'
  | 'data-display'
  | 'overlay';

// Theme System Types
export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
  base: string;
  info: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  foreground: string;
  muted: string;
  'muted-foreground': string;
  popover: string;
  'popover-foreground': string;
  card: string;
  'card-foreground': string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeTypography {
  fontFamily: string;
  headingFont?: string;
  fontSize: Record<string, string>;
  fontWeight: Record<string, number>;
  lineHeight: Record<string, string>;
  letterSpacing?: Record<string, string>;
}

// Page and Content Types
export interface Page {
  id: string;
  slug: string;
  title: string;
  description?: string;
  components: ComponentInstance[];
  seoData: SEOData;
  status: PageStatus;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type PageStatus = 'draft' | 'published' | 'archived';

export interface BlogPost extends Page {
  excerpt?: string;
  featuredImage?: string;
  categories: string[];
  tags: string[];
  author: string;
  readingTime: number;
  content?: string; // Rich text content
}

export interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  structuredData?: Record<string, unknown>;
}

// Media Management Types
export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  alt?: string;
  tags: string[];
  folder?: string;
  width?: number;
  height?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  path: string;
  createdAt: Date;
  updatedAt: Date;
}

// A/B Testing Types
export interface ABTest {
  id: string;
  name: string;
  description?: string;
  pageId: string;
  variants: ABTestVariant[];
  trafficSplit: Record<string, number>;
  status: ABTestStatus;
  startDate?: Date;
  endDate?: Date;
  conversionGoal: string;
  results?: ABTestResults;
  createdAt: Date;
  updatedAt: Date;
}

export type ABTestStatus =
  | 'draft'
  | 'running'
  | 'paused'
  | 'completed'
  | 'archived';

export interface ABTestVariant {
  id: string;
  name: string;
  components: ComponentInstance[];
  trafficPercentage: number;
  isControl: boolean;
}

export interface ABTestResults {
  totalVisitors: number;
  conversions: Record<string, number>;
  conversionRates: Record<string, number>;
  statisticalSignificance: number;
  winner?: string;
  confidence: number;
}

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export type UserRole = 'admin' | 'editor' | 'author' | 'viewer';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  comments: boolean;
  mentions: boolean;
  updates: boolean;
}

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  message?: string;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Build and Deployment Types
export interface BuildConfig {
  id: string;
  pageId: string;
  theme: Theme;
  components: ComponentInstance[];
  seoData: SEOData;
  buildOptions: BuildOptions;
  createdAt: Date;
}

export interface BuildOptions {
  minify: boolean;
  generateSitemap: boolean;
  optimizeImages: boolean;
  enablePWA: boolean;
  customCSS?: string;
  customJS?: string;
  analyticsId?: string;
}

export interface DeploymentResult {
  id: string;
  buildId: string;
  status: DeploymentStatus;
  url?: string;
  error?: string;
  buildTime: number;
  deployTime: number;
  createdAt: Date;
  completedAt?: Date;
}

export type DeploymentStatus =
  | 'pending'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed';
// SEO Analysis and Optimization Types
export interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  recommendations: SEORecommendation[];
  keywords: string[];
  readabilityScore?: number | undefined;
  performanceScore?: number | undefined;
  analyzedAt: Date;
}

export interface SEOIssue {
  type: SEOIssueType;
  severity: SEOIssueSeverity;
  message: string;
  element?: string; // CSS selector or element identifier
  recommendation: string;
  impact?: string; // Description of SEO impact
}

export type SEOIssueType =
  | 'missing_title'
  | 'title_too_long'
  | 'title_too_short'
  | 'missing_description'
  | 'description_too_long'
  | 'description_too_short'
  | 'missing_h1'
  | 'multiple_h1'
  | 'missing_alt_text'
  | 'broken_links'
  | 'slow_loading_images'
  | 'missing_structured_data'
  | 'poor_keyword_density'
  | 'duplicate_content'
  | 'missing_canonical'
  | 'poor_url_structure'
  | 'missing_og_tags'
  | 'missing_twitter_cards'
  | 'low_text_content'
  | 'poor_heading_structure';

export type SEOIssueSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SEORecommendation {
  type: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action: string;
  estimatedImpact?: string;
}

export interface StructuredData {
  '@context': string;
  '@type': StructuredDataType;
  name?: string;
  headline?: string;
  description?: string;
  author?: {
    '@type': string;
    name: string;
  };
  datePublished?: string;
  dateModified?: string;
  image?: string;
  url?: string;
  publisher?: {
    '@type': string;
    name: string;
    logo?: {
      '@type': string;
      url: string;
    };
  };
}

export type StructuredDataType =
  | 'Article'
  | 'BlogPosting'
  | 'WebPage'
  | 'Organization'
  | 'Person'
  | 'Product'
  | 'Review'
  | 'Event'
  | 'Recipe'
  | 'FAQ'
  | 'BreadcrumbList';

export interface MetaTags {
  title?: string;
  description?: string;
  keywords?: string;
  robots?: string;
  canonical?: string;
  'og:title'?: string;
  'og:description'?: string;
  'og:image'?: string;
  'og:url'?: string;
  'og:type'?: string;
  'og:site_name'?: string;
  'twitter:card'?: string;
  'twitter:title'?: string;
  'twitter:description'?: string;
  'twitter:image'?: string;
  'twitter:site'?: string;
  'twitter:creator'?: string;
}

export interface SitemapEntry {
  url: string;
  lastModified: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface Sitemap {
  entries: SitemapEntry[];
  generatedAt: Date;
}

export interface URLRedirect {
  id: string;
  fromUrl: string;
  toUrl: string;
  statusCode: '301' | '302' | '307' | '308';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}