import { eq, desc, sql } from 'drizzle-orm';
import { db, socialShares, pages, blogPosts } from '../db/index.js';
import type { BlogPost } from '@oldworldcharm/shared';

export interface SocialShare {
  id: string;
  blogPostId: string;
  platform: string;
  shareCount: number;
  lastUpdated: Date;
}

export interface OpenGraphData {
  title: string;
  description: string;
  image?: string;
  url: string;
  type: 'article' | 'website';
  siteName: string;
  locale: string;
  article?: {
    author: string;
    publishedTime: string;
    modifiedTime: string;
    section: string;
    tags: string[];
  };
}

export interface TwitterCardData {
  card: 'summary' | 'summary_large_image';
  title: string;
  description: string;
  image?: string;
  site?: string;
  creator?: string;
}

export interface SocialMetaTags {
  openGraph: OpenGraphData;
  twitter: TwitterCardData;
  canonical: string;
  jsonLd: any;
}

export class SocialService {
  /**
   * Generate Open Graph meta tags for a blog post
   */
  static generateOpenGraphData(
    blogPost: BlogPost,
    baseUrl: string,
    siteName: string = 'Visual Website Builder'
  ): OpenGraphData {
    const url = `${baseUrl}/blog/${blogPost.slug}`;
    const title = blogPost.seoData?.ogTitle || blogPost.title;
    const description = blogPost.seoData?.ogDescription || blogPost.excerpt || blogPost.description || '';
    const image = blogPost.seoData?.ogImage || blogPost.featuredImage;

    const result: OpenGraphData = {
      title,
      description,
      url,
      type: 'article',
      siteName,
      locale: 'en_US',
      article: {
        author: blogPost.author,
        publishedTime: blogPost.publishedAt?.toISOString() || blogPost.createdAt.toISOString(),
        modifiedTime: blogPost.updatedAt.toISOString(),
        section: blogPost.categories[0] || 'Blog',
        tags: blogPost.tags,
      },
    };

    if (image) {
      result.image = image;
    }

    return result;
  }

  /**
   * Generate Twitter Card meta tags for a blog post
   */
  static generateTwitterCardData(
    blogPost: BlogPost,
    twitterSite?: string,
    twitterCreator?: string
  ): TwitterCardData {
    const title = blogPost.seoData?.twitterTitle || blogPost.seoData?.ogTitle || blogPost.title;
    const description = blogPost.seoData?.twitterDescription || blogPost.seoData?.ogDescription || blogPost.excerpt || blogPost.description || '';
    const image = blogPost.seoData?.twitterImage || blogPost.seoData?.ogImage || blogPost.featuredImage;
    const card = image ? 'summary_large_image' : 'summary';

    const result: TwitterCardData = {
      card,
      title,
      description,
    };

    if (image) result.image = image;
    if (twitterSite) result.site = twitterSite;
    if (twitterCreator) result.creator = twitterCreator;

    return result;
  }

