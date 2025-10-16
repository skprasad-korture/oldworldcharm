import React, { useState, useRef, useCallback } from 'react';
import { ComponentInstance } from '@oldworldcharm/shared';

export interface TreeNodeProps {
  component: ComponentInstance;
  level: number;
  index: number;
  isSelected: boolean;
  isExpanded: boolean;
  isDragging: boolean;
  onToggleExpanded: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDrop: (targetId: string, position: 'before' | 'after' | 'inside') => void;
}

export function TreeNode({
  component,
  level,
  index,
  isSelected,
  isExpanded,
  isDragging,
  onToggleExpanded,
  onSelect,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragEnd,
  onDrop,
}: TreeNodeProps) {
  const [showActions, setShowActions] = useState(false);
  const [dragOver, setDragOver] = useState<'before' | 'after' | 'inside' | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const hasChildren = component.children && component.children.length > 0;
  const canHaveChildren = component.children !== undefined;

  // Handle node click
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(component.id);
  }, [component.id, onSelect]);

  // Handle expand/collapse
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canHaveChildren) {
      onToggleExpanded(component.id);
    }
  }, [component.id, canHaveChildren, onToggleExpanded]);

  // Handle delete
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(component.id);
  }, [component.id, onDelete]);

  // Handle duplicate
  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(component.id);
  }, [component.id, onDuplicate]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', component.id);
    onDragStart(component.id);
  }, [component.id, onDragStart]);

  const handleDragEnd = useCallback(() => {
    onDragEnd();
    setDragOver(null);
  }, [onDragEnd]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!nodeRef.current) return;

    const rect = nodeRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Determine drop position based on mouse position
    if (y < height * 0.25) {
      setDragOver('before');
    } else if (y > height * 0.75) {
      setDragOver('after');
    } else if (canHaveChildren) {
      setDragOver('inside');
    } else {
      setDragOver('after');
    }
  }, [canHaveChildren]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear drag over if we're actually leaving the node
    if (!nodeRef.current?.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (dragOver) {
      onDrop(component.id, dragOver);
    }
    setDragOver(null);
  }, [component.id, dragOver, onDrop]);

  // Get component icon
  const getComponentIcon = () => {
    const iconClass = "w-4 h-4 text-gray-500";
    
    switch (component.type.toLowerCase()) {
      case 'button':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.122 2.122" />
          </svg>
        );
      case 'text':
      case 'paragraph':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        );
      case 'heading':
      case 'h1':
      case 'h2':
      case 'h3':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        );
      case 'image':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'container':
      case 'div':
      case 'section':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
    }
  };

  // Calculate indentation
  const indentStyle = {
    paddingLeft: `${level * 20 + 8}px`,
  };

  // Node classes
  const nodeClasses = [
    'relative',
    'flex',
    'items-center',
    'py-1',
    'px-2',
    'rounded',
    'cursor-pointer',
    'transition-colors',
    'group',
  ];

  if (isSelected) {
    nodeClasses.push('bg-blue-100', 'text-blue-900');
  } else {
    nodeClasses.push('hover:bg-gray-100');
  }

  if (isDragging) {
    nodeClasses.push('opacity-50');
  }

  return (
    <>
      {/* Drop indicator - before */}
      {dragOver === 'before' && (
        <div 
          className="h-0.5 bg-blue-500 mx-2 rounded"
          style={indentStyle}
        />
      )}

      {/* Node */}
      <div
        ref={nodeRef}
        className={nodeClasses.join(' ')}
        style={indentStyle}
        onClick={handleClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drop indicator - inside */}
        {dragOver === 'inside' && (
          <div className="absolute inset-0 bg-blue-100 border-2 border-dashed border-blue-400 rounded" />
        )}

        {/* Expand/collapse button */}
        <div className="flex-shrink-0 w-4 h-4 mr-1">
          {canHaveChildren && (
            <button
              onClick={handleToggle}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
            >
              {hasChildren ? (
                <svg
                  className={`w-3 h-3 transform transition-transform ${
                    isExpanded ? 'rotate-90' : 'rotate-0'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <div className="w-2 h-2 border border-gray-300 rounded-sm" />
              )}
            </button>
          )}
        </div>

        {/* Component icon */}
        <div className="flex-shrink-0 mr-2">
          {getComponentIcon()}
        </div>

        {/* Component name */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {component.type}
          </div>
          {component.props.text && (
            <div className="text-xs text-gray-500 truncate">
              {String(component.props.text).substring(0, 30)}
              {String(component.props.text).length > 30 ? '...' : ''}
            </div>
          )}
        </div>

        {/* Actions */}
        {(showActions || isSelected) && (
          <div className="flex-shrink-0 flex items-center space-x-1 ml-2">
            <button
              onClick={handleDuplicate}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Duplicate"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Delete"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Drop indicator - after */}
      {dragOver === 'after' && (
        <div 
          className="h-0.5 bg-blue-500 mx-2 rounded"
          style={indentStyle}
        />
      )}

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-4">
          {component.children!.map((child, childIndex) => (
            <TreeNode
              key={child.id}
              component={child}
              level={level + 1}
              index={childIndex}
              isSelected={isSelected}
              isExpanded={isExpanded}
              isDragging={isDragging}
              onToggleExpanded={onToggleExpanded}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </>
  );
}