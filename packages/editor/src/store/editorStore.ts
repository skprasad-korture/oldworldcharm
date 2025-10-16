import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ComponentInstance } from '@oldworldcharm/shared';

export interface EditorState {
  // Canvas state
  components: ComponentInstance[];
  selectedComponentId: string | null;
  hoveredComponentId: string | null;
  
  // Drag and drop state
  isDragging: boolean;
  draggedComponent: ComponentInstance | null;
  dropTarget: string | null;
  
  // Editor mode
  mode: 'design' | 'preview';
  
  // Clipboard
  clipboard: ComponentInstance | null;
  
  // History for undo/redo
  history: ComponentInstance[][];
  historyIndex: number;
  maxHistorySize: number;
}

export interface EditorActions {
  // Component management
  addComponent: (component: ComponentInstance, parentId?: string, index?: number) => void;
  updateComponent: (id: string, props: Record<string, unknown>) => void;
  removeComponent: (id: string) => void;
  moveComponent: (componentId: string, newParentId?: string, newIndex?: number) => void;
  duplicateComponent: (id: string) => void;
  
  // Selection
  selectComponent: (id: string | null) => void;
  setHoveredComponent: (id: string | null) => void;
  
  // Clipboard operations
  copyComponent: (id: string) => void;
  cutComponent: (id: string) => void;
  pasteComponent: (parentId?: string, index?: number) => void;
  canPaste: () => boolean;
  
  // Drag and drop
  setDragging: (isDragging: boolean) => void;
  setDraggedComponent: (component: ComponentInstance | null) => void;
  setDropTarget: (targetId: string | null) => void;
  
  // Editor mode
  setMode: (mode: 'design' | 'preview') => void;
  
  // History
  pushToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Bulk operations
  setComponents: (components: ComponentInstance[]) => void;
  clearCanvas: () => void;
}

const initialState: EditorState = {
  components: [],
  selectedComponentId: null,
  hoveredComponentId: null,
  isDragging: false,
  draggedComponent: null,
  dropTarget: null,
  mode: 'design',
  clipboard: null,
  history: [[]],
  historyIndex: 0,
  maxHistorySize: 50,
};

export const useEditorStore = create<EditorState & EditorActions>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Component management
      addComponent: (component, parentId, index) => {
        set((state) => {
          const newComponents = addComponentToTree(
            state.components,
            component,
            parentId,
            index
          );
          
          return {
            components: newComponents,
            selectedComponentId: component.id,
          };
        });
        
        get().pushToHistory();
      },

      updateComponent: (id, props) => {
        set((state) => ({
          components: updateComponentInTree(state.components, id, props),
        }));
        
        get().pushToHistory();
      },

      removeComponent: (id) => {
        set((state) => ({
          components: removeComponentFromTree(state.components, id),
          selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
        }));
        
        get().pushToHistory();
      },

      moveComponent: (componentId, newParentId, newIndex) => {
        set((state) => ({
          components: moveComponentInTree(
            state.components,
            componentId,
            newParentId,
            newIndex
          ),
        }));
        
        get().pushToHistory();
      },

      duplicateComponent: (id) => {
        const state = get();
        const component = findComponentById(state.components, id);
        
        if (component) {
          const duplicated = duplicateComponentInstance(component);
          const parent = findParentComponent(state.components, id);
          
          if (parent) {
            const parentIndex = parent.children?.findIndex(child => child.id === id) ?? -1;
            get().addComponent(duplicated, parent.id, parentIndex + 1);
          } else {
            const rootIndex = state.components.findIndex(comp => comp.id === id);
            get().addComponent(duplicated, undefined, rootIndex + 1);
          }
        }
      },

      // Selection
      selectComponent: (id) => {
        set({ selectedComponentId: id });
      },

      setHoveredComponent: (id) => {
        set({ hoveredComponentId: id });
      },

      // Clipboard operations
      copyComponent: (id) => {
        const state = get();
        const component = findComponentById(state.components, id);
        if (component) {
          set({ clipboard: JSON.parse(JSON.stringify(component)) });
        }
      },

      cutComponent: (id) => {
        const state = get();
        const component = findComponentById(state.components, id);
        if (component) {
          set({ 
            clipboard: JSON.parse(JSON.stringify(component)),
            components: removeComponentFromTree(state.components, id),
            selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
          });
          get().pushToHistory();
        }
      },

      pasteComponent: (parentId, index) => {
        const state = get();
        if (state.clipboard) {
          const newComponent = duplicateComponentInstance(state.clipboard);
          get().addComponent(newComponent, parentId, index);
        }
      },

      canPaste: () => {
        const state = get();
        return state.clipboard !== null;
      },

      // Drag and drop
      setDragging: (isDragging) => {
        set({ isDragging });
      },

      setDraggedComponent: (component) => {
        set({ draggedComponent: component });
      },

      setDropTarget: (targetId) => {
        set({ dropTarget: targetId });
      },

      // Editor mode
      setMode: (mode) => {
        set({ mode });
      },

      // History
      pushToHistory: () => {
        set((state) => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(JSON.parse(JSON.stringify(state.components)));
          
          // Limit history size
          if (newHistory.length > state.maxHistorySize) {
            newHistory.shift();
          } else {
            return {
              history: newHistory,
              historyIndex: newHistory.length - 1,
            };
          }
          
          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },

      undo: () => {
        const state = get();
        if (state.historyIndex > 0) {
          const newIndex = state.historyIndex - 1;
          set({
            components: JSON.parse(JSON.stringify(state.history[newIndex])),
            historyIndex: newIndex,
            selectedComponentId: null,
          });
        }
      },

      redo: () => {
        const state = get();
        if (state.historyIndex < state.history.length - 1) {
          const newIndex = state.historyIndex + 1;
          set({
            components: JSON.parse(JSON.stringify(state.history[newIndex])),
            historyIndex: newIndex,
            selectedComponentId: null,
          });
        }
      },

      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      // Bulk operations
      setComponents: (components) => {
        set({ components });
        get().pushToHistory();
      },

      clearCanvas: () => {
        set({ 
          components: [],
          selectedComponentId: null,
          hoveredComponentId: null,
        });
        get().pushToHistory();
      },
    }),
    {
      name: 'editor-store',
    }
  )
);

