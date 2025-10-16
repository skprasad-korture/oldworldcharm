// Component metadata system for categories, props schema, and preview images
import { ComponentMetadata, ComponentCategory } from '../types';
import { WrappedComponent } from './wrapper';

/**
 * Extended metadata for component palette display
 */
export interface ComponentPaletteMetadata extends ComponentMetadata {
  /** Keywords for search functionality */
  keywords: string[];
  /** Difficulty level for new users */
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  /** Whether component is commonly used */
  popular: boolean;
  /** Component usage examples */
  examples?: ComponentExample[];
  /** Related component IDs */
  relatedComponents?: string[];
}

/**
 * Component usage example
 */
export interface ComponentExample {
  title: string;
  description: string;
  props: Record<string, unknown>;
  code?: string;
}

/**
 * Category metadata for organization
 */
export interface CategoryMetadata {
  id: ComponentCategory;
  displayName: string;
  description: string;
  icon: string;
  order: number;
  color: string;
}

/**
 * Predefined category metadata
 */
export const CATEGORY_METADATA: Record<ComponentCategory, CategoryMetadata> = {
  layout: {
    id: 'layout',
    displayName: 'Layout',
    description: 'Components for page structure and organization',
    icon: 'layout',
    order: 1,
    color: '#3B82F6',
  },
  typography: {
    id: 'typography',
    displayName: 'Typography',
    description: 'Text and heading components',
    icon: 'type',
    order: 2,
    color: '#8B5CF6',
  },
  forms: {
    id: 'forms',
    displayName: 'Forms',
    description: 'Input fields, buttons, and form controls',
    icon: 'edit',
    order: 3,
    color: '#10B981',
  },
  navigation: {
    id: 'navigation',
    displayName: 'Navigation',
    description: 'Menus, breadcrumbs, and navigation components',
    icon: 'navigation',
    order: 4,
    color: '#F59E0B',
  },
  media: {
    id: 'media',
    displayName: 'Media',
    description: 'Images, videos, and media display components',
    icon: 'image',
    order: 5,
    color: '#EF4444',
  },
  feedback: {
    id: 'feedback',
    displayName: 'Feedback',
    description: 'Alerts, notifications, and status indicators',
    icon: 'bell',
    order: 6,
    color: '#F97316',
  },
  'data-display': {
    id: 'data-display',
    displayName: 'Data Display',
    description: 'Tables, lists, and data visualization components',
    icon: 'table',
    order: 7,
    color: '#06B6D4',
  },
  overlay: {
    id: 'overlay',
    displayName: 'Overlay',
    description: 'Modals, tooltips, and overlay components',
    icon: 'layers',
    order: 8,
    color: '#84CC16',
  },
};

/**
 * Metadata builder for creating component metadata
 */
export class MetadataBuilder {
  private metadata: Partial<ComponentPaletteMetadata> = {};

  constructor(description: string) {
    this.metadata.description = description;
    this.metadata.tags = [];
    this.metadata.isContainer = false;
    this.metadata.version = '1.0.0';
    this.metadata.keywords = [];
    this.metadata.difficulty = 'beginner';
    this.metadata.popular = false;
  }

  /**
   * Set component tags
   */
  tags(tags: string[]): this {
    this.metadata.tags = tags;
    return this;
  }

  /**
   * Set preview image URL
   */
  previewImage(url: string): this {
    this.metadata.previewImage = url;
    return this;
  }

  /**
   * Mark as container component
   */
  container(isContainer = true): this {
    this.metadata.isContainer = isContainer;
    return this;
  }

  /**
   * Set component version
   */
  version(version: string): this {
    this.metadata.version = version;
    return this;
  }

  /**
   * Set search keywords
   */
  keywords(keywords: string[]): this {
    this.metadata.keywords = keywords;
    return this;
  }

  /**
   * Set difficulty level
   */
  difficulty(level: 'beginner' | 'intermediate' | 'advanced'): this {
    this.metadata.difficulty = level;
    return this;
  }

  /**
   * Mark as popular component
   */
  popular(isPopular = true): this {
    this.metadata.popular = isPopular;
    return this;
  }

  /**
   * Add usage examples
   */
  examples(examples: ComponentExample[]): this {
    this.metadata.examples = examples;
    return this;
  }

  /**
   * Set related components
   */
  relatedComponents(componentIds: string[]): this {
    this.metadata.relatedComponents = componentIds;
    return this;
  }

