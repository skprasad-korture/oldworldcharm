import React, { useCallback, useMemo } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { ComponentInstance } from '@oldworldcharm/shared';
import { useEditorStore } from '../../store/editorStore';
import { DropZone } from './DropZone';
import { ComponentRenderer } from './ComponentRenderer';

export interface CanvasComponentProps {
  component: ComponentInstance;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  depth?: number;
}

export function CanvasComponent({
  component,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  depth = 0,
}: CanvasComponentProps) {
  const { isDragging, draggedComponent } = useEditorStore();

  // Set up draggable
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging: isComponentDragging,
  } = useDraggable({
    id: component.id,
    data: {
      type: 'component',
      source: 'canvas',
      component,
    },
  });

  // Set up droppable (for container components)
  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: component.id,
    data: {
      type: 'component',
      component,
      canAcceptChildren: canAcceptChildren(component),
    },
  });

  // Combine refs
  const setNodeRef = useCallback((node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  }, [setDragRef, setDropRef]);

  // Handle component selection
  const handleClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(component.id);
  }, [component.id, onSelect]);

  // Handle hover
  const handleMouseEnter = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onHover(component.id);
  }, [component.id, onHover]);

  const handleMouseLeave = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onHover(null);
  }, [onHover]);

  // Calculate styles
  const style = useMemo(() => {
    if (transform) {
      return {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      };
    }
    return undefined;
  }, [transform]);

  // Determine if this component should show drop zones
  const showDropZones = useMemo(() => {
    return (
      isDragging &&
      draggedComponent &&
      canAcceptChildren(component) &&
      draggedComponent.id !== component.id &&
      !isComponentDragging
    );
  }, [isDragging, draggedComponent, component, isComponentDragging]);

  // CSS classes for visual feedback
  const componentClasses = useMemo(() => {
    const classes = [
      'relative',
      'transition-all',
      'duration-200',
    ];

    if (isSelected) {
      classes.push(
        'ring-2',
        'ring-blue-500',
        'ring-offset-2'
      );
    } else if (isHovered && !isDragging) {
      classes.push(
        'ring-1',
        'ring-blue-300',
        'ring-offset-1'
      );
    }

    if (isComponentDragging) {
      classes.push('opacity-50', 'z-50');
    }

    if (isOver && canAcceptChildren(component)) {
      classes.push(
        'ring-2',
        'ring-green-400',
        'ring-offset-2',
        'bg-green-50'
      );
    }

    return classes.join(' ');
  }, [isSelected, isHovered, isDragging, isComponentDragging, isOver, component]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={componentClasses}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...attributes}
      {...listeners}
      data-component-id={component.id}
      data-component-type={component.type}
    >
      {/* Component content */}
      <div className="relative">
        {/* Component label (shown when selected or hovered) */}
        {(isSelected || isHovered) && (
          <div className="absolute -top-6 left-0 z-10">
            <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-sm">
              {component.type}
            </div>
          </div>
        )}

        {/* Render the actual component */}
        <ComponentRenderer component={component} />

        {/* Render children with drop zones */}
        {component.children && component.children.length > 0 && (
          <div className="relative">
            {showDropZones && (
              <DropZone
                id={`drop-zone-${component.id}-0`}
                parentId={component.id}
                index={0}
                className="h-2 -mt-1"
              />
            )}
            
            {component.children.map((child, index) => (
              <React.Fragment key={child.id}>
                <CanvasComponent
                  component={child}
                  isSelected={isSelected && child.id === component.id}
                  isHovered={isHovered && child.id === component.id}
                  onSelect={onSelect}
                  onHover={onHover}
                  depth={depth + 1}
                />
                
                {showDropZones && (
                  <DropZone
                    id={`drop-zone-${component.id}-${index + 1}`}
                    parentId={component.id}
                    index={index + 1}
                    className="h-2 -my-1"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Drop zone for empty containers */}
        {canAcceptChildren(component) && (!component.children || component.children.length === 0) && showDropZones && (
          <DropZone
            id={`drop-zone-${component.id}-empty`}
            parentId={component.id}
            index={0}
            className="min-h-12 border-2 border-dashed border-gray-300 rounded m-2 flex items-center justify-center"
            showAlways
          >
            <div className="text-xs text-gray-500">Drop components here</div>
          </DropZone>
        )}
      </div>

      {/* Resize handles (for selected components) */}
      {isSelected && (
        <ResizeHandles componentId={component.id} />
      )}
    </div>
  );
}

// Helper component for resize handles
function ResizeHandles({ componentId }: { componentId: string }) {
  return (
    <>
      {/* Corner handles */}
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-nw-resize" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-ne-resize" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-sw-resize" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-se-resize" />
      
      {/* Edge handles */}
      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-n-resize" />
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-s-resize" />
      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-w-resize" />
      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 border border-white rounded-sm cursor-e-resize" />
    </>
  );
}

// Helper function to determine if a component can accept children
function canAcceptChildren(component: ComponentInstance): boolean {
  // This would check the component definition from the registry
  // For now, we'll use a simple heuristic based on component type
  const containerTypes = [
    'div',
    'section',
    'article',
    'header',
    'footer',
    'main',
    'aside',
    'nav',
    'card',
    'container',
    'flex',
    'grid',
    'stack',
    'group',
  ];

  return containerTypes.some(type => 
    component.type.toLowerCase().includes(type)
  );
}