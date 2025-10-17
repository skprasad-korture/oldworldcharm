import { eq, desc, and, sql } from 'drizzle-orm';
import { db, rssFeeds, pages, blogPosts } from '../db/index';
import type { BlogPost } from '@oldworldcharm/shared';

export interface RSSFeed {
  id: string;
  title: string;
  description?: string;
  link: string;
  language: string;
  categories: string[];
  tags: string[];
  maxItems: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RSSItem {
  title: string;
  description: string;
  link: string;
  guid: string;
  pubDate: string;
  author: string;
  categories: string[];
  content?: string;
  enclosure?: {
    url: string;
    type: string;
    length: number;
  };
}

export interface RSSChannel {
  title: string;
  description: string;
  link: string;
  language: string;
  lastBuildDate: string;
  generator: string;
  items: RSSItem[];
}

export class RSSService {
  /**
   * Create a new RSS feed configuration
   */
  static async createRSSFeed(data: Omit<RSSFeed, 'id' | 'createdAt' | 'updatedAt'>): Promise<RSSFeed> {
    const [newFeed] = await db
      .insert(rssFeeds)
      .values({
        title: data.title,
        description: data.description || null,
        link: data.link,
        language: data.language,
        categories: data.categories,
        tags: data.tags,
        maxItems: data.maxItems,
        isActive: data.isActive,
      })
      .returning();

    if (!newFeed) {
      throw new Error('Failed to create RSS feed');
    }

    const result: any = {
      id: newFeed.id,
      title: newFeed.title,
      link: newFeed.link,
      language: newFeed.language,
      categories: newFeed.categories as string[],
      tags: newFeed.tags as string[],
      maxItems: newFeed.maxItems,
      isActive: newFeed.isActive,
      createdAt: newFeed.createdAt,
      updatedAt: newFeed.updatedAt,
    };

    if (newFeed.description) {
      result.description = newFeed.description;
    }

    return result as RSSFeed;
  }

  /**
   * Get all RSS feed configurations
   */
  static async getRSSFeeds(): Promise<RSSFeed[]> {
    const feeds = await db
      .select()
      .from(rssFeeds)
      .orderBy(desc(rssFeeds.createdAt));

    return feeds.map(feed => {
      const result: any = {
        id: feed.id,
        title: feed.title,
        link: feed.link,
        language: feed.language,
        categories: feed.categories as string[],
        tags: feed.tags as string[],
        maxItems: feed.maxItems,
        isActive: feed.isActive,
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
      };

      if (feed.description) {
        result.description = feed.description;
      }

      return result as RSSFeed;
    });
  }

  /**
   * Get active RSS feed configurations
   */
  static async getActiveRSSFeeds(): Promise<RSSFeed[]> {
    const feeds = await db
      .select()
      .from(rssFeeds)
      .where(eq(rssFeeds.isActive, true))
      .orderBy(desc(rssFeeds.createdAt));

    return feeds.map(feed => {
      const result: any = {
        id: feed.id,
        title: feed.title,
        link: feed.link,
        language: feed.language,
        categories: feed.categories as string[],
        tags: feed.tags as string[],
        maxItems: feed.maxItems,
        isActive: feed.isActive,
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
      };

      if (feed.description) {
        result.description = feed.description;
      }

      return result as RSSFeed;
    });
  }

  /**
   * Get RSS feed by ID
   */
  static async getRSSFeedById(id: string): Promise<RSSFeed | null> {
    const [feed] = await db
      .select()
      .from(rssFeeds)
      .where(eq(rssFeeds.id, id))
      .limit(1);

    if (!feed) {
      return null;
    }

    const result: any = {
      id: feed.id,
      title: feed.title,
      link: feed.link,
      language: feed.language,
      categories: feed.categories as string[],
      tags: feed.tags as string[],
      maxItems: feed.maxItems,
      isActive: feed.isActive,
      createdAt: feed.createdAt,
      updatedAt: feed.updatedAt,
    };

    if (feed.description) {
      result.description = feed.description;
    }

    return result as RSSFeed;
  }