  /**
   * Build the metadata object
   */
  build(): ComponentPaletteMetadata {
    const result: ComponentPaletteMetadata = {
      description: this.metadata.description!,
      tags: this.metadata.tags!,
      isContainer: this.metadata.isContainer!,
      version: this.metadata.version!,
      keywords: this.metadata.keywords!,
      difficulty: this.metadata.difficulty!,
      popular: this.metadata.popular!,
    };

    if (this.metadata.previewImage) {
      result.previewImage = this.metadata.previewImage;
    }
    
    if (this.metadata.examples) {
      result.examples = this.metadata.examples;
    }
    
    if (this.metadata.relatedComponents) {
      result.relatedComponents = this.metadata.relatedComponents;
    }

    return result;
  }
}

/**
 * Helper function to create metadata
 */
export function createMetadata(description: string): MetadataBuilder {
  return new MetadataBuilder(description);
}

/**
 * Generate preview image URL for a component
 */
export function generatePreviewImageUrl(
  componentType: string,
  variant?: string
): string {
  const baseUrl = '/api/components/preview';
  const params = new URLSearchParams({ type: componentType });
  
  if (variant) {
    params.set('variant', variant);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Extract searchable text from component metadata
 */
export function extractSearchableText(
  component: WrappedComponent,
  metadata?: ComponentPaletteMetadata
): string[] {
  const searchableText: string[] = [
    component.displayName,
    component.type,
    component.metadata.description,
    ...component.metadata.tags,
  ];

  if (metadata) {
    searchableText.push(...metadata.keywords);
    
    if (metadata.examples) {
      metadata.examples.forEach(example => {
        searchableText.push(example.title, example.description);
      });
    }
  }

  return searchableText.map(text => text.toLowerCase());
}

/**
 * Calculate component similarity score for recommendations
 */
export function calculateSimilarityScore(
  component1: WrappedComponent,
  component2: WrappedComponent,
  metadata1?: ComponentPaletteMetadata,
  metadata2?: ComponentPaletteMetadata
): number {
  let score = 0;

  // Category match (high weight)
  if (component1.category === component2.category) {
    score += 0.4;
  }

  // Tag overlap
  const tags1 = new Set(component1.metadata.tags);
  const tags2 = new Set(component2.metadata.tags);
  const tagOverlap = [...tags1].filter(tag => tags2.has(tag)).length;
  const totalTags = Math.max(tags1.size + tags2.size - tagOverlap, 1);
  score += (tagOverlap / totalTags) * 0.3;

  // Container type match
  if (component1.isContainer === component2.isContainer) {
    score += 0.1;
  }

  // Keyword overlap (if metadata available)
  if (metadata1 && metadata2) {
    const keywords1 = new Set(metadata1.keywords);
    const keywords2 = new Set(metadata2.keywords);
    const keywordOverlap = [...keywords1].filter(keyword => keywords2.has(keyword)).length;
    const totalKeywords = Math.max(keywords1.size + keywords2.size - keywordOverlap, 1);
    score += (keywordOverlap / totalKeywords) * 0.2;
  }

  return Math.min(score, 1); // Cap at 1.0
}

/**
 * Get recommended components based on current selection
 */
export function getRecommendedComponents(
  currentComponent: WrappedComponent,
  allComponents: WrappedComponent[],
  metadata?: Map<string, ComponentPaletteMetadata>,
  limit = 5
): WrappedComponent[] {
  const currentMetadata = metadata?.get(currentComponent.id);
  
  // If explicit related components are defined, use those first
  if (currentMetadata?.relatedComponents) {
    const relatedComponents = currentMetadata.relatedComponents
      .map(id => allComponents.find(c => c.id === id))
      .filter(Boolean) as WrappedComponent[];
    
    if (relatedComponents.length >= limit) {
      return relatedComponents.slice(0, limit);
    }
  }

  // Calculate similarity scores for all other components
  const scores = allComponents
    .filter(c => c.id !== currentComponent.id)
    .map(component => ({
      component,
      score: calculateSimilarityScore(
        currentComponent,
        component,
        currentMetadata,
        metadata?.get(component.id)
      ),
    }))
    .sort((a, b) => b.score - a.score);

  return scores.slice(0, limit).map(item => item.component);
}

/**
 * Validate component metadata
 */
export function validateMetadata(metadata: ComponentMetadata): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!metadata.description || metadata.description.trim().length === 0) {
    errors.push('Description is required');
  }

  if (metadata.description && metadata.description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  if (!Array.isArray(metadata.tags)) {
    errors.push('Tags must be an array');
  }

  if (metadata.tags && metadata.tags.some(tag => typeof tag !== 'string')) {
    errors.push('All tags must be strings');
  }

  if (typeof metadata.isContainer !== 'boolean') {
    errors.push('isContainer must be a boolean');
  }

  if (!metadata.version || !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
    errors.push('Version must be in semver format (e.g., 1.0.0)');
  }

  if (metadata.previewImage && !/^https?:\/\/.+/.test(metadata.previewImage)) {
    errors.push('Preview image must be a valid URL');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}