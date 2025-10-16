// Individual component item in the palette
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ComponentItemProps, ComponentDragData } from './types';

/**
 * Individual component item in the palette
 */
export const ComponentItem: React.FC<ComponentItemProps> = ({
  component,
  viewMode,
  onSelect,
  onDragStart,
  isSelected = false,
  showPreview = true,
}) => {
  const dragData: ComponentDragData = {
    componentId: component.id,
    componentType: component.type,
    defaultProps: component.defaultProps as Record<string, unknown>,
    isContainer: component.isContainer,
    source: 'palette',
  };

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `palette-${component.id}`,
    data: dragData,
  });

  const handleClick = () => {
    onSelect?.(component);
  };

  // Call the onDragStart callback when dragging starts
  React.useEffect(() => {
    if (isDragging) {
      onDragStart?.(component, dragData);
    }
  }, [isDragging, component, dragData, onDragStart]);

  const getItemClass = () => {
    const baseClass = 'component-item cursor-pointer transition-all duration-200';
    const selectedClass = isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : '';
    const draggingClass = isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md';
    
    switch (viewMode) {
      case 'grid':
        return `${baseClass} ${selectedClass} ${draggingClass} p-3 border rounded-lg bg-white`;
      case 'list':
        return `${baseClass} ${selectedClass} ${draggingClass} p-2 border-b hover:bg-gray-50`;
      case 'compact':
        return `${baseClass} ${selectedClass} ${draggingClass} p-1 border rounded text-xs`;
      default:
        return `${baseClass} ${selectedClass} ${draggingClass}`;
    }
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={getItemClass()}
      onClick={handleClick}
      title={component.metadata.description}
      {...attributes}
      {...listeners}
    >
      {/* Component Preview */}
      {showPreview && viewMode === 'grid' && (
        <div className="component-preview mb-2">
          {component.metadata.previewImage ? (
            <img
              src={component.metadata.previewImage}
              alt={`${component.displayName} preview`}
              className="w-full h-16 object-cover rounded border"
            />
          ) : (
            <div className="w-full h-16 bg-gray-100 rounded border flex items-center justify-center">
              <span className="text-gray-400 text-xs">No Preview</span>
            </div>
          )}
        </div>
      )}

      {/* Component Info */}
      <div className="component-info">
        <div className="flex items-center justify-between">
          <h4 className={`font-medium text-gray-900 ${viewMode === 'compact' ? 'text-xs' : 'text-sm'}`}>
            {component.displayName}
          </h4>
          
          {/* Container indicator */}
          {component.isContainer && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Container
            </span>
          )}
        </div>

        {/* Component type and description */}
        {viewMode !== 'compact' && (
          <>
            <p className="text-xs text-gray-500 mt-1">{component.type}</p>
            {viewMode === 'list' && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {component.metadata.description}
              </p>
            )}
          </>
        )}

        {/* Tags */}
        {viewMode === 'grid' && component.metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {component.metadata.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
              >
                {tag}
              </span>
            ))}
            {component.metadata.tags.length > 3 && (
              <span className="text-xs text-gray-500">
                +{component.metadata.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded flex items-center justify-center">
          <div className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
            Dragging...
          </div>
        </div>
      )}
    </div>
  );
};