  /**
   * Update RSS feed configuration
   */
  static async updateRSSFeed(
    id: string,
    data: Partial<Omit<RSSFeed, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<RSSFeed | null> {
    const updateValues: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateValues.title = data.title;
    if (data.description !== undefined) updateValues.description = data.description;
    if (data.link !== undefined) updateValues.link = data.link;
    if (data.language !== undefined) updateValues.language = data.language;
    if (data.categories !== undefined) updateValues.categories = data.categories;
    if (data.tags !== undefined) updateValues.tags = data.tags;
    if (data.maxItems !== undefined) updateValues.maxItems = data.maxItems;
    if (data.isActive !== undefined) updateValues.isActive = data.isActive;

    const [updatedFeed] = await db
      .update(rssFeeds)
      .set(updateValues)
      .where(eq(rssFeeds.id, id))
      .returning();

    if (!updatedFeed) {
      return null;
    }

    const result: any = {
      id: updatedFeed.id,
      title: updatedFeed.title,
      link: updatedFeed.link,
      language: updatedFeed.language,
      categories: updatedFeed.categories as string[],
      tags: updatedFeed.tags as string[],
      maxItems: updatedFeed.maxItems,
      isActive: updatedFeed.isActive,
      createdAt: updatedFeed.createdAt,
      updatedAt: updatedFeed.updatedAt,
    };

    if (updatedFeed.description) {
      result.description = updatedFeed.description;
    }

    return result as RSSFeed;
  }

  /**
   * Delete RSS feed configuration
   */
  static async deleteRSSFeed(id: string): Promise<boolean> {
    const result = await db
      .delete(rssFeeds)
      .where(eq(rssFeeds.id, id))
      .returning({ id: rssFeeds.id });

    return result.length > 0;
  }

  /**
   * Get blog posts for RSS feed based on filters
   */
  static async getBlogPostsForFeed(
    feedConfig: RSSFeed
  ): Promise<BlogPost[]> {
    // Build where conditions based on feed configuration
    const conditions = [
      eq(pages.status, 'published'),
    ];

    // Filter by categories if specified
    if (feedConfig.categories.length > 0) {
      conditions.push(
        sql`${blogPosts.categories} ?| ${feedConfig.categories}`
      );
    }

    // Filter by tags if specified
    if (feedConfig.tags.length > 0) {
      conditions.push(
        sql`${blogPosts.tags} ?| ${feedConfig.tags}`
      );
    }

    const whereClause = and(...conditions);

    // Get blog posts
    const blogPostsData = await db
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
      .where(whereClause)
      .orderBy(desc(pages.publishedAt))
      .limit(feedConfig.maxItems);

    // Transform to BlogPost objects
    return blogPostsData.map(post => {
      const result: any = {
        ...post,
        components: post.content as any[],
        version: 1,
      };

      // Only include excerpt and featuredImage if they have values
      if (post.excerpt) {
        result.excerpt = post.excerpt;
      }
      if (post.featuredImage) {
        result.featuredImage = post.featuredImage;
      }

      return result as BlogPost;
    });
  }

  /**
   * Generate RSS XML for a feed
   */
  static async generateRSSXML(feedId: string, baseUrl: string): Promise<string> {
    const feedConfig = await this.getRSSFeedById(feedId);
    if (!feedConfig || !feedConfig.isActive) {
      throw new Error('RSS feed not found or inactive');
    }

    const blogPosts = await this.getBlogPostsForFeed(feedConfig);
    
    const channel: RSSChannel = {
      title: feedConfig.title,
      description: feedConfig.description || '',
      link: feedConfig.link,
      language: feedConfig.language,
      lastBuildDate: new Date().toUTCString(),
      generator: 'Visual Website Builder RSS Generator',
      items: blogPosts.map(post => this.blogPostToRSSItem(post, baseUrl)),
    };

    return this.generateRSSXMLFromChannel(channel);
  }

  /**
   * Generate default RSS feed for all published blog posts
   */
  static async generateDefaultRSSXML(
    baseUrl: string,
    options: {
      title?: string;
      description?: string;
      maxItems?: number;
    } = {}
  ): Promise<string> {
    const {
      title = 'Blog Posts',
      description = 'Latest blog posts',
      maxItems = 20,
    } = options;

    // Get published blog posts
    const blogPostsData = await db
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
      .where(eq(pages.status, 'published'))
      .orderBy(desc(pages.publishedAt))
      .limit(maxItems);

    // Transform to BlogPost objects
    const blogPostsList: BlogPost[] = blogPostsData.map(post => {
      const result: any = {
        ...post,
        components: post.content as any[],
        version: 1,
      };

      // Only include excerpt and featuredImage if they have values
      if (post.excerpt) {
        result.excerpt = post.excerpt;
      }
      if (post.featuredImage) {
        result.featuredImage = post.featuredImage;
      }

      return result as BlogPost;
    });

    const channel: RSSChannel = {
      title,
      description,
      link: baseUrl,
      language: 'en',
      lastBuildDate: new Date().toUTCString(),
      generator: 'Visual Website Builder RSS Generator',
      items: blogPostsList.map(post => this.blogPostToRSSItem(post, baseUrl)),
    };

    return this.generateRSSXMLFromChannel(channel);
  }

  /**
   * Convert a blog post to an RSS item
   */
  private static blogPostToRSSItem(blogPost: BlogPost, baseUrl: string): RSSItem {
    const link = `${baseUrl}/blog/${blogPost.slug}`;
    const pubDate = (blogPost.publishedAt || blogPost.createdAt).toUTCString();
    
    // Generate description from excerpt or description
    const description = blogPost.excerpt || blogPost.description || '';
    
    // Generate content (optional, for full-text feeds)
    const content = this.generateContentFromComponents(blogPost.components);

    const item: RSSItem = {
      title: blogPost.title,
      description: this.escapeXml(description),
      link,
      guid: link,
      pubDate,
      author: blogPost.author,
      categories: [...blogPost.categories, ...blogPost.tags],
    };

    // Only include content if it has a value
    if (content && content.trim()) {
      item.content = this.escapeXml(content);
    }

    // Add enclosure for featured image
    if (blogPost.featuredImage) {
      item.enclosure = {
        url: blogPost.featuredImage,
        type: 'image/jpeg', // Assume JPEG, could be enhanced to detect actual type
        length: 0, // Would need to fetch actual file size
      };
    }

    return item;
  }

  /**
   * Generate RSS XML from channel data
   */
  private static generateRSSXMLFromChannel(channel: RSSChannel): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">\n';
    xml += '  <channel>\n';
    xml += `    <title>${this.escapeXml(channel.title)}</title>\n`;
    xml += `    <description>${this.escapeXml(channel.description)}</description>\n`;
    xml += `    <link>${this.escapeXml(channel.link)}</link>\n`;
    xml += `    <language>${channel.language}</language>\n`;
    xml += `    <lastBuildDate>${channel.lastBuildDate}</lastBuildDate>\n`;
    xml += `    <generator>${channel.generator}</generator>\n`;
    xml += `    <atom:link href="${channel.link}/rss.xml" rel="self" type="application/rss+xml" />\n`;

    // Add items
    channel.items.forEach(item => {
      xml += '    <item>\n';
      xml += `      <title>${this.escapeXml(item.title)}</title>\n`;
      xml += `      <description>${item.description}</description>\n`;
      xml += `      <link>${this.escapeXml(item.link)}</link>\n`;
      xml += `      <guid isPermaLink="true">${this.escapeXml(item.guid)}</guid>\n`;
      xml += `      <pubDate>${item.pubDate}</pubDate>\n`;
      xml += `      <author>${this.escapeXml(item.author)}</author>\n`;

      // Add categories
      item.categories.forEach(category => {
        xml += `      <category>${this.escapeXml(category)}</category>\n`;
      });

      // Add content if available
      if (item.content) {
        xml += `      <content:encoded><![CDATA[${item.content}]]></content:encoded>\n`;
      }

      // Add enclosure if available
      if (item.enclosure) {
        xml += `      <enclosure url="${this.escapeXml(item.enclosure.url)}" type="${item.enclosure.type}" length="${item.enclosure.length}" />\n`;
      }

      xml += '    </item>\n';
    });

    xml += '  </channel>\n';
    xml += '</rss>\n';

    return xml;
  }

  /**
   * Generate content from component tree (simplified)
   */
  private static generateContentFromComponents(components: any[]): string {
    // This is a simplified implementation
    // In a real scenario, you'd want to render the components to HTML
    let content = '';
    
    const extractText = (comps: any[]): string => {
      let text = '';
      for (const comp of comps) {
        if (comp.props) {
          Object.values(comp.props).forEach(prop => {
            if (typeof prop === 'string') {
              text += prop + ' ';
            }
          });
        }
        if (comp.children) {
          text += extractText(comp.children);
        }
      }
      return text;
    };

    content = extractText(components);
    return content.trim();
  }

  /**
   * Escape XML characters
   */
  private static escapeXml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    
    return (text || '').replace(/[&<>"']/g, (m) => map[m] || m);
  }
}