  /**
   * Generate JSON-LD structured data for a blog post
   */
  static generateJsonLd(
    blogPost: BlogPost,
    baseUrl: string,
    siteName: string = 'Visual Website Builder'
  ): any {
    const url = `${baseUrl}/blog/${blogPost.slug}`;
    const image = blogPost.featuredImage || blogPost.seoData?.ogImage;

    return {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: blogPost.title,
      description: blogPost.excerpt || blogPost.description || '',
      image: image ? [image] : undefined,
      datePublished: blogPost.publishedAt?.toISOString() || blogPost.createdAt.toISOString(),
      dateModified: blogPost.updatedAt.toISOString(),
      author: {
        '@type': 'Person',
        name: blogPost.author,
      },
      publisher: {
        '@type': 'Organization',
        name: siteName,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo.png`, // Assuming a logo exists
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': url,
      },
      url,
      keywords: blogPost.tags.join(', '),
      articleSection: blogPost.categories.join(', '),
      wordCount: blogPost.readingTime * 200, // Approximate word count
      timeRequired: `PT${blogPost.readingTime}M`, // ISO 8601 duration format
    };
  }

  /**
   * Generate complete social meta tags for a blog post
   */
  static generateSocialMetaTags(
    blogPost: BlogPost,
    baseUrl: string,
    options: {
      siteName?: string;
      twitterSite?: string;
      twitterCreator?: string;
    } = {}
  ): SocialMetaTags {
    const { siteName = 'Visual Website Builder', twitterSite, twitterCreator } = options;
    const canonical = `${baseUrl}/blog/${blogPost.slug}`;

    return {
      openGraph: this.generateOpenGraphData(blogPost, baseUrl, siteName),
      twitter: this.generateTwitterCardData(blogPost, twitterSite, twitterCreator),
      canonical,
      jsonLd: this.generateJsonLd(blogPost, baseUrl, siteName),
    };
  }

  /**
   * Generate HTML meta tags string
   */
  static generateMetaTagsHtml(metaTags: SocialMetaTags): string {
    const { openGraph, twitter, canonical, jsonLd } = metaTags;
    
    let html = '';

    // Canonical URL
    html += `<link rel="canonical" href="${canonical}" />\n`;

    // Open Graph tags
    html += `<meta property="og:title" content="${this.escapeHtml(openGraph.title)}" />\n`;
    html += `<meta property="og:description" content="${this.escapeHtml(openGraph.description || '')}" />\n`;
    html += `<meta property="og:type" content="${openGraph.type}" />\n`;
    html += `<meta property="og:url" content="${openGraph.url}" />\n`;
    html += `<meta property="og:site_name" content="${this.escapeHtml(openGraph.siteName)}" />\n`;
    html += `<meta property="og:locale" content="${openGraph.locale}" />\n`;
    
    if (openGraph.image) {
      html += `<meta property="og:image" content="${openGraph.image}" />\n`;
    }

    if (openGraph.article) {
      html += `<meta property="article:author" content="${this.escapeHtml(openGraph.article.author)}" />\n`;
      html += `<meta property="article:published_time" content="${openGraph.article.publishedTime}" />\n`;
      html += `<meta property="article:modified_time" content="${openGraph.article.modifiedTime}" />\n`;
      html += `<meta property="article:section" content="${this.escapeHtml(openGraph.article.section)}" />\n`;
      
      openGraph.article.tags.forEach(tag => {
        html += `<meta property="article:tag" content="${this.escapeHtml(tag)}" />\n`;
      });
    }

    // Twitter Card tags
    html += `<meta name="twitter:card" content="${twitter.card}" />\n`;
    html += `<meta name="twitter:title" content="${this.escapeHtml(twitter.title)}" />\n`;
    html += `<meta name="twitter:description" content="${this.escapeHtml(twitter.description || '')}" />\n`;
    
    if (twitter.image) {
      html += `<meta name="twitter:image" content="${twitter.image}" />\n`;
    }
    
    if (twitter.site) {
      html += `<meta name="twitter:site" content="${twitter.site}" />\n`;
    }
    
    if (twitter.creator) {
      html += `<meta name="twitter:creator" content="${twitter.creator}" />\n`;
    }

    // JSON-LD structured data
    html += `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>\n`;

    return html;
  }

  /**
   * Record a social share
   */
  static async recordShare(blogPostId: string, platform: string): Promise<SocialShare> {
    // Check if record exists
    const [existingShare] = await db
      .select()
      .from(socialShares)
      .where(
        sql`${socialShares.blogPostId} = ${blogPostId} AND ${socialShares.platform} = ${platform}`
      )
      .limit(1);

    if (existingShare) {
      // Update existing record
      const [updatedShare] = await db
        .update(socialShares)
        .set({
          shareCount: sql`${socialShares.shareCount} + 1`,
          lastUpdated: new Date(),
        })
        .where(eq(socialShares.id, existingShare.id))
        .returning();

      return updatedShare!;
    } else {
      // Create new record
      const [newShare] = await db
        .insert(socialShares)
        .values({
          blogPostId,
          platform,
          shareCount: 1,
        })
        .returning();

      return newShare!;
    }
  }

  /**
   * Get social share counts for a blog post
   */
  static async getShareCounts(blogPostId: string): Promise<Record<string, number>> {
    const shares = await db
      .select()
      .from(socialShares)
      .where(eq(socialShares.blogPostId, blogPostId));

    const counts: Record<string, number> = {};
    shares.forEach(share => {
      counts[share.platform] = share.shareCount;
    });

    return counts;
  }

  /**
   * Get total share counts across all platforms
   */
  static async getTotalShareCounts(): Promise<Record<string, number>> {
    const result = await db
      .select({
        platform: socialShares.platform,
        totalShares: sql<number>`sum(${socialShares.shareCount})`,
      })
      .from(socialShares)
      .groupBy(socialShares.platform);

    const counts: Record<string, number> = {};
    result.forEach(row => {
      counts[row.platform] = row.totalShares || 0;
    });

    return counts;
  }

  /**
   * Get most shared blog posts
   */
  static async getMostSharedPosts(limit: number = 10): Promise<Array<{
    blogPost: BlogPost;
    totalShares: number;
    sharesByPlatform: Record<string, number>;
  }>> {
    // Get blog posts with their total share counts
    const result = await db
      .select({
        blogPostId: socialShares.blogPostId,
        totalShares: sql<number>`sum(${socialShares.shareCount})`,
      })
      .from(socialShares)
      .groupBy(socialShares.blogPostId)
      .orderBy(desc(sql<number>`sum(${socialShares.shareCount})`))
      .limit(limit);

    const postsWithShares = [];

    for (const row of result) {
      // Get the blog post details
      const [blogPostData] = await db
        .select({
          // Page fields
          id: pages.id,
          slug: pages.slug,
          title: pages.title,
          description: pages.description,
          content: pages.content,
          seoData: pages.seoData,
          status: pages.status,
          publishedAt: pages.publishedAt,
          createdAt: pages.createdAt,
          updatedAt: pages.updatedAt,
          // Blog post fields
          excerpt: blogPosts.excerpt,
          featuredImage: blogPosts.featuredImage,
          categories: blogPosts.categories,
          tags: blogPosts.tags,
          author: blogPosts.author,
          readingTime: blogPosts.readingTime,
        })
        .from(pages)
        .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
        .where(eq(pages.id, row.blogPostId))
        .limit(1);

      if (blogPostData) {
        const blogPost: any = {
          ...blogPostData,
          components: blogPostData.content as any[],
          version: 1,
        };

        // Only include excerpt and featuredImage if they have values
        if (blogPostData.excerpt) {
          blogPost.excerpt = blogPostData.excerpt;
        }
        if (blogPostData.featuredImage) {
          blogPost.featuredImage = blogPostData.featuredImage;
        }

        // Get shares by platform for this post
        const sharesByPlatform = await this.getShareCounts(row.blogPostId);

        postsWithShares.push({
          blogPost: blogPost as BlogPost,
          totalShares: row.totalShares || 0,
          sharesByPlatform,
        });
      }
    }

    return postsWithShares;
  }

  /**
   * Generate sharing URLs for different platforms
   */
  static generateSharingUrls(
    url: string,
    title: string,
    description?: string
  ): Record<string, string> {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description || '');

    return {
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
      whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
    };
  }

  /**
   * Escape HTML characters for safe output
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    
    return (text || '').replace(/[&<>"']/g, (m) => map[m] || m);
  }
}