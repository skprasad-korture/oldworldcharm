import { eq, desc, asc, and, or, like, sql } from 'drizzle-orm';
import { db, comments, pages, blogPosts } from '../db/index.js';

export interface Comment {
  id: string;
  blogPostId: string;
  parentId?: string;
  authorName: string;
  authorEmail: string;
  authorWebsite?: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected' | 'spam';
  ipAddress?: string;
  userAgent?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
}

export interface CommentCreateData {
  blogPostId: string;
  parentId?: string;
  authorName: string;
  authorEmail: string;
  authorWebsite?: string;
  content: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CommentFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'spam';
  blogPostId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'authorName';
  sortOrder?: 'asc' | 'desc';
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

export class CommentsService {
  /**
   * Create a new comment
   */
  static async createComment(data: CommentCreateData): Promise<Comment> {
    // Check if blog post exists and is published
    const [blogPost] = await db
      .select({ id: pages.id, status: pages.status })
      .from(pages)
      .innerJoin(blogPosts, eq(pages.id, blogPosts.pageId))
      .where(eq(pages.id, data.blogPostId))
      .limit(1);

    if (!blogPost) {
      throw new Error('Blog post not found');
    }

    if (blogPost.status !== 'published') {
      throw new Error('Comments are only allowed on published blog posts');
    }

    // If parentId is provided, check if parent comment exists
    if (data.parentId) {
      const [parentComment] = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.id, data.parentId))
        .limit(1);

      if (!parentComment) {
        throw new Error('Parent comment not found');
      }
    }

    // Create the comment
    const [newComment] = await db
      .insert(comments)
      .values({
        blogPostId: data.blogPostId,
        parentId: data.parentId || null,
        authorName: data.authorName,
        authorEmail: data.authorEmail,
        authorWebsite: data.authorWebsite || null,
        content: data.content,
        status: 'pending', // All comments start as pending
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        isVerified: false,
      })
      .returning();

    if (!newComment) {
      throw new Error('Failed to create comment');
    }

    const result: Comment = {
      id: newComment.id,
      blogPostId: newComment.blogPostId,
      authorName: newComment.authorName,
      authorEmail: newComment.authorEmail,
      content: newComment.content,
      status: newComment.status as 'pending' | 'approved' | 'rejected' | 'spam',
      isVerified: newComment.isVerified,
      createdAt: newComment.createdAt,
      updatedAt: newComment.updatedAt,
    };

    if (newComment.parentId) result.parentId = newComment.parentId;
    if (newComment.authorWebsite) result.authorWebsite = newComment.authorWebsite;
    if (newComment.ipAddress) result.ipAddress = newComment.ipAddress;
    if (newComment.userAgent) result.userAgent = newComment.userAgent;

