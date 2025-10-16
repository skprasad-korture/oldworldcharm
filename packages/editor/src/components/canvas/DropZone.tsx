import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useEditorStore } from '../../store/editorStore';

export interface DropZoneProps {
  id: string;
  parentId?: string | undefined;
  index: number;
  className?: string;
  children?: React.ReactNode;
  showAlways?: boolean;
}

export function DropZone({
  id,
  parentId,
  index,
  className = '',
  children,
  showAlways = false,
}: DropZoneProps) {
  const { isDragging, dropTarget } = useEditorStore();

  const {
    setNodeRef,
    isOver,
    active,
  } = useDroppable({
    id,
    data: {
      type: 'drop-zone',
      parentId,
      index,
    },
  });

  // Determine if this drop zone should be visible
  const isVisible = useMemo(() => {
    return showAlways || (isDragging && active);
  }, [showAlways, isDragging, active]);

  // CSS classes for the drop zone
  const dropZoneClasses = useMemo(() => {
    const classes = [
      'transition-all',
      'duration-200',
    ];

    if (isVisible) {
      classes.push('opacity-100');
    } else {
      classes.push('opacity-0', 'pointer-events-none');
    }

    if (isOver) {
      classes.push(
        'bg-blue-100',
        'border-blue-400',
        'border-2',
        'border-dashed'
      );
    } else if (isVisible && !showAlways) {
      classes.push(
        'bg-gray-100',
        'border-gray-300',
        'border',
        'border-dashed'
      );
    }

    if (dropTarget === id) {
      classes.push('ring-2', 'ring-blue-400');
    }

    return classes.join(' ');
  }, [isVisible, isOver, showAlways, dropTarget, id]);

  if (!isVisible && !children) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={`${dropZoneClasses} ${className}`}
      data-drop-zone-id={id}
      data-parent-id={parentId}
      data-index={index}
    >
      {children}
      
      {/* Drop indicator */}
      {isOver && !children && (
        <div className="flex items-center justify-center h-full min-h-8">
          <div className="text-xs text-blue-600 font-medium">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
}