import React, { useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { ComponentInstance } from '@oldworldcharm/shared';
import { useEditorStore } from '../../store/editorStore';
import { CanvasComponent } from './CanvasComponent';
import { DropZone } from './DropZone';
import { DragPreview } from './DragPreview';
import { createComponentInstanceFromDrag } from '../../utils/dragDrop';
import { ComponentDragData } from '../palette/types';

export interface CanvasProps {
  className?: string;
}

export function Canvas({ className = '' }: CanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  const {
    components,
    selectedComponentId,
    hoveredComponentId,
    isDragging,
    draggedComponent,
    dropTarget,
    addComponent,
    selectComponent,
    setHoveredComponent,
    setDragging,
    setDraggedComponent,
    setDropTarget,
    moveComponent,
  } = useEditorStore();

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance to start dragging
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    
    setDragging(true);
    
    // Check if dragging from palette or canvas
    if (active.data.current?.source === 'palette') {
      // Dragging from component palette
      const dragData = active.data.current as ComponentDragData;
      const newComponent = createComponentInstanceFromDrag(dragData);
      setDraggedComponent(newComponent);
    } else if (active.data.current?.source === 'canvas') {
      // Dragging existing component on canvas
      const componentId = active.id as string;
      const component = findComponentById(components, componentId);
      if (component) {
        setDraggedComponent(component);
      }
    }
  }, [components, setDragging, setDraggedComponent]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    
    if (over) {
      const targetId = over.id as string;
      setDropTarget(targetId);
    } else {
      setDropTarget(null);
    }
  }, [setDropTarget]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setDragging(false);
    setDraggedComponent(null);
    setDropTarget(null);

    if (!over || !draggedComponent) {
      return;
    }

    const targetId = over.id as string;
    const dropData = over.data.current;

    // Handle different drop scenarios
    if (active.data.current?.source === 'palette') {
      // Adding new component from palette
      if (targetId === 'canvas-root') {
        // Drop on canvas root
        addComponent(draggedComponent);
      } else if (dropData?.type === 'component') {
        // Drop on existing component
        const targetComponent = findComponentById(components, targetId);
        if (targetComponent && canAcceptChild(targetComponent)) {
          addComponent(draggedComponent, targetId);
        }
      } else if (dropData?.type === 'drop-zone') {
        // Drop on drop zone
        const { parentId, index } = dropData;
        addComponent(draggedComponent, parentId, index);
      }
    } else if (active.data.current?.source === 'canvas') {
      // Moving existing component
      const componentId = active.id as string;
      
      if (targetId === 'canvas-root') {
        // Move to canvas root
        moveComponent(componentId);
      } else if (dropData?.type === 'component') {
        // Move to existing component
        const targetComponent = findComponentById(components, targetId);
        if (targetComponent && canAcceptChild(targetComponent) && targetId !== componentId) {
          moveComponent(componentId, targetId);
        }
      } else if (dropData?.type === 'drop-zone') {
        // Move to specific position
        const { parentId, index } = dropData;
        if (parentId !== componentId) { // Prevent dropping on self
          moveComponent(componentId, parentId, index);
        }
      }
    }
  }, [draggedComponent, components, addComponent, moveComponent, setDragging, setDraggedComponent, setDropTarget]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    // Only handle clicks on the canvas itself, not on components
    if (event.target === event.currentTarget) {
      selectComponent(null);
    }
  }, [selectComponent]);

  const handleCanvasMouseLeave = useCallback(() => {
    setHoveredComponent(null);
  }, [setHoveredComponent]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={canvasRef}
        className={`
          relative min-h-screen bg-gray-50 p-4 overflow-auto
          ${isDragging ? 'cursor-grabbing' : 'cursor-default'}
          ${className}
        `}
        onClick={handleCanvasClick}
        onMouseLeave={handleCanvasMouseLeave}
        data-canvas-root
      >
        {/* Canvas content */}
        <div className="max-w-6xl mx-auto">
          {components.length === 0 ? (
            <DropZone
              id="canvas-root"
              parentId={undefined}
              index={0}
              className="min-h-96 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center"
              showAlways
            >
              <div className="text-center text-gray-500">
                <div className="text-lg font-medium mb-2">Start Building</div>
                <div className="text-sm">
                  Drag components from the palette to begin creating your page
                </div>
              </div>
            </DropZone>
          ) : (
            <div className="space-y-2">
              {components.map((component, index) => (
                <React.Fragment key={component.id}>
                  <DropZone
                    id={`drop-zone-root-${index}`}
                    parentId={undefined}
                    index={index}
                    className="h-2"
                  />
                  <CanvasComponent
                    component={component}
                    isSelected={selectedComponentId === component.id}
                    isHovered={hoveredComponentId === component.id}
                    onSelect={selectComponent}
                    onHover={setHoveredComponent}
                  />
                </React.Fragment>
              ))}
              <DropZone
                id={`drop-zone-root-${components.length}`}
                parentId={undefined}
                index={components.length}
                className="h-2"
              />
            </div>
          )}
        </div>

        {/* Selection overlay */}
        {selectedComponentId && (
          <SelectionOverlay componentId={selectedComponentId} />
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedComponent && (
          <DragPreview component={draggedComponent} />
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Helper component for selection overlay
function SelectionOverlay({ componentId }: { componentId: string }) {
  // This would be implemented to show selection indicators
  // For now, we'll use CSS classes on the components themselves
  return null;
}

// Helper functions
function findComponentById(
  components: ComponentInstance[],
  id: string
): ComponentInstance | null {
  for (const component of components) {
    if (component.id === id) {
      return component;
    }

    if (component.children) {
      const found = findComponentById(component.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function canAcceptChild(component: ComponentInstance): boolean {
  // This would check the component definition to see if it can accept children
  // For now, we'll assume all components can accept children
  return true;
}