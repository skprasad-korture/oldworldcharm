import { eq, desc, asc, and, or, like, sql } from 'drizzle-orm';
import { db, pages, blogPosts } from '../db/index';
import type { BlogPost, ComponentInstance } from '@oldworldcharm/shared';

export interface BlogPostFilters {
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  categories?: string[];
  tags?: string[];
  author?: string;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'readingTime';
  sortOrder?: 'asc' | 'desc';
}

export interface BlogPostCreateData {
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  featuredImage?: string;
  categories: string[];
  tags: string[];
  author: string;
  content?: string;
  components: ComponentInstance[];
  seoData: any;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
}

export interface BlogPostUpdateData extends Partial<BlogPostCreateData> {
  id: string;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class BlogService {
  /**
   * Calculate reading time based on content and components
   */
  static calculateReadingTime(content: string = '', components: ComponentInstance[] = []): number {
    let textContent = content;
    
    // Extract text from components recursively
    const extractTextFromComponents = (comps: ComponentInstance[]): string => {
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
          text += extractTextFromComponents(comp.children);
        }
      }
      return text;
    };

    textContent += extractTextFromComponents(components);
    
    // Calculate reading time (average 200 words per minute)
    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  /**
   * Create a new blog post
   */
  static async createBlogPost(data: BlogPostCreateData): Promise<BlogPost> {
    // Calculate reading time
    const readingTime = this.calculateReadingTime(data.content, data.components);

    // Create the page first
    const [newPage] = await db
      .insert(pages)
      .values({
        slug: data.slug,
        title: data.title,
        description: data.description || null,
        content: data.components,
        seoData: data.seoData,
        status: data.status,
        publishedAt: data.status === 'published' 
          ? (data.publishedAt || new Date()) 
          : null,
      })
      .returning();

    if (!newPage) {
      throw new Error('Failed to create page');
    }

    // Create the blog post entry
    const [newBlogPost] = await db
      .insert(blogPosts)
      .values({
        pageId: newPage.id,
        excerpt: data.excerpt || null,
        featuredImage: data.featuredImage || null,
        categories: data.categories,
        tags: data.tags,
        author: data.author,
        readingTime,
      })
      .returning();

    if (!newBlogPost) {
      throw new Error('Failed to create blog post');
    }

    // Combine page and blog post data
    const result: any = {
      ...newPage,
      ...newBlogPost,
      components: newPage.content as ComponentInstance[],
      content: data.content,
      version: 1,
    };

    // Only include excerpt and featuredImage if they have values
    if (newBlogPost.excerpt) {
      result.excerpt = newBlogPost.excerpt;
    }
    if (newBlogPost.featuredImage) {
      result.featuredImage = newBlogPost.featuredImage;
    }

    return result as BlogPost;
  }

  /**
   * Get blog posts with filtering and pagination
   */
  static async getBlogPosts(
    filters: BlogPostFilters = {},
    pagination: PaginationOptions = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResult<BlogPost>> {
    // Build where conditions
    const conditions = [];
    
    if (filters.status) {
      conditions.push(eq(pages.status, filters.status));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(pages.title, `%${filters.search}%`),
          like(pages.description, `%${filters.search}%`),
          like(pages.slug, `%${filters.search}%`),
          like(blogPosts.excerpt, `%${filters.search}%`)
        )
      );
    }

