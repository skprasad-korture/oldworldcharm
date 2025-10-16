// Drag and drop utilities for component palette
import { WrappedComponent, ComponentInstance } from '@oldworldcharm/shared';
import { ComponentDragData } from '../components/palette/types';

/**
 * Drag and drop data types
 */
export const DRAG_TYPES = {
  COMPONENT: 'application/x-component',
  COMPONENT_INSTANCE: 'application/x-component-instance',
  JSON: 'application/json',
  TEXT: 'text/plain',
} as const;

/**
 * Create drag data for a component from the palette
 */
export function createComponentDragData(component: WrappedComponent): ComponentDragData {
  return {
    componentId: component.id,
    componentType: component.type,
    defaultProps: component.defaultProps as Record<string, unknown>,
    isContainer: component.isContainer,
    source: 'palette',
  };
}

/**
 * Create drag data for a component instance (already on canvas)
 */
export function createInstanceDragData(instance: ComponentInstance) {
  return {
    instanceId: instance.id,
    componentType: instance.type,
    props: instance.props,
    children: instance.children,
    source: 'canvas',
  };
}

/**
 * Set drag data on a drag event
 */
export function setDragData(
  event: DragEvent,
  data: ComponentDragData | any,
  effectAllowed: 'copy' | 'move' | 'link' | 'copyMove' | 'copyLink' | 'linkMove' | 'all' | 'none' = 'copy'
): void {
  if (!event.dataTransfer) return;

  // Set effect
  event.dataTransfer.effectAllowed = effectAllowed;

  // Set JSON data
  event.dataTransfer.setData(DRAG_TYPES.JSON, JSON.stringify(data));

  // Set component-specific data
  if ('componentId' in data) {
    event.dataTransfer.setData(DRAG_TYPES.COMPONENT, JSON.stringify(data));
  } else if ('instanceId' in data) {
    event.dataTransfer.setData(DRAG_TYPES.COMPONENT_INSTANCE, JSON.stringify(data));
  }

  // Set plain text fallback
  const textData = 'componentType' in data ? data.componentType : 'component';
  event.dataTransfer.setData(DRAG_TYPES.TEXT, textData);
}

/**
 * Get drag data from a drag event
 */
export function getDragData(event: DragEvent): any | null {
  if (!event.dataTransfer) return null;

  // Try to get component data first
  const componentData = event.dataTransfer.getData(DRAG_TYPES.COMPONENT);
  if (componentData) {
    try {
      return JSON.parse(componentData);
    } catch {
      // Fall through to JSON data
    }
  }

  // Try to get component instance data
  const instanceData = event.dataTransfer.getData(DRAG_TYPES.COMPONENT_INSTANCE);
  if (instanceData) {
    try {
      return JSON.parse(instanceData);
    } catch {
      // Fall through to JSON data
    }
  }

  // Try to get JSON data
  const jsonData = event.dataTransfer.getData(DRAG_TYPES.JSON);
  if (jsonData) {
    try {
      return JSON.parse(jsonData);
    } catch {
      // Fall through to text data
    }
  }

  // Fallback to text data
  const textData = event.dataTransfer.getData(DRAG_TYPES.TEXT);
  return textData || null;
}

/**
 * Check if drag event contains component data
 */
export function hasComponentData(event: DragEvent): boolean {
  if (!event.dataTransfer) return false;

  return (
    event.dataTransfer.types.includes(DRAG_TYPES.COMPONENT) ||
    event.dataTransfer.types.includes(DRAG_TYPES.COMPONENT_INSTANCE) ||
    event.dataTransfer.types.includes(DRAG_TYPES.JSON)
  );
}

/**
 * Create a new component instance from drag data
 */
export function createComponentInstanceFromDrag(
  dragData: ComponentDragData,
  customProps?: Record<string, unknown>
): ComponentInstance {
  const instance: ComponentInstance = {
    id: generateInstanceId(),
    type: dragData.componentType,
    props: {
      ...dragData.defaultProps,
      ...customProps,
    },
  };

  if (dragData.isContainer) {
    instance.children = [];
  }

  return instance;
}

/**
 * Generate a unique instance ID
 */
