// Shared utility functions
import type { 
  ComponentInstance, 
  Theme, 
  Page, 
  MediaAsset
} from '../types/index.js';

// ID Generation
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Component Manipulation Utilities
export class ComponentUtils {
  /**
   * Find a component by ID in a component tree
   */
  static findComponentById(components: ComponentInstance[], id: string): ComponentInstance | null {
    for (const component of components) {
      if (component.id === id) {
        return component;
      }
      
      if (component.children) {
        const found = this.findComponentById(component.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Find all components of a specific type
   */
  static findComponentsByType(components: ComponentInstance[], type: string): ComponentInstance[] {
    const results: ComponentInstance[] = [];
    
    for (const component of components) {
      if (component.type === type) {
        results.push(component);
      }
      
      if (component.children) {
        results.push(...this.findComponentsByType(component.children, type));
      }
    }
    
    return results;
  }

  /**
   * Get the parent component of a given component ID
   */
  static findParentComponent(
    components: ComponentInstance[], 
    childId: string
  ): ComponentInstance | null {
    for (const component of components) {
      if (component.children) {
        // Check if the child is a direct child of this component
        if (component.children.some(child => child.id === childId)) {
          return component;
        }
        
        // Recursively search in children
        const found = this.findParentComponent(component.children, childId);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * Clone a component with new IDs
   */
  static cloneComponent(component: ComponentInstance): ComponentInstance {
    const cloned: ComponentInstance = {
      id: generateId(),
      type: component.type,
      props: { ...component.props },
      ...(component.children && { children: component.children.map(child => this.cloneComponent(child)) }),
      ...(component.metadata && { metadata: component.metadata }),
    };
    
    return cloned;
  }

  /**
   * Update a component's props by ID
   */
  static updateComponentProps(
    components: ComponentInstance[], 
    id: string, 
    newProps: Record<string, unknown>
  ): ComponentInstance[] {
    return components.map(component => {
      if (component.id === id) {
        return {
          ...component,
          props: { ...component.props, ...newProps }
        };
      }
      
      if (component.children) {
        return {
          ...component,
          children: this.updateComponentProps(component.children, id, newProps)
        };
      }
      
      return component;
    });
  }

  /**
   * Remove a component by ID
   */
  static removeComponent(components: ComponentInstance[], id: string): ComponentInstance[] {
    return components
      .filter(component => component.id !== id)
      .map(component => {
        if (component.children) {
          return {
            ...component,
            children: this.removeComponent(component.children, id)
          };
        }
        return component;
      });
  }

  /**
   * Insert a component at a specific position
   */
  static insertComponent(
    components: ComponentInstance[], 
    newComponent: ComponentInstance, 
    parentId: string | null, 
    index: number
  ): ComponentInstance[] {
    if (parentId === null) {
      // Insert at root level
      const newComponents = [...components];
      newComponents.splice(index, 0, newComponent);
      return newComponents;
    }

    return components.map(component => {
      if (component.id === parentId) {
        const children = component.children || [];
        const newChildren = [...children];
        newChildren.splice(index, 0, newComponent);
        
        return {
          ...component,
          children: newChildren
        };
      }
      
      if (component.children) {
        return {
          ...component,
          children: this.insertComponent(component.children, newComponent, parentId, index)
        };
      }
      
      return component;
    });
  }

  /**
   * Move a component to a new position
   */
  static moveComponent(
    components: ComponentInstance[], 
    componentId: string, 
    newParentId: string | null, 
    newIndex: number
  ): ComponentInstance[] {
    // First, find and remove the component
    const componentToMove = this.findComponentById(components, componentId);
    if (!componentToMove) return components;

    const withoutComponent = this.removeComponent(components, componentId);
    
    // Then insert it at the new position
    return this.insertComponent(withoutComponent, componentToMove, newParentId, newIndex);
  }

  /**
   * Get component tree depth
   */
  static getComponentDepth(components: ComponentInstance[]): number {
    let maxDepth = 0;
    
    for (const component of components) {
      if (component.children && component.children.length > 0) {
        const childDepth = this.getComponentDepth(component.children);
        maxDepth = Math.max(maxDepth, childDepth + 1);
      }
    }
    
    return maxDepth;
  }

  /**
   * Flatten component tree to array
   */
  static flattenComponents(components: ComponentInstance[]): ComponentInstance[] {
    const flattened: ComponentInstance[] = [];
    
    for (const component of components) {
      flattened.push(component);
      if (component.children) {
        flattened.push(...this.flattenComponents(component.children));
      }
    }
    
    return flattened;
  }

  /**
   * Validate component tree structure
   */
  static validateComponentTree(components: ComponentInstance[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const seenIds = new Set<string>();

    const validateComponent = (component: ComponentInstance, path: string) => {
      // Check for duplicate IDs
      if (seenIds.has(component.id)) {
        errors.push(`Duplicate component ID found: ${component.id} at ${path}`);
      } else {
        seenIds.add(component.id);
      }

      // Check required fields
      if (!component.id) {
        errors.push(`Component missing ID at ${path}`);
      }
      if (!component.type) {
        errors.push(`Component missing type at ${path}`);
      }

      // Validate children
      if (component.children) {
        component.children.forEach((child, index) => {
          validateComponent(child, `${path}.children[${index}]`);
        });
      }
    };

    components.forEach((component, index) => {
      validateComponent(component, `components[${index}]`);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Theme Processing Utilities
export class ThemeUtils {
  /**
   * Generate CSS custom properties from theme
   */
  static generateCSSVariables(theme: Theme): string {
    const cssVars: string[] = [':root {'];

    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      cssVars.push(`  --color-${key}: ${value};`);
    });

    // Typography
    cssVars.push(`  --font-family: ${theme.typography.fontFamily};`);
    if (theme.typography.headingFont) {
      cssVars.push(`  --font-family-heading: ${theme.typography.headingFont};`);
    }

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      cssVars.push(`  --font-size-${key}: ${value};`);
    });

    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      cssVars.push(`  --font-weight-${key}: ${value};`);
    });

    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      cssVars.push(`  --line-height-${key}: ${value};`);
    });

    // Spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      cssVars.push(`  --spacing-${key}: ${value};`);
    });

    // Border radius
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      cssVars.push(`  --border-radius-${key}: ${value};`);
    });

    // Shadows
    Object.entries(theme.shadows).forEach(([key, value]) => {
      cssVars.push(`  --shadow-${key}: ${value};`);
    });

    cssVars.push('}');
    return cssVars.join('\n');
  }

