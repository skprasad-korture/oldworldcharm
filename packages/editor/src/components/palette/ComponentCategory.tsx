// Component category display with collapsible sections
import React, { useState } from 'react';
import { ComponentCategory as CategoryType, CATEGORY_METADATA } from '@oldworldcharm/shared';
import { ComponentCategoryProps } from './types';
import { ComponentItem } from './ComponentItem';

/**
 * Component category section in the palette
 */
export const ComponentCategory: React.FC<ComponentCategoryProps> = ({
  category,
  components,
  isExpanded,
  onToggle,
  onComponentSelect,
  viewMode,
}) => {
  const categoryMeta = CATEGORY_METADATA[category];
  const componentCount = components.length;

  const handleToggle = () => {
    onToggle(category);
  };

  const handleComponentSelect = (component: any) => {
    onComponentSelect?.(component);
  };

  return (
    <div className="component-category">
      {/* Category Header */}
      <div
        className="category-header flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 border-b"
        onClick={handleToggle}
      >
        <div className="flex items-center space-x-3">
          {/* Category Icon */}
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white text-sm"
            style={{ backgroundColor: categoryMeta.color }}
          >
            {/* Icon would be rendered here based on categoryMeta.icon */}
            <span className="font-semibold">
              {categoryMeta.displayName.charAt(0)}
            </span>
          </div>
          
          {/* Category Name and Count */}
          <div>
            <h3 className="font-medium text-gray-900">
              {categoryMeta.displayName}
            </h3>
            <p className="text-sm text-gray-500">
              {componentCount} component{componentCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <div className="text-gray-400">
          {isExpanded ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Category Description */}
      {isExpanded && (
        <div className="px-3 py-2 bg-gray-50 border-b">
          <p className="text-sm text-gray-600">{categoryMeta.description}</p>
        </div>
      )}

      {/* Components List */}
      {isExpanded && (
        <div className={`components-list ${getLayoutClass(viewMode)}`}>
          {components.length > 0 ? (
            components.map((component) => (
              <ComponentItem
                key={component.id}
                component={component}
                viewMode={viewMode}
                onSelect={handleComponentSelect}
                showPreview={viewMode !== 'compact'}
              />
            ))
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No components in this category</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Get CSS class for layout based on view mode
 */
function getLayoutClass(viewMode: 'grid' | 'list' | 'compact'): string {
  switch (viewMode) {
    case 'grid':
      return 'grid grid-cols-2 gap-2 p-2';
    case 'list':
      return 'space-y-1';
    case 'compact':
      return 'grid grid-cols-3 gap-1 p-1';
    default:
      return 'space-y-1';
  }
}