    return result;
  }

  /**
   * Get comments with filtering and pagination
   */
  static async getComments(
    filters: CommentFilters = {},
    pagination: PaginationOptions = { page: 1, pageSize: 20 }
  ): Promise<PaginatedResult<Comment>> {
    // Build where conditions
    const conditions = [];
    
    if (filters.status) {
      conditions.push(eq(comments.status, filters.status));
    }

    if (filters.blogPostId) {
      conditions.push(eq(comments.blogPostId, filters.blogPostId));
    }

    if (filters.search) {
      conditions.push(
        or(
          like(comments.authorName, `%${filters.search}%`),
          like(comments.authorEmail, `%${filters.search}%`),
          like(comments.content, `%${filters.search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build order by clause
    let orderBy;
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'desc';

    switch (sortBy) {
      case 'authorName':
        orderBy = sortOrder === 'asc' ? asc(comments.authorName) : desc(comments.authorName);
        break;
      case 'updatedAt':
        orderBy = sortOrder === 'asc' ? asc(comments.updatedAt) : desc(comments.updatedAt);
        break;
      default:
        orderBy = sortOrder === 'asc' ? asc(comments.createdAt) : desc(comments.createdAt);
    }

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(whereClause);
    
    const count = countResult[0]?.count || 0;

    // Get paginated results
    const offset = (pagination.page - 1) * pagination.pageSize;
    const commentsData = await db
      .select()
      .from(comments)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pagination.pageSize)
      .offset(offset);

    // Transform data
    const transformedComments: Comment[] = commentsData.map(comment => {
      const result: Comment = {
        id: comment.id,
        blogPostId: comment.blogPostId,
        authorName: comment.authorName,
        authorEmail: comment.authorEmail,
        content: comment.content,
        status: comment.status as 'pending' | 'approved' | 'rejected' | 'spam',
        isVerified: comment.isVerified,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };

      if (comment.parentId) result.parentId = comment.parentId;
      if (comment.authorWebsite) result.authorWebsite = comment.authorWebsite;
      if (comment.ipAddress) result.ipAddress = comment.ipAddress;
      if (comment.userAgent) result.userAgent = comment.userAgent;

      return result;
    });

    const totalPages = Math.ceil(count / pagination.pageSize);

    return {
      items: transformedComments,
      total: count,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    };
  }

  /**
   * Get comments for a specific blog post with nested structure
   */
  static async getCommentsForBlogPost(
    blogPostId: string,
    includeReplies: boolean = true
  ): Promise<Comment[]> {
    // Get all approved comments for the blog post
    const allComments = await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.blogPostId, blogPostId),
          eq(comments.status, 'approved')
        )
      )
      .orderBy(asc(comments.createdAt));

    if (!includeReplies) {
      return allComments
        .filter(comment => !comment.parentId)
        .map(comment => {
          const result: Comment = {
            id: comment.id,
            blogPostId: comment.blogPostId,
            authorName: comment.authorName,
            authorEmail: comment.authorEmail,
            content: comment.content,
            status: comment.status as 'pending' | 'approved' | 'rejected' | 'spam',
            isVerified: comment.isVerified,
            createdAt: comment.createdAt,
            updatedAt: comment.updatedAt,
          };

          if (comment.parentId) result.parentId = comment.parentId;
          if (comment.authorWebsite) result.authorWebsite = comment.authorWebsite;
          if (comment.ipAddress) result.ipAddress = comment.ipAddress;
          if (comment.userAgent) result.userAgent = comment.userAgent;

          return result;
        });
    }

    // Build nested structure
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create all comment objects
    allComments.forEach(comment => {
      const transformedComment: Comment = {
        id: comment.id,
        blogPostId: comment.blogPostId,
        authorName: comment.authorName,
        authorEmail: comment.authorEmail,
        content: comment.content,
        status: comment.status as 'pending' | 'approved' | 'rejected' | 'spam',
        isVerified: comment.isVerified,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        replies: [],
      };

      if (comment.parentId) transformedComment.parentId = comment.parentId;
      if (comment.authorWebsite) transformedComment.authorWebsite = comment.authorWebsite;
      if (comment.ipAddress) transformedComment.ipAddress = comment.ipAddress;
      if (comment.userAgent) transformedComment.userAgent = comment.userAgent;

      commentMap.set(comment.id, transformedComment);
    });

    // Second pass: build the tree structure
    allComments.forEach(comment => {
      const transformedComment = commentMap.get(comment.id)!;
      
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(transformedComment);
        }
      } else {
        rootComments.push(transformedComment);
      }
    });

    return rootComments;
  }

  /**
   * Update comment status (for moderation)
   */
  static async updateCommentStatus(
    commentId: string,
    status: 'pending' | 'approved' | 'rejected' | 'spam'
  ): Promise<Comment | null> {
    const [updatedComment] = await db
      .update(comments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(comments.id, commentId))
      .returning();

    if (!updatedComment) {
      return null;
    }

    const result: Comment = {
      id: updatedComment.id,
      blogPostId: updatedComment.blogPostId,
      authorName: updatedComment.authorName,
      authorEmail: updatedComment.authorEmail,
      content: updatedComment.content,
      status: updatedComment.status as 'pending' | 'approved' | 'rejected' | 'spam',
      isVerified: updatedComment.isVerified,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
    };

    if (updatedComment.parentId) result.parentId = updatedComment.parentId;
    if (updatedComment.authorWebsite) result.authorWebsite = updatedComment.authorWebsite;
    if (updatedComment.ipAddress) result.ipAddress = updatedComment.ipAddress;
    if (updatedComment.userAgent) result.userAgent = updatedComment.userAgent;

    return result;
  }

  /**
   * Delete a comment and all its replies
   */
  static async deleteComment(commentId: string): Promise<boolean> {
    // Check if comment exists
    const [existingComment] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existingComment) {
      return false;
    }

    // Delete the comment (replies will be deleted via cascade)
    await db.delete(comments).where(eq(comments.id, commentId));
    return true;
  }

  /**
   * Get comment statistics
   */
  static async getCommentStats(): Promise<{
    totalComments: number;
    pendingComments: number;
    approvedComments: number;
    rejectedComments: number;
    spamComments: number;
  }> {
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments);

    const [pendingResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.status, 'pending'));

    const [approvedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.status, 'approved'));

    const [rejectedResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.status, 'rejected'));

    const [spamResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.status, 'spam'));

    return {
      totalComments: totalResult?.count || 0,
      pendingComments: pendingResult?.count || 0,
      approvedComments: approvedResult?.count || 0,
      rejectedComments: rejectedResult?.count || 0,
      spamComments: spamResult?.count || 0,
    };
  }

  /**
   * Bulk update comment status
   */
  static async bulkUpdateCommentStatus(
    commentIds: string[],
    status: 'pending' | 'approved' | 'rejected' | 'spam'
  ): Promise<number> {
    if (commentIds.length === 0) {
      return 0;
    }

    const result = await db
      .update(comments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(sql`${comments.id} = ANY(${commentIds})`)
      .returning({ id: comments.id });

    return result.length;
  }
}