    if (filters.categories && filters.categories.length > 0) {
      conditions.push(
        sql`${blogPosts.categories} ?| ${filters.categories}`
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      conditions.push(
        sql`${blogPosts.tags} ?| ${filters.tags}`
      );
    }

    if (filters.author) {
      conditions.push(eq(blogPosts.author, filters.author));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

    // Build order by clause
    let orderBy;
    const sortBy = filters.sortBy || 'updatedAt';
    const sortOrder = filters.sortOrder || 'desc';

    switch (sortBy) {
      case 'title':
        orderBy = sortOrder === 'asc' ? asc(pages.title) : desc(pages.title);
        break;
      case 'createdAt':
        orderBy = sortOrder === 'asc' ? asc(pages.createdAt) : desc(pages.createdAt);
        break;
      case 'publishedAt':
        orderBy = sortOrder === 'asc' ? asc(pages.publishedAt) : desc(pages.publishedAt);
        break;
      case 'readingTime':
        orderBy = sortOrder === 'asc' ? asc(blogPosts.readingTime) : desc(blogPosts.readingTime);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(pages.updatedAt) : desc(pages.updatedAt);
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
      .where(whereClause);
    
    const count = countResult[0]?.count || 0;

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.pageSize;
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
      .orderBy(orderBy)
      .limit(pagination.pageSize)
      .offset(offset);

    // Transform content to components for consistency
    const transformedBlogPosts: BlogPost[] = blogPostsData.map(post => {
      const result: any = {
        ...post,
        components: post.content as ComponentInstance[],
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

    const totalPages = Math.ceil(count / pagination.pageSize);

    return {
      items: transformedBlogPosts,
      total: count,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    };
  }

  /**
   * Get a single blog post by ID
   */
  static async getBlogPostById(id: string): Promise<BlogPost | null> {
    const [blogPost] = await db
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
      .where(eq(pages.id, id))
      .limit(1);

    if (!blogPost) {
      return null;
    }

    // Transform content to components for consistency
    const result: any = {
      ...blogPost,
      components: blogPost.content as ComponentInstance[],
      version: 1,
    };

    // Only include excerpt and featuredImage if they have values
    if (blogPost.excerpt) {
      result.excerpt = blogPost.excerpt;
    }
    if (blogPost.featuredImage) {
      result.featuredImage = blogPost.featuredImage;
    }

    return result as BlogPost;
  }

  /**
   * Update a blog post
   */
  static async updateBlogPost(id: string, updateData: Partial<BlogPostUpdateData>): Promise<BlogPost | null> {
    // Check if blog post exists
    const [existingBlogPost] = await db
      .select({
        pageId: blogPosts.pageId,
        slug: pages.slug,
        status: pages.status,
      })
      .from(blogPosts)
      .innerJoin(pages, eq(blogPosts.pageId, pages.id))
      .where(eq(pages.id, id))
      .limit(1);

    if (!existingBlogPost) {
      return null;
    }

    // Prepare page update data
    const pageUpdateValues: any = {
      updatedAt: new Date(),
    };

    if (updateData.slug !== undefined) pageUpdateValues.slug = updateData.slug;
    if (updateData.title !== undefined) pageUpdateValues.title = updateData.title;
    if (updateData.description !== undefined) pageUpdateValues.description = updateData.description;
    if (updateData.components !== undefined) pageUpdateValues.content = updateData.components;
    if (updateData.seoData !== undefined) pageUpdateValues.seoData = updateData.seoData;
    if (updateData.status !== undefined) {
      pageUpdateValues.status = updateData.status;
      // Set publishedAt when status changes to published
      if (updateData.status === 'published' && existingBlogPost.status !== 'published') {
        pageUpdateValues.publishedAt = updateData.publishedAt || new Date();
      }
      // Clear publishedAt when status changes from published
      if (updateData.status !== 'published' && existingBlogPost.status === 'published') {
        pageUpdateValues.publishedAt = null;
      }
    }

    // Prepare blog post update data
    const blogPostUpdateValues: any = {
      updatedAt: new Date(),
    };

    if (updateData.excerpt !== undefined) blogPostUpdateValues.excerpt = updateData.excerpt;
    if (updateData.featuredImage !== undefined) blogPostUpdateValues.featuredImage = updateData.featuredImage;
    if (updateData.categories !== undefined) blogPostUpdateValues.categories = updateData.categories;
    if (updateData.tags !== undefined) blogPostUpdateValues.tags = updateData.tags;
    if (updateData.author !== undefined) blogPostUpdateValues.author = updateData.author;

    // Recalculate reading time if content or components changed
    if (updateData.content !== undefined || updateData.components !== undefined) {
      const readingTime = this.calculateReadingTime(
        updateData.content || '',
        updateData.components || []
      );
      blogPostUpdateValues.readingTime = readingTime;
    }

    // Update both tables
    const [updatedPage] = await db
      .update(pages)
      .set(pageUpdateValues)
      .where(eq(pages.id, id))
      .returning();

    const [updatedBlogPost] = await db
      .update(blogPosts)
      .set(blogPostUpdateValues)
      .where(eq(blogPosts.pageId, id))
      .returning();

    if (!updatedPage || !updatedBlogPost) {
      throw new Error('Failed to update blog post');
    }

    // Combine updated data
    const result: any = {
      ...updatedPage,
      ...updatedBlogPost,
      components: updatedPage.content as ComponentInstance[],
      version: 1,
    };

    // Only include excerpt and featuredImage if they have values
    if (updatedBlogPost.excerpt) {
      result.excerpt = updatedBlogPost.excerpt;
    }
    if (updatedBlogPost.featuredImage) {
      result.featuredImage = updatedBlogPost.featuredImage;
    }

    return result as BlogPost;
  }

  /**
   * Delete a blog post
   */
  static async deleteBlogPost(id: string): Promise<boolean> {
    // Check if blog post exists
    const existingBlogPost = await db
      .select({ pageId: blogPosts.pageId })
      .from(blogPosts)
      .innerJoin(pages, eq(blogPosts.pageId, pages.id))
      .where(eq(pages.id, id))
      .limit(1);

    if (existingBlogPost.length === 0) {
      return false;
    }

    // Delete the page (blog post will be deleted via cascade)
    await db.delete(pages).where(eq(pages.id, id));
    return true;
  }

  /**
   * Get all categories or tags
   */
  static async getCategoriesOrTags(
    type: 'categories' | 'tags',
    search?: string,
    limit: number = 50
  ): Promise<string[]> {
    // Get all unique categories or tags
    const field = type === 'categories' ? blogPosts.categories : blogPosts.tags;
    
    const results = await db
      .select({ items: field })
      .from(blogPosts)
      .innerJoin(pages, eq(blogPosts.pageId, pages.id))
      .where(eq(pages.status, 'published'));

    // Extract and flatten all categories/tags
    const allItems = new Set<string>();
    results.forEach(result => {
      const items = result.items as string[];
      items.forEach(item => {
        if (search) {
          if (item.toLowerCase().includes(search.toLowerCase())) {
            allItems.add(item);
          }
        } else {
          allItems.add(item);
        }
      });
    });

    // Convert to array and limit results
    return Array.from(allItems)
      .sort()
      .slice(0, limit);
  }

  /**
   * Get related blog posts based on categories and tags
   */
  static async getRelatedPosts(
    blogPostId: string,
    categories: string[] = [],
    tags: string[] = [],
    limit: number = 5
  ): Promise<BlogPost[]> {
    const conditions = [
      sql`${pages.id} != ${blogPostId}`,
      eq(pages.status, 'published'),
    ];

    // Add category or tag matching conditions
    if (categories.length > 0 || tags.length > 0) {
      const relatedConditions: any[] = [];
      
      if (categories.length > 0) {
        relatedConditions.push(sql`${blogPosts.categories} ?| ${categories}`);
      }
      
      if (tags.length > 0) {
        relatedConditions.push(sql`${blogPosts.tags} ?| ${tags}`);
      }

      if (relatedConditions.length === 1) {
        conditions.push(relatedConditions[0]!);
      } else if (relatedConditions.length > 1) {
        conditions.push(or(...relatedConditions) as any);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : sql`1=1`;

    const relatedPosts = await db
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
      .limit(limit);

    return relatedPosts.map(post => {
      const result: any = {
        ...post,
        components: post.content as ComponentInstance[],
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
   * Get blog post statistics
   */
  static async getBlogStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalCategories: number;
    totalTags: number;
    totalAuthors: number;
  }> {
    // Get total counts
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .innerJoin(pages, eq(blogPosts.pageId, pages.id));

    const [publishedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .innerJoin(pages, eq(blogPosts.pageId, pages.id))
      .where(eq(pages.status, 'published'));

    const [draftResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .innerJoin(pages, eq(blogPosts.pageId, pages.id))
      .where(eq(pages.status, 'draft'));

    // Get unique authors
    const authorsResult = await db
      .selectDistinct({ author: blogPosts.author })
      .from(blogPosts)
      .innerJoin(pages, eq(blogPosts.pageId, pages.id));

    // Get all categories and tags to count unique ones
    const categoriesAndTags = await db
      .select({ 
        categories: blogPosts.categories,
        tags: blogPosts.tags,
      })
      .from(blogPosts)
      .innerJoin(pages, eq(blogPosts.pageId, pages.id));

    const allCategories = new Set<string>();
    const allTags = new Set<string>();

    categoriesAndTags.forEach(result => {
      (result.categories as string[]).forEach(cat => allCategories.add(cat));
      (result.tags as string[]).forEach(tag => allTags.add(tag));
    });

    return {
      totalPosts: totalResult?.count || 0,
      publishedPosts: publishedResult?.count || 0,
      draftPosts: draftResult?.count || 0,
      totalCategories: allCategories.size,
      totalTags: allTags.size,
      totalAuthors: authorsResult.length,
    };
  }
}