// Helper functions
function addComponentToTree(
  components: ComponentInstance[],
  newComponent: ComponentInstance,
  parentId?: string,
  index?: number
): ComponentInstance[] {
  if (!parentId) {
    // Add to root level
    const newComponents = [...components];
    if (index !== undefined && index >= 0 && index <= newComponents.length) {
      newComponents.splice(index, 0, newComponent);
    } else {
      newComponents.push(newComponent);
    }
    return newComponents;
  }

  // Add as child of specific parent
  return components.map(component => {
    if (component.id === parentId) {
      const children = component.children || [];
      const newChildren = [...children];
      
      if (index !== undefined && index >= 0 && index <= newChildren.length) {
        newChildren.splice(index, 0, newComponent);
      } else {
        newChildren.push(newComponent);
      }

      return {
        ...component,
        children: newChildren,
      };
    }

    if (component.children) {
      return {
        ...component,
        children: addComponentToTree(component.children, newComponent, parentId, index),
      };
    }

    return component;
  });
}

function updateComponentInTree(
  components: ComponentInstance[],
  id: string,
  newProps: Record<string, unknown>
): ComponentInstance[] {
  return components.map(component => {
    if (component.id === id) {
      return {
        ...component,
        props: {
          ...component.props,
          ...newProps,
        },
      };
    }

    if (component.children) {
      return {
        ...component,
        children: updateComponentInTree(component.children, id, newProps),
      };
    }

    return component;
  });
}

function removeComponentFromTree(
  components: ComponentInstance[],
  id: string
): ComponentInstance[] {
  return components
    .filter(component => component.id !== id)
    .map(component => {
      if (component.children) {
        return {
          ...component,
          children: removeComponentFromTree(component.children, id),
        };
      }
      return component;
    });
}

function moveComponentInTree(
  components: ComponentInstance[],
  componentId: string,
  newParentId?: string,
  newIndex?: number
): ComponentInstance[] {
  // Find and remove the component
  const component = findComponentById(components, componentId);
  if (!component) {
    return components;
  }

  const withoutComponent = removeComponentFromTree(components, componentId);
  
  // Insert at new position
  return addComponentToTree(withoutComponent, component, newParentId, newIndex);
}

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

function findParentComponent(
  components: ComponentInstance[],
  childId: string
): ComponentInstance | null {
  for (const component of components) {
    if (component.children) {
      // Check if this component is the direct parent
      if (component.children.some(child => child.id === childId)) {
        return component;
      }

      // Recursively search in children
      const found = findParentComponent(component.children, childId);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function duplicateComponentInstance(instance: ComponentInstance): ComponentInstance {
  const duplicated: ComponentInstance = {
    ...instance,
    id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    props: { ...instance.props },
  };

  if (instance.children) {
    duplicated.children = instance.children.map(child => duplicateComponentInstance(child));
  }

  return duplicated;
}