// Component utility functions
import { WrappedComponent, ComponentInstance, componentRegistry } from '@oldworldcharm/shared';

/**
 * Get component definition by type
 */
export function getComponentByType(type: string): WrappedComponent | undefined {
  return componentRegistry.get(type);
}

/**
 * Create a new component instance
 */
export function createComponentInstance(
  type: string,
  props: Record<string, unknown> = {},
  children?: ComponentInstance[]
): ComponentInstance | null {
  const component = getComponentByType(type);
  if (!component) {
    console.warn(`Component type "${type}" not found in registry`);
    return null;
  }

  return {
    id: generateUniqueId(),
    type,
    props: {
      ...component.defaultProps,
      ...props,
    },
    children: component.isContainer ? (children || []) : undefined,
  };
}

/**
 * Generate unique ID for component instances
 */
export function generateUniqueId(): string {
  return `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clone a component instance with new ID
 */
export function cloneComponentInstance(instance: ComponentInstance): ComponentInstance {
  const cloned: ComponentInstance = {
    ...instance,
    id: generateUniqueId(),
    props: { ...instance.props },
  };

  if (instance.children) {
    cloned.children = instance.children.map(child => cloneComponentInstance(child));
  }

  return cloned;
}

/**
 * Find component instance by ID in a tree
 */
export function findComponentById(
  instances: ComponentInstance[],
  id: string
): ComponentInstance | null {
  for (const instance of instances) {
    if (instance.id === id) {
      return instance;
    }

    if (instance.children) {
      const found = findComponentById(instance.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Find parent of component instance
 */
export function findParentComponent(
  instances: ComponentInstance[],
  childId: string,
  parent: ComponentInstance | null = null
): ComponentInstance | null {
  for (const instance of instances) {
    if (instance.children) {
      // Check if this instance is the direct parent
      if (instance.children.some(child => child.id === childId)) {
        return instance;
      }

      // Recursively search in children
      const found = findParentComponent(instance.children, childId, instance);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Get component path (array of IDs from root to component)
 */
export function getComponentPath(
  instances: ComponentInstance[],
  targetId: string,
  currentPath: string[] = []
): string[] | null {
  for (const instance of instances) {
    const newPath = [...currentPath, instance.id];

    if (instance.id === targetId) {
      return newPath;
    }

    if (instance.children) {
      const found = getComponentPath(instance.children, targetId, newPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

/**
 * Update component instance props
 */
export function updateComponentProps(
  instances: ComponentInstance[],
  id: string,
  newProps: Record<string, unknown>
): ComponentInstance[] {
  return instances.map(instance => {
    if (instance.id === id) {
      return {
        ...instance,
        props: {
          ...instance.props,
          ...newProps,
        },
      };
    }

    if (instance.children) {
      return {
        ...instance,
        children: updateComponentProps(instance.children, id, newProps),
      };
    }

    return instance;
  });
}

/**
 * Remove component instance from tree
 */
export function removeComponent(
  instances: ComponentInstance[],
  id: string
): ComponentInstance[] {
  return instances
    .filter(instance => instance.id !== id)
    .map(instance => {
      if (instance.children) {
        return {
          ...instance,
          children: removeComponent(instance.children, id),
        };
      }
      return instance;
    });
}

/**
 * Insert component at specific position
 */
export function insertComponent(
  instances: ComponentInstance[],
  newComponent: ComponentInstance,
  parentId?: string,
  index?: number
): ComponentInstance[] {
  // Insert at root level
  if (!parentId) {
    const newInstances = [...instances];
    if (index !== undefined && index >= 0 && index <= newInstances.length) {
      newInstances.splice(index, 0, newComponent);
    } else {
      newInstances.push(newComponent);
    }
    return newInstances;
  }

  // Insert as child of specific parent
  return instances.map(instance => {
    if (instance.id === parentId) {
      const children = instance.children || [];
      const newChildren = [...children];
      
      if (index !== undefined && index >= 0 && index <= newChildren.length) {
        newChildren.splice(index, 0, newComponent);
      } else {
        newChildren.push(newComponent);
      }

      return {
        ...instance,
        children: newChildren,
      };
    }

    if (instance.children) {
      return {
        ...instance,
        children: insertComponent(instance.children, newComponent, parentId, index),
      };
    }

    return instance;
  });
}

/**
 * Move component to new position
 */
export function moveComponent(
  instances: ComponentInstance[],
  componentId: string,
  newParentId?: string,
  newIndex?: number
): ComponentInstance[] {
  // Find and remove the component
  const component = findComponentById(instances, componentId);
  if (!component) {
    return instances;
  }

  const withoutComponent = removeComponent(instances, componentId);
  
  // Insert at new position
  return insertComponent(withoutComponent, component, newParentId, newIndex);
}

/**
 * Get all component instances in a flat array
 */
export function flattenComponents(instances: ComponentInstance[]): ComponentInstance[] {
  const flattened: ComponentInstance[] = [];

  function traverse(components: ComponentInstance[]) {
    for (const component of components) {
      flattened.push(component);
      if (component.children) {
        traverse(component.children);
      }
    }
  }

  traverse(instances);
  return flattened;
}

/**
 * Get component tree depth
 */
export function getTreeDepth(instances: ComponentInstance[]): number {
  let maxDepth = 0;

  function traverse(components: ComponentInstance[], depth: number) {
    maxDepth = Math.max(maxDepth, depth);
    
    for (const component of components) {
      if (component.children) {
        traverse(component.children, depth + 1);
      }
    }
  }

  traverse(instances, 1);
  return maxDepth;
}

/**
 * Validate component tree structure
 */
export function validateComponentTree(instances: ComponentInstance[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const seenIds = new Set<string>();

  function validate(components: ComponentInstance[], path: string[] = []) {
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const currentPath = [...path, i.toString()];

      // Check for duplicate IDs
      if (seenIds.has(component.id)) {
        errors.push(`Duplicate component ID "${component.id}" at path: ${currentPath.join('.')}`);
      } else {
        seenIds.add(component.id);
      }

      // Check if component type exists
      const componentDef = getComponentByType(component.type);
      if (!componentDef) {
        errors.push(`Unknown component type "${component.type}" at path: ${currentPath.join('.')}`);
      }

      // Check children validity
      if (component.children) {
        if (componentDef && !componentDef.isContainer) {
          errors.push(`Non-container component "${component.type}" has children at path: ${currentPath.join('.')}`);
        }

        validate(component.children, currentPath);
      }
    }
  }

  validate(instances);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get component statistics
 */
export function getComponentStats(instances: ComponentInstance[]): {
  totalComponents: number;
  componentsByType: Record<string, number>;
  maxDepth: number;
  containerComponents: number;
  leafComponents: number;
} {
  const flattened = flattenComponents(instances);
  const componentsByType: Record<string, number> = {};
  let containerComponents = 0;
  let leafComponents = 0;

  for (const component of flattened) {
    // Count by type
    componentsByType[component.type] = (componentsByType[component.type] || 0) + 1;

    // Count containers vs leaves
    if (component.children && component.children.length > 0) {
      containerComponents++;
    } else {
      leafComponents++;
    }
  }

  return {
    totalComponents: flattened.length,
    componentsByType,
    maxDepth: getTreeDepth(instances),
    containerComponents,
    leafComponents,
  };
}