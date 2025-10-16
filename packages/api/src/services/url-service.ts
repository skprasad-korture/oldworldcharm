import { db } from '../db/connection';
import { pages, seoRedirects, sitemapEntries } from '../db/schema';
import { eq, and, or, desc, ne } from 'drizzle-orm';
import type { URLRedirect, SitemapEntry } from '@oldworldcharm/shared';

interface URLValidationResult {
  isValid: boolean;
  conflicts: string[];
  suggestions: string[];
}

interface SitemapGenerationOptions {
  baseUrl: string;
  includeLastModified?: boolean;
  includePriority?: boolean;
  includeChangeFreq?: boolean;
  excludePatterns?: string[];
  customEntries?: SitemapEntry[];
}

export class URLService {
  /**
   * Validate and suggest URL slug
   */
  async validateSlug(slug: string, pageId?: string): Promise<URLValidationResult> {
    const result: URLValidationResult = {
      isValid: true,
      conflicts: [],
      suggestions: [],
    };

    // Basic slug validation
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      result.isValid = false;
      result.suggestions.push('Use only lowercase letters, numbers, and hyphens');
      result.suggestions.push('Start and end with alphanumeric characters');
      return result;
    }

    // Check for reserved words
    const reservedWords = [
      'admin', 'api', 'www', 'mail', 'ftp', 'localhost', 'test', 'staging',
      'dev', 'development', 'prod', 'production', 'app', 'blog', 'shop',
      'store', 'account', 'login', 'register', 'signup', 'signin', 'logout',
      'dashboard', 'profile', 'settings', 'config', 'help', 'support',
      'about', 'contact', 'privacy', 'terms', 'legal', 'sitemap', 'robots',
      'favicon', 'assets', 'static', 'public', 'uploads', 'images', 'css',
      'js', 'javascript', 'styles', 'fonts', 'media'
    ];

    if (reservedWords.includes(slug)) {
      result.isValid = false;
      result.conflicts.push(`"${slug}" is a reserved word`);
      result.suggestions.push(`Try "${slug}-page" or "my-${slug}"`);
      return result;
    }

    // Check for existing pages
    const existingPages = await db
      .select({ id: pages.id, slug: pages.slug })
      .from(pages)
      .where(
        and(
          eq(pages.slug, slug),
          pageId ? ne(pages.id, pageId) : undefined
        )
      );

    if (existingPages.length > 0) {
      result.isValid = false;
      result.conflicts.push(`Slug "${slug}" is already used by another page`);
      
      // Generate suggestions
      for (let i = 1; i <= 5; i++) {
        const suggestion = `${slug}-${i}`;
        const suggestionExists = await this.slugExists(suggestion, pageId);
        if (!suggestionExists) {
          result.suggestions.push(suggestion);
        }
      }
    }

    // Check for existing redirects
    const existingRedirects = await db
      .select()
      .from(seoRedirects)
      .where(
        or(
          eq(seoRedirects.fromUrl, `/${slug}`),
          eq(seoRedirects.toUrl, `/${slug}`)
        )
      );

    if (existingRedirects.length > 0) {
      result.conflicts.push(`Slug "${slug}" conflicts with existing redirects`);
    }