export function generateInstanceId(): string {
  return `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate drop target for component
 */
export function canDropComponent(
  dragData: ComponentDragData | any,
  targetComponent?: WrappedComponent,
  targetInstance?: ComponentInstance
): boolean {
  // If no target, can always drop (root level)
  if (!targetComponent && !targetInstance) {
    return true;
  }

  // If target is not a container, cannot drop
  if (targetComponent && !targetComponent.isContainer) {
    return false;
  }

  // Check allowed children if specified
  if (targetComponent?.allowedChildren) {
    const componentType = 'componentType' in dragData ? dragData.componentType : dragData.type;
    return targetComponent.allowedChildren.includes(componentType);
  }

  return true;
}

/**
 * Get drop effect for drag operation
 */
export function getDropEffect(
  event: DragEvent,
  canDrop: boolean
): 'copy' | 'move' | 'link' | 'none' {
  if (!canDrop) return 'none';

  // Check modifier keys
  if (event.ctrlKey || event.metaKey) {
    return 'copy';
  }

  if (event.altKey) {
    return 'link';
  }

  // Default based on source
  const dragData = getDragData(event);
  if (dragData?.source === 'palette') {
    return 'copy';
  }

  if (dragData?.source === 'canvas') {
    return 'move';
  }

  return 'copy';
}

/**
 * Create drag preview element
 */
export function createDragPreview(
  component: WrappedComponent,
  options: {
    width?: number;
    height?: number;
    opacity?: number;
  } = {}
): HTMLElement {
  const { width = 200, height = 100, opacity = 0.8 } = options;

  const preview = document.createElement('div');
  preview.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    background: white;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    opacity: ${opacity};
    pointer-events: none;
    position: absolute;
    top: -1000px;
    left: -1000px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  // Add component info
  const title = document.createElement('div');
  title.textContent = component.displayName;
  title.style.cssText = `
    font-weight: 600;
    font-size: 14px;
    color: #1f2937;
    margin-bottom: 4px;
  `;

  const type = document.createElement('div');
  type.textContent = component.type;
  type.style.cssText = `
    font-size: 12px;
    color: #6b7280;
  `;

  preview.appendChild(title);
  preview.appendChild(type);

  // Add to document temporarily
  document.body.appendChild(preview);

  return preview;
}

/**
 * Set custom drag image
 */
export function setDragImage(
  event: DragEvent,
  component: WrappedComponent,
  options?: {
    width?: number;
    height?: number;
    opacity?: number;
    offsetX?: number;
    offsetY?: number;
  }
): void {
  if (!event.dataTransfer) return;

  const { offsetX = 10, offsetY = 10, ...previewOptions } = options || {};

  const preview = createDragPreview(component, previewOptions);
  
  event.dataTransfer.setDragImage(preview, offsetX, offsetY);

  // Clean up preview after drag starts
  setTimeout(() => {
    if (preview.parentNode) {
      preview.parentNode.removeChild(preview);
    }
  }, 0);
}

/**
 * Drag and drop event handlers
 */
export class DragDropManager {
  private dragStartHandlers = new Set<(event: DragEvent) => void>();
  private dragEndHandlers = new Set<(event: DragEvent) => void>();
  private dropHandlers = new Set<(event: DragEvent) => void>();

  /**
   * Add drag start handler
   */
  onDragStart(handler: (event: DragEvent) => void): () => void {
    this.dragStartHandlers.add(handler);
    return () => this.dragStartHandlers.delete(handler);
  }

  /**
   * Add drag end handler
   */
  onDragEnd(handler: (event: DragEvent) => void): () => void {
    this.dragEndHandlers.add(handler);
    return () => this.dragEndHandlers.delete(handler);
  }

  /**
   * Add drop handler
   */
  onDrop(handler: (event: DragEvent) => void): () => void {
    this.dropHandlers.add(handler);
    return () => this.dropHandlers.delete(handler);
  }

  /**
   * Handle drag start
   */
  handleDragStart(event: DragEvent): void {
    this.dragStartHandlers.forEach(handler => handler(event));
  }

  /**
   * Handle drag end
   */
  handleDragEnd(event: DragEvent): void {
    this.dragEndHandlers.forEach(handler => handler(event));
  }

  /**
   * Handle drop
   */
  handleDrop(event: DragEvent): void {
    this.dropHandlers.forEach(handler => handler(event));
  }
}

// Global drag drop manager
export const dragDropManager = new DragDropManager();