  /**
   * Validate color contrast ratio for accessibility
   */
  static validateColorContrast(foreground: string, background: string): { ratio: number; isValid: boolean } {
    const getLuminance = (hex: string): number => {
      const rgb = this.hexToRgb(hex);
      if (!rgb) return 0;

      const { r, g, b } = rgb;
      
      const normalizeColor = (c: number): number => {
        const normalized = c / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
      };

      const rNorm = normalizeColor(r);
      const gNorm = normalizeColor(g);
      const bNorm = normalizeColor(b);
      
      return 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      ratio,
      isValid: ratio >= 4.5 // WCAG AA standard
    };
  }

  /**
   * Convert hex color to RGB
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result || result.length < 4) return null;
    
    return {
      r: parseInt(result[1]!, 16),
      g: parseInt(result[2]!, 16),
      b: parseInt(result[3]!, 16)
    };
  }

  /**
   * Convert RGB to hex color
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * Generate color palette variations
   */
  static generateColorVariations(baseColor: string): Record<string, string> {
    const rgb = this.hexToRgb(baseColor);
    if (!rgb) return {};

    const variations: Record<string, string> = {};
    const { r, g, b } = rgb;
    
    // Generate lighter variations
    for (let i = 1; i <= 4; i++) {
      const factor = i * 0.1;
      const rLight = Math.round(r + (255 - r) * factor);
      const gLight = Math.round(g + (255 - g) * factor);
      const bLight = Math.round(b + (255 - b) * factor);
      variations[`${i}00`] = this.rgbToHex(rLight, gLight, bLight);
    }

    // Base color
    variations['500'] = baseColor;

    // Generate darker variations
    for (let i = 6; i <= 9; i++) {
      const factor = (i - 5) * 0.2;
      const rDark = Math.round(r * (1 - factor));
      const gDark = Math.round(g * (1 - factor));
      const bDark = Math.round(b * (1 - factor));
      variations[`${i}00`] = this.rgbToHex(rDark, gDark, bDark);
    }

    return variations;
  }

