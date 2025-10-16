// Component preview generation system
import { WrappedComponent } from '@oldworldcharm/shared';
import { PreviewOptions, PreviewResult, PreviewCacheEntry } from './types';

/**
 * Component preview generator
 */
export class PreviewGenerator {
  private cache = new Map<string, PreviewCacheEntry>();
  private readonly cacheTimeout = 1000 * 60 * 60; // 1 hour

  /**
   * Generate preview for a component
   */
  async generatePreview(
    component: WrappedComponent,
    options: PreviewOptions = {}
  ): Promise<PreviewResult> {
    const cacheKey = this.getCacheKey(component, options);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached.result;
    }

    // Generate new preview
    const result = await this.createPreview(component, options);
    
    // Cache the result
    this.setCache(cacheKey, result, options);
    
    return result;
  }

  /**
   * Create preview image for component
   */
  private async createPreview(
    component: WrappedComponent,
    options: PreviewOptions
  ): Promise<PreviewResult> {
    const {
      width = 200,
      height = 150,
      backgroundColor = '#ffffff',
      scale = 1,
      props = {},
    } = options;

    try {
      // In a real implementation, this would:
      // 1. Create a virtual DOM with the component
      // 2. Render it with the provided props
      // 3. Take a screenshot using puppeteer or similar
      // 4. Return the image URL
      
      // For now, we'll return a placeholder
      const placeholderUrl = this.generatePlaceholderUrl(component, { width, height });
      
      return {
        imageUrl: placeholderUrl,
        dimensions: { width, height },
        timestamp: Date.now(),
        componentId: component.id,
      };
    } catch (error) {
      console.error('Failed to generate preview for component:', component.id, error);
      
      // Return error placeholder
      return {
        imageUrl: this.generateErrorPlaceholder(component, { width, height }),
        dimensions: { width, height },
        timestamp: Date.now(),
        componentId: component.id,
      };
    }
  }

  /**
   * Generate placeholder URL for component
   */
  private generatePlaceholderUrl(
    component: WrappedComponent,
    dimensions: { width: number; height: number }
  ): string {
    const { width, height } = dimensions;
    const text = encodeURIComponent(component.displayName);
    const bgColor = this.getCategoryColor(component.category);
    
    return `https://via.placeholder.com/${width}x${height}/${bgColor}/ffffff?text=${text}`;
  }

  /**
   * Generate error placeholder URL
   */
  private generateErrorPlaceholder(
    component: WrappedComponent,
    dimensions: { width: number; height: number }
  ): string {
    const { width, height } = dimensions;
    return `https://via.placeholder.com/${width}x${height}/ff6b6b/ffffff?text=Error`;
  }

  /**
   * Get color for component category
   */
  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      layout: '3B82F6',
      typography: '8B5CF6',
      forms: '10B981',
      navigation: 'F59E0B',
      media: 'EF4444',
      feedback: 'F97316',
      'data-display': '06B6D4',
      overlay: '84CC16',
    };
    
    return colors[category] || '6B7280';
  }

  /**
   * Generate cache key for component and options
   */
  private getCacheKey(component: WrappedComponent, options: PreviewOptions): string {
    const optionsHash = JSON.stringify(options);
    return `${component.id}-${component.metadata.version}-${btoa(optionsHash)}`;
  }

  /**
   * Get preview from cache
   */
  private getFromCache(cacheKey: string): PreviewCacheEntry | null {
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return entry;
  }

  /**
   * Set preview in cache
   */
  private setCache(
    cacheKey: string,
    result: PreviewResult,
    options: PreviewOptions
  ): void {
    const entry: PreviewCacheEntry = {
      result,
      options,
      expiresAt: Date.now() + this.cacheTimeout,
    };
    
    this.cache.set(cacheKey, entry);
  }

  /**
   * Clear cache for a specific component
   */
  clearComponentCache(componentId: string): void {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.result.componentId === componentId) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
  } {
    // In a real implementation, you'd track these metrics
    return {
      size: this.cache.size,
      hitRate: 0,
      totalRequests: 0,
      cacheHits: 0,
    };
  }

  /**
   * Preload previews for multiple components
   */
  async preloadPreviews(
    components: WrappedComponent[],
    options: PreviewOptions = {}
  ): Promise<PreviewResult[]> {
    const promises = components.map(component =>
      this.generatePreview(component, options)
    );
    
    return Promise.all(promises);
  }

  /**
   * Generate preview variants for different sizes
   */
  async generatePreviewVariants(
    component: WrappedComponent,
    variants: { name: string; options: PreviewOptions }[]
  ): Promise<Record<string, PreviewResult>> {
    const results: Record<string, PreviewResult> = {};
    
    for (const variant of variants) {
      results[variant.name] = await this.generatePreview(component, variant.options);
    }
    
    return results;
  }
}

// Global preview generator instance
export const previewGenerator = new PreviewGenerator();