import { eq, sql, inArray, or } from 'drizzle-orm';
import { db, mediaAssets, pages } from '../db/index.js';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

export interface MediaUsage {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  usageCount: number;
  usageType: 'content' | 'featured-image' | 'component-prop';
}

export interface MediaUsageResult {
  pages: MediaUsage[];
  totalUsages: number;
}

export class MediaService {
  private uploadDir: string;

  constructor(uploadDir: string = process.env.UPLOAD_DIR || './uploads') {
    this.uploadDir = uploadDir;
  }

  /**
   * Find all pages that reference a specific media asset
   */
  async findMediaUsage(assetId: string): Promise<MediaUsageResult> {
    try {
      // Get the media asset to find its URL
      const [asset] = await db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.id, assetId))
        .limit(1);

      if (!asset) {
        return { pages: [], totalUsages: 0 };
      }

      // Search for the asset URL in page content and featured images
      const pagesWithUsage = await db
        .select({
          id: pages.id,
          title: pages.title,
          slug: pages.slug,
          content: pages.content,
        })
        .from(pages)
        .where(
          or(
            // Search in JSONB content for the asset URL
            sql`${pages.content}::text LIKE ${`%${asset.url}%`}`,
            // Search in SEO data for featured images
            sql`${pages.seoData}::text LIKE ${`%${asset.url}%`}`
          )
        );

      const usageResults: MediaUsage[] = [];
      let totalUsages = 0;

      for (const page of pagesWithUsage) {
        const contentStr = JSON.stringify(page.content);
        const usageCount = (contentStr.match(new RegExp(asset.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        
        if (usageCount > 0) {
          usageResults.push({
            pageId: page.id,
            pageTitle: page.title,
            pageSlug: page.slug,
            usageCount,
            usageType: 'content', // Could be enhanced to detect specific usage types
          });
          totalUsages += usageCount;
        }
      }

      return {
        pages: usageResults,
        totalUsages,
      };
    } catch (error) {
      console.error('Error finding media usage:', error);
      return { pages: [], totalUsages: 0 };
    }
  }

  /**
   * Generate responsive image variants for different screen sizes
   */
  async generateResponsiveVariants(filePath: string, filename: string): Promise<string[]> {
    const variants: string[] = [];
    const sizes = [
      { width: 320, suffix: 'mobile' },
      { width: 768, suffix: 'tablet' },
      { width: 1024, suffix: 'desktop' },
      { width: 1920, suffix: 'large' },
    ];

    try {
      const image = sharp(filePath);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return variants;
      }

      for (const size of sizes) {
        // Only generate variant if original is larger
        if (metadata.width > size.width) {
          const ext = path.extname(filename);
          const name = path.basename(filename, ext);
          const variantFilename = `${name}-${size.suffix}${ext}`;
          const variantPath = path.join(this.uploadDir, 'variants', variantFilename);

          // Ensure variants directory exists
          await fs.mkdir(path.join(this.uploadDir, 'variants'), { recursive: true });

          await image
            .resize(size.width, null, { 
              withoutEnlargement: true,
              fit: 'inside'
            })
            .jpeg({ quality: 85 })
            .toFile(variantPath);

          variants.push(`/uploads/variants/${variantFilename}`);
        }
      }
    } catch (error) {
      console.error('Error generating responsive variants:', error);
    }

    return variants;
  }

  /**
   * Convert image to modern formats (WebP, AVIF)
   */
  async generateModernFormats(filePath: string, filename: string): Promise<{ webp?: string; avif?: string }> {
    const formats: { webp?: string; avif?: string } = {};

    try {
      const image = sharp(filePath);
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);

      // Ensure modern formats directory exists
      await fs.mkdir(path.join(this.uploadDir, 'modern'), { recursive: true });

      // Generate WebP
      const webpFilename = `${name}.webp`;
      const webpPath = path.join(this.uploadDir, 'modern', webpFilename);
      await image.clone().webp({ quality: 85 }).toFile(webpPath);
      formats.webp = `/uploads/modern/${webpFilename}`;

      // Generate AVIF (more efficient but newer format)
      const avifFilename = `${name}.avif`;
      const avifPath = path.join(this.uploadDir, 'modern', avifFilename);
      await image.clone().avif({ quality: 80 }).toFile(avifPath);
      formats.avif = `/uploads/modern/${avifFilename}`;
    } catch (error) {
      console.error('Error generating modern formats:', error);
    }

