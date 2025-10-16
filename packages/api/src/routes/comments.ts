import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { CommentsService } from '../services/comments-service.js';

// Request schemas for comment endpoints
const CreateCommentSchema = z.object({
  blogPostId: z.string().min(1, 'Blog post ID is required'),
  parentId: z.string().optional(),
  authorName: z.string().min(1, 'Author name is required').max(255, 'Author name too long'),
  authorEmail: z.string().email('Invalid email address'),
  authorWebsite: z.string().url('Invalid website URL').optional(),
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment too long'),
});

const CommentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected', 'spam']).optional(),
  blogPostId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'authorName']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const UpdateCommentStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'spam']),
});

const BulkUpdateCommentsSchema = z.object({
  commentIds: z.array(z.string().min(1, 'Comment ID is required')).min(1, 'At least one comment ID is required'),
  status: z.enum(['pending', 'approved', 'rejected', 'spam']),
});

export default async function commentRoutes(fastify: FastifyInstance) {
  // Create a new comment (public endpoint)
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Create a new comment',
        description: 'Create a new comment on a blog post',
        body: {
          type: 'object',
          properties: {
            blogPostId: { type: 'string', minLength: 1 },
            parentId: { type: 'string' },
            authorName: { type: 'string', minLength: 1, maxLength: 255 },
            authorEmail: { type: 'string', format: 'email' },
            authorWebsite: { type: 'string', format: 'uri' },
            content: { type: 'string', minLength: 1, maxLength: 2000 },
          },
          required: ['blogPostId', 'authorName', 'authorEmail', 'content'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  comment: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: { $ref: '#/components/schemas/Error' },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: [fastify.validate({ body: CreateCommentSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const commentData = request.body as z.infer<typeof CreateCommentSchema>;

      try {
        // Get IP address and user agent for spam detection
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];

        const createData: any = {
          ...commentData,
          ipAddress,
          userAgent,
        };
        
        // Remove undefined parentId to avoid TypeScript issues
        if (!createData.parentId) {
          delete createData.parentId;
        }
        
        const newComment = await CommentsService.createComment(createData);

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { comment: newComment },
          'Comment submitted successfully and is pending moderation'
        );
      } catch (error) {
        fastify.log.error(error, 'Error creating comment');
        
        if (error instanceof Error) {
          if (error.message === 'Blog post not found') {
            return reply.code(404).send({
              success: false,
              error: {
                code: 'BLOG_POST_NOT_FOUND',
                message: 'Blog post not found',
              },
              timestamp: new Date().toISOString(),
            });
          }
          
          if (error.message === 'Comments are only allowed on published blog posts') {
            return reply.code(400).send({
              success: false,
              error: {
                code: 'COMMENTS_NOT_ALLOWED',
                message: 'Comments are only allowed on published blog posts',
              },
              timestamp: new Date().toISOString(),
            });
          }
          
          if (error.message === 'Parent comment not found') {
            return reply.code(404).send({
              success: false,
              error: {
                code: 'PARENT_COMMENT_NOT_FOUND',
                message: 'Parent comment not found',
              },
              timestamp: new Date().toISOString(),
            });
          }
        }

        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create comment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get comments for a specific blog post (public endpoint)
  fastify.get(
    '/blog-post/:blogPostId',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Get comments for a blog post',
        description: 'Retrieve approved comments for a specific blog post',
        params: {
          type: 'object',
          properties: {
            blogPostId: { type: 'string', minLength: 1 },
          },
          required: ['blogPostId'],
        },
        querystring: {
          type: 'object',
          properties: {
            includeReplies: { type: 'boolean', default: true },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  comments: { type: 'array', items: { type: 'object' } },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { blogPostId } = request.params as { blogPostId: string };
      const { includeReplies = true } = request.query as { includeReplies?: boolean };

      try {
        const comments = await CommentsService.getCommentsForBlogPost(
          blogPostId,
          includeReplies
        );

        fastify.sendSuccess(reply, { comments });
      } catch (error) {
        fastify.log.error(error, 'Error fetching comments');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch comments',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get all comments with filtering and pagination (admin endpoint)
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Get all comments',
        description: 'Retrieve comments with filtering, searching, and pagination (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'spam'] },
            blogPostId: { type: 'string' },
            search: { type: 'string' },
            sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'authorName'], default: 'createdAt' },
            sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  items: { type: 'array', items: { type: 'object' } },
                  total: { type: 'integer' },
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                  totalPages: { type: 'integer' },
                  hasNext: { type: 'boolean' },
                  hasPrev: { type: 'boolean' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ querystring: CommentQuerySchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as z.infer<typeof CommentQuerySchema>;

      try {
        const filters: any = {
          blogPostId: query.blogPostId,
          search: query.search,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        };
        
        if (query.status) {
          filters.status = query.status;
        }
        
        const result = await CommentsService.getComments(
          filters,
          {
            page: query.page,
            pageSize: query.pageSize,
          }
        );

        fastify.sendSuccess(reply, result);
      } catch (error) {
        fastify.log.error(error, 'Error fetching comments');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch comments',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Update comment status (admin endpoint)
  fastify.put(
    '/:id/status',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Update comment status',
        description: 'Update the moderation status of a comment (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'spam'] },
          },
          required: ['status'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  comment: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: UpdateCommentStatusSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as z.infer<typeof UpdateCommentStatusSchema>;

      try {
        const updatedComment = await CommentsService.updateCommentStatus(id, status);

        if (!updatedComment) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'COMMENT_NOT_FOUND',
              message: 'Comment not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(
          reply,
          { comment: updatedComment },
          `Comment status updated to ${status}`
        );
      } catch (error) {
        fastify.log.error(error, 'Error updating comment status');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update comment status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Bulk update comment status (admin endpoint)
  fastify.put(
    '/bulk-status',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Bulk update comment status',
        description: 'Update the status of multiple comments at once (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            commentIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'spam'] },
          },
          required: ['commentIds', 'status'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  updatedCount: { type: 'integer' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: BulkUpdateCommentsSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { commentIds, status } = request.body as z.infer<typeof BulkUpdateCommentsSchema>;

      try {
        const updatedCount = await CommentsService.bulkUpdateCommentStatus(commentIds, status);

        fastify.sendSuccess(
          reply,
          { updatedCount },
          `${updatedCount} comments updated to ${status}`
        );
      } catch (error) {
        fastify.log.error(error, 'Error bulk updating comment status');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to bulk update comment status',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Delete a comment (admin endpoint)
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Delete a comment',
        description: 'Delete a comment and all its replies (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', minLength: 1 },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };

      try {
        const deleted = await CommentsService.deleteComment(id);

        if (!deleted) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'COMMENT_NOT_FOUND',
              message: 'Comment not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(reply, null, 'Comment deleted successfully');
      } catch (error) {
        fastify.log.error(error, 'Error deleting comment');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete comment',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get comment statistics (admin endpoint)
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Comments'],
        summary: 'Get comment statistics',
        description: 'Get comprehensive statistics about comments (admin only)',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  stats: {
                    type: 'object',
                    properties: {
                      totalComments: { type: 'integer' },
                      pendingComments: { type: 'integer' },
                      approvedComments: { type: 'integer' },
                      rejectedComments: { type: 'integer' },
                      spamComments: { type: 'integer' },
                    },
                  },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await CommentsService.getCommentStats();

        fastify.sendSuccess(reply, { stats });
      } catch (error) {
        fastify.log.error(error, 'Error fetching comment statistics');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch comment statistics',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}