    return result;
  }

  /**
   * Generate URL slug from title
   */
  generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      // Replace spaces and special characters with hyphens
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Limit length
      .substring(0, 60);
  }

  /**
   * Create URL redirect
   */
  async createRedirect(
    fromUrl: string,
    toUrl: string,
    statusCode: '301' | '302' | '307' | '308' = '301'
  ): Promise<URLRedirect> {
    // Normalize URLs
    const normalizedFromUrl = this.normalizeUrl(fromUrl);
    const normalizedToUrl = this.normalizeUrl(toUrl);

    // Check if redirect already exists
    const [existing] = await db
      .select()
      .from(seoRedirects)
      .where(eq(seoRedirects.fromUrl, normalizedFromUrl))
      .limit(1);

    if (existing) {
      throw new Error('Redirect already exists for this URL');
    }

    // Create redirect
    const [redirect] = await db
      .insert(seoRedirects)
      .values({
        fromUrl: normalizedFromUrl,
        toUrl: normalizedToUrl,
        statusCode,
        isActive: true,
        hitCount: 0,
      })
      .returning();

    if (!redirect) {
      throw new Error('Failed to create redirect');
    }

    return {
      id: redirect.id,
      fromUrl: redirect.fromUrl,
      toUrl: redirect.toUrl,
      statusCode: redirect.statusCode as '301' | '302' | '307' | '308',
      isActive: redirect.isActive,
      createdAt: redirect.createdAt,
      updatedAt: redirect.updatedAt,
    };
  }

  /**
   * Update redirect
   */
  async updateRedirect(
    redirectId: string,
    updates: Partial<Pick<URLRedirect, 'toUrl' | 'statusCode' | 'isActive'>>
  ): Promise<URLRedirect | null> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.toUrl) {
      updateData.toUrl = this.normalizeUrl(updates.toUrl);
    }
    if (updates.statusCode) {
      updateData.statusCode = updates.statusCode;
    }
    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
    }

    const [redirect] = await db
      .update(seoRedirects)
      .set(updateData)
      .where(eq(seoRedirects.id, redirectId))
      .returning();

    if (!redirect) {
      return null;
    }

    return {
      id: redirect.id,
      fromUrl: redirect.fromUrl,
      toUrl: redirect.toUrl,
      statusCode: redirect.statusCode as '301' | '302' | '307' | '308',
      isActive: redirect.isActive,
      createdAt: redirect.createdAt,
      updatedAt: redirect.updatedAt,
    };
  }

  /**
   * Delete redirect
   */
  async deleteRedirect(redirectId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(seoRedirects)
      .where(eq(seoRedirects.id, redirectId))
      .returning();

    return !!deleted;
  }

  /**
   * Get all redirects
   */
  async getRedirects(): Promise<URLRedirect[]> {
    const redirects = await db
      .select()
      .from(seoRedirects)
      .orderBy(desc(seoRedirects.createdAt));

    return redirects.map(redirect => ({
      id: redirect.id,
      fromUrl: redirect.fromUrl,
      toUrl: redirect.toUrl,
      statusCode: redirect.statusCode as '301' | '302' | '307' | '308',
      isActive: redirect.isActive,
      createdAt: redirect.createdAt,
      updatedAt: redirect.updatedAt,
    }));
  }

  /**
   * Find redirect for URL
   */
  async findRedirect(url: string): Promise<URLRedirect | null> {
    const normalizedUrl = this.normalizeUrl(url);
    
    const [redirect] = await db
      .select()
      .from(seoRedirects)
      .where(
        and(
          eq(seoRedirects.fromUrl, normalizedUrl),
          eq(seoRedirects.isActive, true)
        )
      )
      .limit(1);

    if (!redirect) {
      return null;
    }

    // Increment hit count
    await db
      .update(seoRedirects)
      .set({ hitCount: redirect.hitCount + 1 })
      .where(eq(seoRedirects.id, redirect.id));

    return {
      id: redirect.id,
      fromUrl: redirect.fromUrl,
      toUrl: redirect.toUrl,
      statusCode: redirect.statusCode as '301' | '302' | '307' | '308',
      isActive: redirect.isActive,
      createdAt: redirect.createdAt,
      updatedAt: redirect.updatedAt,
    };
  }

  /**
   * Generate comprehensive sitemap
   */
  async generateSitemap(options: SitemapGenerationOptions): Promise<string> {
    const {
      baseUrl,
      includeLastModified = true,
      includePriority = true,
      includeChangeFreq = true,
      excludePatterns = [],
      customEntries = [],
    } = options;

    // Get all published pages
    const publishedPages = await db
      .select()
      .from(pages)
      .where(eq(pages.status, 'published'))
      .orderBy(desc(pages.updatedAt));

    // Filter out excluded patterns
    const filteredPages = publishedPages.filter(page => {
      return !excludePatterns.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(page.slug);
      });
    });

    // Generate sitemap XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Add pages
    for (const page of filteredPages) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/${page.slug}</loc>\n`;
      
      if (includeLastModified) {
        const lastMod = page.updatedAt.toISOString().split('T')[0];
        xml += `    <lastmod>${lastMod}</lastmod>\n`;
      }
      
      if (includeChangeFreq) {
        const changeFreq = this.determineChangeFrequency(page);
        xml += `    <changefreq>${changeFreq}</changefreq>\n`;
      }
      
      if (includePriority) {
        const priority = this.determinePriority(page);
        xml += `    <priority>${priority}</priority>\n`;
      }
      
      xml += '  </url>\n';
    }

    // Add custom entries
    for (const entry of customEntries) {
      xml += '  <url>\n';
      xml += `    <loc>${entry.url}</loc>\n`;
      
      if (includeLastModified) {
        const lastMod = entry.lastModified.toISOString().split('T')[0];
        xml += `    <lastmod>${lastMod}</lastmod>\n`;
      }
      
      if (includeChangeFreq && entry.changeFrequency) {
        xml += `    <changefreq>${entry.changeFrequency}</changefreq>\n`;
      }
      
      if (includePriority && entry.priority !== undefined) {
        xml += `    <priority>${entry.priority.toFixed(1)}</priority>\n`;
      }
      
      xml += '  </url>\n';
    }

    xml += '</urlset>';

    // Update sitemap entries in database
    await this.updateSitemapEntries(baseUrl, filteredPages, customEntries);

    return xml;
  }

  /**
   * Generate robots.txt content
   */
  async generateRobotsTxt(baseUrl: string, options?: {
    allowAll?: boolean;
    disallowPatterns?: string[];
    customRules?: string[];
  }): Promise<string> {
    const {
      allowAll = true,
      disallowPatterns = [],
      customRules = [],
    } = options || {};

    let robotsTxt = 'User-agent: *\n';

    if (allowAll) {
      robotsTxt += 'Allow: /\n';
    }

    // Add disallow patterns
    for (const pattern of disallowPatterns) {
      robotsTxt += `Disallow: ${pattern}\n`;
    }

    // Add custom rules
    for (const rule of customRules) {
      robotsTxt += `${rule}\n`;
    }

    // Add sitemap reference
    robotsTxt += `\nSitemap: ${baseUrl}/sitemap.xml\n`;

    return robotsTxt;
  }

  /**
   * Check if slug exists
   */
  private async slugExists(slug: string, excludePageId?: string): Promise<boolean> {
    const conditions = [eq(pages.slug, slug)];
    
    if (excludePageId) {
      conditions.push(ne(pages.id, excludePageId));
    }

    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(...conditions))
      .limit(1);
      
    return !!existing;
  }

  /**
   * Normalize URL for consistency
   */
  private normalizeUrl(url: string): string {
    // Remove protocol and domain if present
    let normalized = url.replace(/^https?:\/\/[^\/]+/, '');
    
    // Ensure starts with /
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    
    // Remove trailing slash (except for root)
    if (normalized.length > 1 && normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    
    return normalized;
  }

  /**
   * Determine change frequency for sitemap
   */
  private determineChangeFrequency(page: any): string {
    // Home page changes more frequently
    if (page.slug === '' || page.slug === 'home') {
      return 'weekly';
    }

    // Blog posts change less frequently after publication
    const daysSinceUpdate = Math.floor(
      (Date.now() - page.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceUpdate < 7) {
      return 'daily';
    } else if (daysSinceUpdate < 30) {
      return 'weekly';
    } else {
      return 'monthly';
    }
  }

  /**
   * Determine priority for sitemap
   */
  private determinePriority(page: any): string {
    // Home page has highest priority
    if (page.slug === '' || page.slug === 'home') {
      return '1.0';
    }

    // Important pages
    const importantPages = ['about', 'contact', 'services', 'products'];
    if (importantPages.includes(page.slug)) {
      return '0.9';
    }

    // Blog posts and regular pages
    return '0.8';
  }

  /**
   * Update sitemap entries in database
   */
  private async updateSitemapEntries(
    baseUrl: string,
    pages: any[],
    customEntries: SitemapEntry[]
  ): Promise<void> {
    // Clear existing entries
    await db.delete(sitemapEntries);

    // Prepare entries for insertion
    const entries = [
      // Page entries
      ...pages.map(page => ({
        url: `${baseUrl}/${page.slug}`,
        lastModified: page.updatedAt,
        changeFrequency: this.determineChangeFrequency(page),
        priority: Math.round(parseFloat(this.determinePriority(page)) * 100), // Store as 0-100
        pageId: page.id,
        isActive: true,
      })),
      // Custom entries
      ...customEntries.map(entry => ({
        url: entry.url,
        lastModified: entry.lastModified,
        changeFrequency: entry.changeFrequency || null,
        priority: entry.priority ? Math.round(entry.priority * 100) : null,
        pageId: null,
        isActive: true,
      })),
    ];

    if (entries.length > 0) {
      await db.insert(sitemapEntries).values(entries);
    }
  }
}

// Export singleton instance
export const urlService = new URLService();