    return formats;
  }

  /**
   * Optimize image by reducing file size while maintaining quality
   */
  async optimizeImage(filePath: string, mimeType: string): Promise<void> {
    try {
      const image = sharp(filePath);
      
      switch (mimeType) {
        case 'image/jpeg':
          await image
            .jpeg({ 
              quality: 85,
              progressive: true,
              mozjpeg: true 
            })
            .toFile(filePath + '.optimized');
          break;
        case 'image/png':
          await image
            .png({ 
              quality: 85,
              compressionLevel: 9,
              progressive: true 
            })
            .toFile(filePath + '.optimized');
          break;
        case 'image/webp':
          await image
            .webp({ 
              quality: 85,
              effort: 6 
            })
            .toFile(filePath + '.optimized');
          break;
        default:
          return; // No optimization for unsupported formats
      }

      // Replace original with optimized version
      await fs.rename(filePath + '.optimized', filePath);
    } catch (error) {
      console.error('Error optimizing image:', error);
      // Clean up optimized file if it exists
      try {
        await fs.unlink(filePath + '.optimized');
      } catch {}
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byMimeType: Record<string, { count: number; size: number }>;
    byFolder: Record<string, { count: number; size: number }>;
  }> {
    try {
      const assets = await db.select().from(mediaAssets);

      const stats = {
        totalFiles: assets.length,
        totalSize: assets.reduce((sum, asset) => sum + asset.size, 0),
        byMimeType: {} as Record<string, { count: number; size: number }>,
        byFolder: {} as Record<string, { count: number; size: number }>,
      };

      // Group by MIME type
      for (const asset of assets) {
        const mimeType = asset.mimeType;
        if (!stats.byMimeType[mimeType]) {
          stats.byMimeType[mimeType] = { count: 0, size: 0 };
        }
        stats.byMimeType[mimeType].count++;
        stats.byMimeType[mimeType].size += asset.size;
      }

      // Group by folder
      for (const asset of assets) {
        const folder = asset.folder || 'root';
        if (!stats.byFolder[folder]) {
          stats.byFolder[folder] = { count: 0, size: 0 };
        }
        stats.byFolder[folder].count++;
        stats.byFolder[folder].size += asset.size;
      }

      return stats;
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        byMimeType: {},
        byFolder: {},
      };
    }
  }

  /**
   * Clean up unused media assets
   */
  async cleanupUnusedAssets(): Promise<{ deletedCount: number; freedSpace: number }> {
    try {
      const allAssets = await db.select().from(mediaAssets);
      const unusedAssets: typeof allAssets = [];
      let freedSpace = 0;

      for (const asset of allAssets) {
        const usage = await this.findMediaUsage(asset.id);
        if (usage.totalUsages === 0) {
          unusedAssets.push(asset);
          freedSpace += asset.size;
        }
      }

      // Delete unused assets
      if (unusedAssets.length > 0) {
        const unusedIds = unusedAssets.map(asset => asset.id);
        
        // Delete files from disk
        for (const asset of unusedAssets) {
          try {
            const filePath = path.join(this.uploadDir, asset.filename);
            await fs.unlink(filePath);

            // Delete thumbnail if it exists
            if (asset.thumbnailUrl) {
              const thumbnailFilename = path.basename(asset.thumbnailUrl);
              const thumbnailPath = path.join(this.uploadDir, 'thumbnails', thumbnailFilename);
              await fs.unlink(thumbnailPath).catch(() => {});
            }
          } catch (error) {
            console.error(`Error deleting file for asset ${asset.id}:`, error);
          }
        }

        // Delete from database
        await db.delete(mediaAssets).where(inArray(mediaAssets.id, unusedIds));
      }

      return {
        deletedCount: unusedAssets.length,
        freedSpace,
      };
    } catch (error) {
      console.error('Error cleaning up unused assets:', error);
      return { deletedCount: 0, freedSpace: 0 };
    }
  }
}

export const mediaService = new MediaService();