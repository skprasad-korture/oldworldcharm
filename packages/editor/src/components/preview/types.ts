// Preview system types
import { WrappedComponent } from '@oldworldcharm/shared';

/**
 * Preview generation options
 */
export interface PreviewOptions {
  /** Preview width in pixels */
  width?: number;
  /** Preview height in pixels */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Whether to show component bounds */
  showBounds?: boolean;
  /** Scale factor for preview */
  scale?: number;
  /** Props to use for preview */
  props?: Record<string, unknown>;
}

/**
 * Preview result
 */
export interface PreviewResult {
  /** Generated preview image URL */
  imageUrl: string;
  /** Preview dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  /** Generation timestamp */
  timestamp: number;
  /** Component ID this preview is for */
  componentId: string;
}

/**
 * Preview cache entry
 */
export interface PreviewCacheEntry {
  result: PreviewResult;
  expiresAt: number;
  options: PreviewOptions;
}

/**
 * Component preview props
 */
export interface ComponentPreviewProps {
  /** Component to preview */
  component: WrappedComponent;
  /** Preview options */
  options?: PreviewOptions;
  /** Whether to show loading state */
  showLoading?: boolean;
  /** Fallback content when preview fails */
  fallback?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** CSS class name */
  className?: string;
}