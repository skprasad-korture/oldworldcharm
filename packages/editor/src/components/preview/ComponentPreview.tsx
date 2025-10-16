// Component preview display component
import React, { useState, useEffect } from 'react';
import { ComponentPreviewProps, PreviewResult } from './types';
import { previewGenerator } from './PreviewGenerator';

/**
 * Component preview display
 */
export const ComponentPreview: React.FC<ComponentPreviewProps> = ({
  component,
  options = {},
  showLoading = true,
  fallback,
  onClick,
  className = '',
}) => {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate preview when component or options change
  useEffect(() => {
    let isCancelled = false;

    const generatePreview = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await previewGenerator.generatePreview(component, options);
        
        if (!isCancelled) {
          setPreview(result);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to generate preview');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    generatePreview();

    return () => {
      isCancelled = true;
    };
  }, [component, options]);

  // Handle image load error
  const handleImageError = () => {
    setError('Failed to load preview image');
  };

  // Handle image load success
  const handleImageLoad = () => {
    setError(null);
  };

  // Render loading state
  if (isLoading && showLoading) {
    return (
      <div className={`component-preview loading ${className}`} onClick={onClick}>
        <div className="flex items-center justify-center h-full bg-gray-100 rounded">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`component-preview error ${className}`} onClick={onClick}>
        {fallback || (
          <div className="flex flex-col items-center justify-center h-full bg-gray-100 rounded p-2">
            <svg className="h-6 w-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-xs text-gray-500 text-center">Preview Error</span>
          </div>
        )}
      </div>
    );
  }

  // Render preview
  if (preview) {
    return (
      <div className={`component-preview ${className}`} onClick={onClick}>
        <img
          src={preview.imageUrl}
          alt={`${component.displayName} preview`}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className="w-full h-full object-cover rounded"
          loading="lazy"
        />
      </div>
    );
  }

  // Render placeholder
  return (
    <div className={`component-preview placeholder ${className}`} onClick={onClick}>
      {fallback || (
        <div className="flex items-center justify-center h-full bg-gray-100 rounded">
          <span className="text-xs text-gray-500">No Preview</span>
        </div>
      )}
    </div>
  );
};

/**
 * Hook for using component preview
 */
export function useComponentPreview(
  component: any,
  options: any = {}
) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePreview = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await previewGenerator.generatePreview(component, options);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setError(null);
  };

  return {
    preview,
    isLoading,
    error,
    generatePreview,
    clearPreview,
  };
}