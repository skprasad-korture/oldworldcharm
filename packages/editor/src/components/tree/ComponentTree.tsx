import React, { useState, useCallback } from 'react';
import { ComponentInstance } from '@oldworldcharm/shared';
import { useEditorStore } from '../../store/editorStore';
import { TreeNode } from './TreeNode';

export interface ComponentTreeProps {
  className?: string;
}

export function ComponentTree({ className = '' }: ComponentTreeProps) {
  const {
    components,
    selectedComponentId,
    selectComponent,
    removeComponent,
    duplicateComponent,
    moveComponent,
  } = useEditorStore();

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [draggedNode, setDraggedNode] = useState<string | null>(null);

  // Handle node expansion/collapse
  const handleToggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Handle node selection
  const handleSelectNode = useCallback((nodeId: string) => {
    selectComponent(nodeId);
  }, [selectComponent]);

  // Handle node deletion
  const handleDeleteNode = useCallback((nodeId: string) => {
    removeComponent(nodeId);
  }, [removeComponent]);

  // Handle node duplication
  const handleDuplicateNode = useCallback((nodeId: string) => {
    duplicateComponent(nodeId);
  }, [duplicateComponent]);

  // Handle drag start
  const handleDragStart = useCallback((nodeId: string) => {
    setDraggedNode(nodeId);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedNode(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((targetId: string, position: 'before' | 'after' | 'inside') => {
    if (!draggedNode || draggedNode === targetId) {
      return;
    }

    // Find target component and its parent
    const findComponentAndParent = (
      components: ComponentInstance[],
      targetId: string,
      parent?: ComponentInstance
    ): { component: ComponentInstance; parent?: ComponentInstance; index: number } | null => {
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        if (component.id === targetId) {
          return { component, parent, index: i };
        }
        if (component.children) {
          const result = findComponentAndParent(component.children, targetId, component);
          if (result) return result;
        }
      }
      return null;
    };

    const targetInfo = findComponentAndParent(components, targetId);
    if (!targetInfo) return;

    let newParentId: string | undefined;
    let newIndex: number;

    switch (position) {
      case 'before':
        newParentId = targetInfo.parent?.id;
        newIndex = targetInfo.index;
        break;
      case 'after':
        newParentId = targetInfo.parent?.id;
        newIndex = targetInfo.index + 1;
        break;
      case 'inside':
        newParentId = targetId;
        newIndex = 0;
        break;
    }

    moveComponent(draggedNode, newParentId, newIndex);
  }, [draggedNode, components, moveComponent]);

  // Expand all nodes
  const handleExpandAll = useCallback(() => {
    const getAllNodeIds = (components: ComponentInstance[]): string[] => {
      const ids: string[] = [];
      components.forEach(component => {
        ids.push(component.id);
        if (component.children) {
          ids.push(...getAllNodeIds(component.children));
        }
      });
      return ids;
    };

    setExpandedNodes(new Set(getAllNodeIds(components)));
  }, [components]);

  // Collapse all nodes
  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  return (
    <div className={`component-tree h-full flex flex-col bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Structure</h2>
          
          {/* Tree actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleExpandAll}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Expand all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={handleCollapseAll}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Collapse all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-500">
          Navigate and organize your page components
        </p>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto p-2">
        {components.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <div className="text-sm">No components</div>
              <div className="text-xs mt-1">Add components to see the structure</div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {components.map((component, index) => (
              <TreeNode
                key={component.id}
                component={component}
                level={0}
                index={index}
                isSelected={selectedComponentId === component.id}
                isExpanded={expandedNodes.has(component.id)}
                isDragging={draggedNode === component.id}
                onToggleExpanded={handleToggleExpanded}
                onSelect={handleSelectNode}
                onDelete={handleDeleteNode}
                onDuplicate={handleDuplicateNode}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 text-center">
          {components.length} component{components.length !== 1 ? 's' : ''} total
        </div>
      </div>
    </div>
  );
}