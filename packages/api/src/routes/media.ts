import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, desc, asc, and, like, sql, inArray, or } from 'drizzle-orm';
import { db, mediaAssets } from '../db/index';
import { mediaService } from '../services/media-service';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

// Request schemas for API endpoints

const MediaUpdateSchema = z.object({
  altText: z.string().max(200, 'Alt text too long').optional(),
  tags: z.array(z.string()).optional(),
  folder: z.string().optional(),
});

const MediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  mimeType: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(['filename', 'size', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const BulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1, 'Media asset ID is required')).min(1, 'At least one ID is required'),
});

const BulkUpdateSchema = z.object({
  ids: z.array(z.string().min(1, 'Media asset ID is required')).min(1, 'At least one ID is required'),
  updates: z.object({
    tags: z.array(z.string()).optional(),
    folder: z.string().optional(),
  }),
});

// Supported image formats for optimization
const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const THUMBNAIL_SIZE = 300;

export default async function mediaRoutes(fastify: FastifyInstance) {
  // Ensure upload directory exists
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(path.join(UPLOAD_DIR, 'thumbnails'), { recursive: true });

  // Helper function to generate unique filename
  function generateUniqueFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const timestamp = Date.now();
    const uuid = randomUUID().slice(0, 8);
    return `${name}-${timestamp}-${uuid}${ext}`;
  }

  // Helper function to optimize and generate thumbnails for images
  async function processImage(filePath: string, mimeType: string): Promise<{ thumbnailUrl?: string; width?: number; height?: number }> {
    if (!SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
      return {};
    }

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();
      
      // Generate thumbnail
      const thumbnailFilename = `thumb_${path.basename(filePath)}`;
      const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', thumbnailFilename);
      
      await image
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      const result: { thumbnailUrl?: string; width?: number; height?: number } = {
        thumbnailUrl: `/uploads/thumbnails/${thumbnailFilename}`,
      };
      
      if (metadata.width) result.width = metadata.width;
      if (metadata.height) result.height = metadata.height;
      
      return result;
    } catch (error) {
      fastify.log.error(error, 'Error processing image');
      return {};
    }
  }

  // Upload single or multiple files
  fastify.post(
    '/upload',
    {
      schema: {
        tags: ['Media'],
        summary: 'Upload media files',
        description: 'Upload one or more media files with automatic optimization and thumbnail generation',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        consumes: ['multipart/form-data'],
        body: {
          type: 'object',
          properties: {
            files: {
              type: 'array',
              items: { type: 'string', format: 'binary' },
            },
            altText: { type: 'string', maxLength: 200 },
            tags: { type: 'array', items: { type: 'string' } },
            folder: { type: 'string' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  assets: { type: 'array', items: { type: 'object' } },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          400: { $ref: '#/components/schemas/Error' },
          413: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await (request as any).file();
        
        if (!data) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'NO_FILE_UPLOADED',
              message: 'No file was uploaded',
            },
            timestamp: new Date().toISOString(),
          });
        }

        const filename = generateUniqueFilename(data.filename);
        const filePath = path.join(UPLOAD_DIR, filename);
        
        // Save file to disk
        await pipeline(data.file, createWriteStream(filePath));
        
        // Get file stats
        const stats = await fs.stat(filePath);

        // Check file size after saving
        if (stats.size > MAX_FILE_SIZE) {
          // Delete the file if it's too large
          await fs.unlink(filePath);
          return reply.code(413).send({
            success: false,
            error: {
              code: 'FILE_TOO_LARGE',
              message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
            },
            timestamp: new Date().toISOString(),
          });
        }
        
        // Process image if applicable
        const imageData = await processImage(filePath, data.mimetype);

        // Parse additional fields from form data
        const fields = data.fields as any;
        const altText = fields?.altText?.value;
        const tags = fields?.tags?.value ? JSON.parse(fields.tags.value) : [];
        const folder = fields?.folder?.value;

        // Create media asset record
        const [newAsset] = await db
          .insert(mediaAssets)
          .values({
            filename,
            originalName: data.filename,
            mimeType: data.mimetype,
            size: stats.size,
            url: `/uploads/${filename}`,
            thumbnailUrl: imageData.thumbnailUrl || null,
            altText: altText || null,
            tags,
            folder: folder || null,
          })
          .returning();

        reply.code(201);
        fastify.sendSuccess(
          reply,
          { assets: [{ ...newAsset, ...imageData }] },
          'File uploaded successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error uploading file');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: 'Failed to upload file',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get all media assets with filtering and pagination
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Media'],
        summary: 'Get media assets',
        description: 'Retrieve media assets with filtering, searching, and pagination',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            search: { type: 'string' },
            mimeType: { type: 'string' },
            folder: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            sortBy: { type: 'string', enum: ['filename', 'size', 'createdAt', 'updatedAt'], default: 'createdAt' },
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
      preHandler: [fastify.authenticate, fastify.validate({ querystring: MediaQuerySchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as z.infer<typeof MediaQuerySchema>;

      try {
        // Build where conditions
        const conditions = [];
        
        if (query.search) {
          conditions.push(
            or(
              like(mediaAssets.filename, `%${query.search}%`),
              like(mediaAssets.originalName, `%${query.search}%`),
              like(mediaAssets.altText, `%${query.search}%`)
            )
          );
        }

        if (query.mimeType) {
          conditions.push(like(mediaAssets.mimeType, `${query.mimeType}%`));
        }

        if (query.folder !== undefined) {
          if (query.folder === '') {
            conditions.push(sql`${mediaAssets.folder} IS NULL`);
          } else {
            conditions.push(eq(mediaAssets.folder, query.folder));
          }
        }

        if (query.tags && query.tags.length > 0) {
          // Check if any of the provided tags exist in the asset's tags array
          conditions.push(
            sql`${mediaAssets.tags} && ${JSON.stringify(query.tags)}`
          );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Build order by clause
        let orderBy;
        switch (query.sortBy) {
          case 'filename':
            orderBy = query.sortOrder === 'asc' ? asc(mediaAssets.filename) : desc(mediaAssets.filename);
            break;
          case 'size':
            orderBy = query.sortOrder === 'asc' ? asc(mediaAssets.size) : desc(mediaAssets.size);
            break;
          case 'updatedAt':
            orderBy = query.sortOrder === 'asc' ? asc(mediaAssets.updatedAt) : desc(mediaAssets.updatedAt);
            break;
          default:
            orderBy = query.sortOrder === 'asc' ? asc(mediaAssets.createdAt) : desc(mediaAssets.createdAt);
        }

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(mediaAssets)
          .where(whereClause);
        
        const count = countResult[0]?.count || 0;

        // Get paginated results
        const offset = (query.page - 1) * query.pageSize;
        const assetsData = await db
          .select()
          .from(mediaAssets)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(query.pageSize)
          .offset(offset);

        const totalPages = Math.ceil(count / query.pageSize);

        const paginatedResponse = {
          items: assetsData,
          total: count,
          page: query.page,
          pageSize: query.pageSize,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        };

        fastify.sendSuccess(reply, paginatedResponse);
      } catch (error) {
        fastify.log.error(error, 'Error fetching media assets');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch media assets',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get a single media asset by ID
  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Media'],
        summary: 'Get media asset by ID',
        description: 'Retrieve a single media asset by its ID',
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
              data: {
                type: 'object',
                properties: {
                  asset: { type: 'object' },
                },
              },
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
        const [asset] = await db
          .select()
          .from(mediaAssets)
          .where(eq(mediaAssets.id, id))
          .limit(1);

        if (!asset) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'MEDIA_ASSET_NOT_FOUND',
              message: 'Media asset not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        fastify.sendSuccess(reply, { asset });
      } catch (error) {
        fastify.log.error(error, 'Error fetching media asset');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch media asset',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Update a media asset
  fastify.put(
    '/:id',
    {
      schema: {
        tags: ['Media'],
        summary: 'Update media asset',
        description: 'Update media asset metadata (alt text, tags, folder)',
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
            altText: { type: 'string', maxLength: 200 },
            tags: { type: 'array', items: { type: 'string' } },
            folder: { type: 'string' },
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
                  asset: { type: 'object' },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          404: { $ref: '#/components/schemas/Error' },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: MediaUpdateSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const updateData = request.body as z.infer<typeof MediaUpdateSchema>;

      try {
        // Check if asset exists
        const [existingAsset] = await db
          .select()
          .from(mediaAssets)
          .where(eq(mediaAssets.id, id))
          .limit(1);

        if (!existingAsset) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'MEDIA_ASSET_NOT_FOUND',
              message: 'Media asset not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Prepare update data
        const updateValues: any = {
          updatedAt: new Date(),
        };

        if (updateData.altText !== undefined) updateValues.altText = updateData.altText;
        if (updateData.tags !== undefined) updateValues.tags = updateData.tags;
        if (updateData.folder !== undefined) updateValues.folder = updateData.folder;

        // Update the asset
        const [updatedAsset] = await db
          .update(mediaAssets)
          .set(updateValues)
          .where(eq(mediaAssets.id, id))
          .returning();

        fastify.sendSuccess(
          reply,
          { asset: updatedAsset },
          'Media asset updated successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error updating media asset');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update media asset',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Delete a media asset
  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Media'],
        summary: 'Delete media asset',
        description: 'Delete a media asset and its associated files',
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
        // Check if asset exists
        const [existingAsset] = await db
          .select()
          .from(mediaAssets)
          .where(eq(mediaAssets.id, id))
          .limit(1);

        if (!existingAsset) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'MEDIA_ASSET_NOT_FOUND',
              message: 'Media asset not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Delete files from disk
        try {
          const filePath = path.join(UPLOAD_DIR, existingAsset.filename);
          await fs.unlink(filePath);

          // Delete thumbnail if it exists
          if (existingAsset.thumbnailUrl) {
            const thumbnailFilename = path.basename(existingAsset.thumbnailUrl);
            const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', thumbnailFilename);
            await fs.unlink(thumbnailPath).catch(() => {}); // Ignore errors for thumbnail deletion
          }
        } catch (error) {
          fastify.log.warn(error, 'Error deleting files from disk');
          // Continue with database deletion even if file deletion fails
        }

        // Delete from database
        await db.delete(mediaAssets).where(eq(mediaAssets.id, id));

        fastify.sendSuccess(reply, null, 'Media asset deleted successfully');
      } catch (error) {
        fastify.log.error(error, 'Error deleting media asset');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete media asset',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Bulk delete media assets
  fastify.post(
    '/bulk-delete',
    {
      schema: {
        tags: ['Media'],
        summary: 'Bulk delete media assets',
        description: 'Delete multiple media assets at once',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
          },
          required: ['ids'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  deletedCount: { type: 'integer' },
                  failedIds: { type: 'array', items: { type: 'string' } },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: [fastify.authenticate, fastify.validate({ body: BulkDeleteSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ids } = request.body as z.infer<typeof BulkDeleteSchema>;

      try {
        // Get all assets to delete
        const assetsToDelete = await db
          .select()
          .from(mediaAssets)
          .where(inArray(mediaAssets.id, ids));

        const failedIds: string[] = [];
        let deletedCount = 0;

        // Delete files from disk
        for (const asset of assetsToDelete) {
          try {
            const filePath = path.join(UPLOAD_DIR, asset.filename);
            await fs.unlink(filePath);

            // Delete thumbnail if it exists
            if (asset.thumbnailUrl) {
              const thumbnailFilename = path.basename(asset.thumbnailUrl);
              const thumbnailPath = path.join(UPLOAD_DIR, 'thumbnails', thumbnailFilename);
              await fs.unlink(thumbnailPath).catch(() => {}); // Ignore errors for thumbnail deletion
            }
          } catch (error) {
            fastify.log.warn(error, `Error deleting files for asset ${asset.id}`);
            failedIds.push(asset.id);
          }
        }

        // Delete from database (only successful file deletions)
        const successfulIds = assetsToDelete
          .filter(asset => !failedIds.includes(asset.id))
          .map(asset => asset.id);

        if (successfulIds.length > 0) {
          await db.delete(mediaAssets).where(inArray(mediaAssets.id, successfulIds));
          deletedCount = successfulIds.length;
        }

        fastify.sendSuccess(
          reply,
          { deletedCount, failedIds },
          `Successfully deleted ${deletedCount} media assets`
        );
      } catch (error) {
        fastify.log.error(error, 'Error bulk deleting media assets');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to bulk delete media assets',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Bulk update media assets
  fastify.post(
    '/bulk-update',
    {
      schema: {
        tags: ['Media'],
        summary: 'Bulk update media assets',
        description: 'Update multiple media assets at once',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
            updates: {
              type: 'object',
              properties: {
                tags: { type: 'array', items: { type: 'string' } },
                folder: { type: 'string' },
              },
            },
          },
          required: ['ids', 'updates'],
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
      preHandler: [fastify.authenticate, fastify.validate({ body: BulkUpdateSchema })],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ids, updates } = request.body as z.infer<typeof BulkUpdateSchema>;

      try {
        // Prepare update data
        const updateValues: any = {
          updatedAt: new Date(),
        };

        if (updates.tags !== undefined) updateValues.tags = updates.tags;
        if (updates.folder !== undefined) updateValues.folder = updates.folder;

        // Update assets
        await db
          .update(mediaAssets)
          .set(updateValues)
          .where(inArray(mediaAssets.id, ids));

        fastify.sendSuccess(
          reply,
          { updatedCount: ids.length },
          `Successfully updated ${ids.length} media assets`
        );
      } catch (error) {
        fastify.log.error(error, 'Error bulk updating media assets');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to bulk update media assets',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get media usage across pages and components
  fastify.get(
    '/:id/usage',
    {
      schema: {
        tags: ['Media'],
        summary: 'Get media asset usage',
        description: 'Get information about where a media asset is being used',
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
              data: {
                type: 'object',
                properties: {
                  usage: {
                    type: 'object',
                    properties: {
                      pages: { type: 'array', items: { type: 'object' } },
                      totalUsages: { type: 'integer' },
                    },
                  },
                },
              },
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
        // Check if asset exists
        const [asset] = await db
          .select()
          .from(mediaAssets)
          .where(eq(mediaAssets.id, id))
          .limit(1);

        if (!asset) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'MEDIA_ASSET_NOT_FOUND',
              message: 'Media asset not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Use media service to find usage
        const usage = await mediaService.findMediaUsage(id);

        fastify.sendSuccess(reply, { usage });
      } catch (error) {
        fastify.log.error(error, 'Error fetching media asset usage');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch media asset usage',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get folder structure
  fastify.get(
    '/folders',
    {
      schema: {
        tags: ['Media'],
        summary: 'Get folder structure',
        description: 'Get the folder structure for media organization',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  folders: { type: 'array', items: { type: 'string' } },
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
        // Get unique folder names
        const foldersResult = await db
          .selectDistinct({ folder: mediaAssets.folder })
          .from(mediaAssets)
          .where(sql`${mediaAssets.folder} IS NOT NULL`);

        const folders = foldersResult
          .map(row => row.folder)
          .filter(Boolean)
          .sort();

        fastify.sendSuccess(reply, { folders });
      } catch (error) {
        fastify.log.error(error, 'Error fetching folders');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch folders',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Advanced search endpoint
  fastify.post(
    '/search',
    {
      schema: {
        tags: ['Media'],
        summary: 'Advanced media search',
        description: 'Search media assets with advanced filters and full-text search',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        body: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            filters: {
              type: 'object',
              properties: {
                mimeTypes: { type: 'array', items: { type: 'string' } },
                folders: { type: 'array', items: { type: 'string' } },
                tags: { type: 'array', items: { type: 'string' } },
                sizeRange: {
                  type: 'object',
                  properties: {
                    min: { type: 'integer', minimum: 0 },
                    max: { type: 'integer', minimum: 0 },
                  },
                },
                dateRange: {
                  type: 'object',
                  properties: {
                    from: { type: 'string', format: 'date-time' },
                    to: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
            page: { type: 'integer', minimum: 1, default: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            sortBy: { type: 'string', enum: ['filename', 'size', 'createdAt', 'updatedAt'], default: 'createdAt' },
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
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { query: searchQuery, filters = {}, page = 1, pageSize = 20, sortBy = 'createdAt', sortOrder = 'desc' } = request.body as any;

      try {
        // Build where conditions
        const conditions = [];
        
        // Text search
        if (searchQuery) {
          conditions.push(
            or(
              like(mediaAssets.filename, `%${searchQuery}%`),
              like(mediaAssets.originalName, `%${searchQuery}%`),
              like(mediaAssets.altText, `%${searchQuery}%`)
            )
          );
        }

        // MIME type filter
        if (filters.mimeTypes && filters.mimeTypes.length > 0) {
          const mimeConditions = filters.mimeTypes.map((mimeType: string) => 
            like(mediaAssets.mimeType, `${mimeType}%`)
          );
          conditions.push(or(...mimeConditions));
        }

        // Folder filter
        if (filters.folders && filters.folders.length > 0) {
          const folderConditions = filters.folders.map((folder: string) => 
            folder === '' ? sql`${mediaAssets.folder} IS NULL` : eq(mediaAssets.folder, folder)
          );
          conditions.push(or(...folderConditions));
        }

        // Tags filter
        if (filters.tags && filters.tags.length > 0) {
          conditions.push(
            sql`${mediaAssets.tags} && ${JSON.stringify(filters.tags)}`
          );
        }

        // Size range filter
        if (filters.sizeRange) {
          if (filters.sizeRange.min !== undefined) {
            conditions.push(sql`${mediaAssets.size} >= ${filters.sizeRange.min}`);
          }
          if (filters.sizeRange.max !== undefined) {
            conditions.push(sql`${mediaAssets.size} <= ${filters.sizeRange.max}`);
          }
        }

        // Date range filter
        if (filters.dateRange) {
          if (filters.dateRange.from) {
            conditions.push(sql`${mediaAssets.createdAt} >= ${new Date(filters.dateRange.from)}`);
          }
          if (filters.dateRange.to) {
            conditions.push(sql`${mediaAssets.createdAt} <= ${new Date(filters.dateRange.to)}`);
          }
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Build order by clause
        let orderBy;
        switch (sortBy) {
          case 'filename':
            orderBy = sortOrder === 'asc' ? asc(mediaAssets.filename) : desc(mediaAssets.filename);
            break;
          case 'size':
            orderBy = sortOrder === 'asc' ? asc(mediaAssets.size) : desc(mediaAssets.size);
            break;
          case 'updatedAt':
            orderBy = sortOrder === 'asc' ? asc(mediaAssets.updatedAt) : desc(mediaAssets.updatedAt);
            break;
          default:
            orderBy = sortOrder === 'asc' ? asc(mediaAssets.createdAt) : desc(mediaAssets.createdAt);
        }

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(mediaAssets)
          .where(whereClause);
        
        const count = countResult[0]?.count || 0;

        // Get paginated results
        const offset = (page - 1) * pageSize;
        const assetsData = await db
          .select()
          .from(mediaAssets)
          .where(whereClause)
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset);

        const totalPages = Math.ceil(count / pageSize);

        const paginatedResponse = {
          items: assetsData,
          total: count,
          page,
          pageSize,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        };

        fastify.sendSuccess(reply, paginatedResponse);
      } catch (error) {
        fastify.log.error(error, 'Error performing advanced search');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to perform advanced search',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get all unique tags
  fastify.get(
    '/tags',
    {
      schema: {
        tags: ['Media'],
        summary: 'Get all media tags',
        description: 'Get all unique tags used in media assets',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  tags: { type: 'array', items: { type: 'string' } },
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
        // Get all assets with tags
        const assetsWithTags = await db
          .select({ tags: mediaAssets.tags })
          .from(mediaAssets)
          .where(sql`jsonb_array_length(${mediaAssets.tags}) > 0`);

        // Flatten and deduplicate tags
        const allTags = new Set<string>();
        for (const asset of assetsWithTags) {
          const tags = asset.tags as string[];
          tags.forEach(tag => allTags.add(tag));
        }

        const uniqueTags = Array.from(allTags).sort();

        fastify.sendSuccess(reply, { tags: uniqueTags });
      } catch (error) {
        fastify.log.error(error, 'Error fetching tags');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch tags',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Get storage statistics
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Media'],
        summary: 'Get storage statistics',
        description: 'Get detailed statistics about media storage usage',
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
                      totalFiles: { type: 'integer' },
                      totalSize: { type: 'integer' },
                      byMimeType: { type: 'object' },
                      byFolder: { type: 'object' },
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
        const stats = await mediaService.getStorageStats();
        fastify.sendSuccess(reply, { stats });
      } catch (error) {
        fastify.log.error(error, 'Error fetching storage stats');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to fetch storage statistics',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Clean up unused media assets
  fastify.post(
    '/cleanup',
    {
      schema: {
        tags: ['Media'],
        summary: 'Clean up unused media assets',
        description: 'Remove media assets that are not referenced in any pages or components',
        security: [{ bearerAuth: [] }, { cookieAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  cleanup: {
                    type: 'object',
                    properties: {
                      deletedCount: { type: 'integer' },
                      freedSpace: { type: 'integer' },
                    },
                  },
                },
              },
              message: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      preHandler: fastify.authenticate,
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const cleanup = await mediaService.cleanupUnusedAssets();
        
        const message = cleanup.deletedCount > 0 
          ? `Cleaned up ${cleanup.deletedCount} unused assets, freed ${(cleanup.freedSpace / (1024 * 1024)).toFixed(2)}MB`
          : 'No unused assets found';

        fastify.sendSuccess(reply, { cleanup }, message);
      } catch (error) {
        fastify.log.error(error, 'Error cleaning up unused assets');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to clean up unused assets',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Optimize existing media asset
  fastify.post(
    '/:id/optimize',
    {
      schema: {
        tags: ['Media'],
        summary: 'Optimize media asset',
        description: 'Optimize an existing media asset by reducing file size and generating modern formats',
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
              data: {
                type: 'object',
                properties: {
                  asset: { type: 'object' },
                  variants: { type: 'array', items: { type: 'string' } },
                  modernFormats: { type: 'object' },
                },
              },
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
        // Check if asset exists
        const [asset] = await db
          .select()
          .from(mediaAssets)
          .where(eq(mediaAssets.id, id))
          .limit(1);

        if (!asset) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'MEDIA_ASSET_NOT_FOUND',
              message: 'Media asset not found',
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Only optimize images
        if (!SUPPORTED_IMAGE_FORMATS.includes(asset.mimeType)) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'UNSUPPORTED_FORMAT',
              message: 'Asset format is not supported for optimization',
            },
            timestamp: new Date().toISOString(),
          });
        }

        const filePath = path.join(UPLOAD_DIR, asset.filename);

        // Optimize the original image
        await mediaService.optimizeImage(filePath, asset.mimeType);

        // Generate responsive variants
        const variants = await mediaService.generateResponsiveVariants(filePath, asset.filename);

        // Generate modern formats
        const modernFormats = await mediaService.generateModernFormats(filePath, asset.filename);

        // Update file size in database
        const stats = await fs.stat(filePath);
        const [updatedAsset] = await db
          .update(mediaAssets)
          .set({ 
            size: stats.size,
            updatedAt: new Date() 
          })
          .where(eq(mediaAssets.id, id))
          .returning();

        fastify.sendSuccess(
          reply,
          { 
            asset: updatedAsset, 
            variants,
            modernFormats 
          },
          'Media asset optimized successfully'
        );
      } catch (error) {
        fastify.log.error(error, 'Error optimizing media asset');
        return reply.code(500).send({
          success: false,
          error: {
            code: 'OPTIMIZATION_FAILED',
            message: 'Failed to optimize media asset',
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
}