  /**
   * Merge themes with override support
   */
  static mergeThemes(baseTheme: Theme, overrideTheme: Partial<Theme>): Theme {
    return {
      ...baseTheme,
      ...overrideTheme,
      colors: { ...baseTheme.colors, ...overrideTheme.colors },
      typography: { ...baseTheme.typography, ...overrideTheme.typography },
      spacing: { ...baseTheme.spacing, ...overrideTheme.spacing },
      borderRadius: { ...baseTheme.borderRadius, ...overrideTheme.borderRadius },
      shadows: { ...baseTheme.shadows, ...overrideTheme.shadows },
      updatedAt: new Date(),
    };
  }

  /**
   * Extract dominant colors from an image (placeholder - would need actual image processing)
   */
  static extractColorsFromImage(_imageUrl: string): Promise<string[]> {
    // This is a placeholder implementation
    // In a real application, you would use a library like node-vibrant or similar
    return Promise.resolve(['#3B82F6', '#EF4444', '#10B981', '#F59E0B']);
  }
}

// Page and Content Utilities
export class PageUtils {
  /**
   * Generate SEO-friendly slug from title
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Validate slug format
   */
  static isValidSlug(slug: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }

  /**
   * Calculate reading time for content
   */
  static calculateReadingTime(content: string, wordsPerMinute = 200): number {
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }

  /**
   * Extract text content from components for SEO
   */
  static extractTextFromComponents(components: ComponentInstance[]): string {
    const textContent: string[] = [];

    const extractText = (component: ComponentInstance) => {
      // Extract text from common text props
      if (component.props.children && typeof component.props.children === 'string') {
        textContent.push(component.props.children);
      }
      if (component.props.text && typeof component.props.text === 'string') {
        textContent.push(component.props.text);
      }
      if (component.props.content && typeof component.props.content === 'string') {
        textContent.push(component.props.content);
      }

      // Recursively extract from children
      if (component.children) {
        component.children.forEach(extractText);
      }
    };

    components.forEach(extractText);
    return textContent.join(' ');
  }

  /**
   * Generate meta description from page content
   */
  static generateMetaDescription(page: Page, maxLength = 160): string {
    const textContent = this.extractTextFromComponents(page.components);
    
    if (textContent.length <= maxLength) {
      return textContent;
    }

    // Truncate at word boundary
    const truncated = textContent.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  /**
   * Validate page structure
   */
  static validatePageStructure(page: Page): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!page.title?.trim()) {
      errors.push('Page title is required');
    }
    if (!page.slug?.trim()) {
      errors.push('Page slug is required');
    }
    if (!this.isValidSlug(page.slug)) {
      errors.push('Page slug format is invalid');
    }

    // Validate components
    const componentValidation = ComponentUtils.validateComponentTree(page.components);
    if (!componentValidation.isValid) {
      errors.push(...componentValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Media Utilities
export class MediaUtils {
  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Check if file is an image
   */
  static isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  static isVideo(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate responsive image sizes
   */
  static generateResponsiveSizes(originalWidth: number, originalHeight: number): Array<{ width: number; height: number }> {
    const aspectRatio = originalWidth / originalHeight;
    const sizes = [320, 640, 768, 1024, 1280, 1920];
    
    return sizes
      .filter(width => width <= originalWidth)
      .map(width => ({
        width,
        height: Math.round(width / aspectRatio)
      }));
  }

  /**
   * Validate media asset
   */
  static validateMediaAsset(asset: MediaAsset): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!asset.filename?.trim()) {
      errors.push('Filename is required');
    }
    if (!asset.mimeType?.trim()) {
      errors.push('MIME type is required');
    }
    if (asset.size <= 0) {
      errors.push('File size must be positive');
    }
    if (!asset.url?.trim()) {
      errors.push('URL is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// General Utility Functions
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

export const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !isEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
};

export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};