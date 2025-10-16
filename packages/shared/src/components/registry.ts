// Component registry with automatic discovery and registration
import { WrappedComponent, ComponentWrapperConfig, createWrappedComponent } from './wrapper';
import { ComponentCategory } from '../types';

/**
 * Component registry for managing all available components
 */
export class ComponentRegistry {
  private components = new Map<string, WrappedComponent>();
  private categorizedComponents = new Map<ComponentCategory, WrappedComponent[]>();

  /**
   * Register a single component
   */
  register<TProps = Record<string, unknown>>(
    config: ComponentWrapperConfig<TProps>
  ): void {
    const wrappedComponent = createWrappedComponent(config) as WrappedComponent;
    
    // Store in main registry
    this.components.set(wrappedComponent.id, wrappedComponent);
    
    // Store in categorized registry
    const categoryComponents = this.categorizedComponents.get(wrappedComponent.category) || [];
    categoryComponents.push(wrappedComponent);
    this.categorizedComponents.set(wrappedComponent.category, categoryComponents);
    
    console.log(`Registered component: ${wrappedComponent.displayName} (${wrappedComponent.id})`);
  }

  /**
   * Register multiple components at once
   */
  registerMany(configs: ComponentWrapperConfig<any>[]): void {
    configs.forEach(config => this.register(config));
  }

  /**
   * Get a component by ID
   */
  get(id: string): WrappedComponent | undefined {
    return this.components.get(id);
  }

  /**
   * Get all components
   */
  getAll(): WrappedComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get components by category
   */
  getByCategory(category: ComponentCategory): WrappedComponent[] {
    return this.categorizedComponents.get(category) || [];
  }

  /**
   * Get all available categories
   */
  getCategories(): ComponentCategory[] {
    return Array.from(this.categorizedComponents.keys());
  }

  /**
   * Search components by name, tags, or description
   */
  search(query: string): WrappedComponent[] {
    const lowercaseQuery = query.toLowerCase();
    
    return this.getAll().filter(component => {
      const matchesName = component.displayName.toLowerCase().includes(lowercaseQuery);
      const matchesType = component.type.toLowerCase().includes(lowercaseQuery);
      const matchesDescription = component.metadata.description.toLowerCase().includes(lowercaseQuery);
      const matchesTags = component.metadata.tags.some(tag => 
        tag.toLowerCase().includes(lowercaseQuery)
      );
      
      return matchesName || matchesType || matchesDescription || matchesTags;
    });
  }

  /**
   * Filter components by multiple criteria
   */
  filter(criteria: {
    category?: ComponentCategory;
    tags?: string[];
    isContainer?: boolean;
    search?: string;
  }): WrappedComponent[] {
    let components = this.getAll();

    if (criteria.category) {
      components = components.filter(c => c.category === criteria.category);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      components = components.filter(c => 
        criteria.tags!.some(tag => c.metadata.tags.includes(tag))
      );
    }

    if (criteria.isContainer !== undefined) {
      components = components.filter(c => c.isContainer === criteria.isContainer);
    }

    if (criteria.search) {
      const lowercaseQuery = criteria.search.toLowerCase();
      components = components.filter(c => {
        const matchesName = c.displayName.toLowerCase().includes(lowercaseQuery);
        const matchesType = c.type.toLowerCase().includes(lowercaseQuery);
        const matchesDescription = c.metadata.description.toLowerCase().includes(lowercaseQuery);
        const matchesTags = c.metadata.tags.some(tag => 
          tag.toLowerCase().includes(lowercaseQuery)
        );
        
        return matchesName || matchesType || matchesDescription || matchesTags;
      });
    }

    return components;
  }

  /**
   * Check if a component is registered
   */
  has(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * Unregister a component
   */
  unregister(id: string): boolean {
    const component = this.components.get(id);
    if (!component) {
      return false;
    }

    // Remove from main registry
    this.components.delete(id);

    // Remove from categorized registry
    const categoryComponents = this.categorizedComponents.get(component.category);
    if (categoryComponents) {
      const index = categoryComponents.findIndex(c => c.id === id);
      if (index !== -1) {
        categoryComponents.splice(index, 1);
      }
    }

    console.log(`Unregistered component: ${component.displayName} (${id})`);
    return true;
  }

  /**
   * Clear all registered components
   */
  clear(): void {
    this.components.clear();
    this.categorizedComponents.clear();
    console.log('Cleared all registered components');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalComponents: number;
    categoryCounts: Record<ComponentCategory, number>;
    containerComponents: number;
    leafComponents: number;
  } {
    const all = this.getAll();
    const categoryCounts = {} as Record<ComponentCategory, number>;
    
    // Initialize category counts
    const categories: ComponentCategory[] = [
      'layout', 'typography', 'forms', 'navigation', 
      'media', 'feedback', 'data-display', 'overlay'
    ];
    categories.forEach(category => {
      categoryCounts[category] = 0;
    });

    // Count components by category
    all.forEach(component => {
      categoryCounts[component.category]++;
    });

    return {
      totalComponents: all.length,
      categoryCounts,
      containerComponents: all.filter(c => c.isContainer).length,
      leafComponents: all.filter(c => !c.isContainer).length,
    };
  }

  /**
   * Export registry data for serialization
   */
  export(): {
    components: Array<{
      id: string;
      type: string;
      displayName: string;
      category: ComponentCategory;
      metadata: any;
      isContainer: boolean;
      allowedChildren?: string[] | undefined;
    }>;
    categories: ComponentCategory[];
  } {
    const components = this.getAll().map(component => ({
      id: component.id,
      type: component.type,
      displayName: component.displayName,
      category: component.category,
      metadata: component.metadata,
      isContainer: component.isContainer,
      allowedChildren: component.allowedChildren,
    }));

    return {
      components,
      categories: this.getCategories(),
    };
  }
}

// Global registry instance
export const componentRegistry = new ComponentRegistry();

/**
 * Auto-discovery function for components
 * This would be used to automatically register components from a directory
 */
export async function discoverComponents(
  componentModules: Record<string, any>
): Promise<void> {
  const configs: ComponentWrapperConfig[] = [];

  for (const [modulePath, module] of Object.entries(componentModules)) {
    // Check if module exports a component configuration
    if (module.default && typeof module.default === 'object') {
      const config = module.default as ComponentWrapperConfig;
      
      // Validate required properties
      try {
        if (config?.id && config?.type && config?.displayName && typeof config?.component === 'function') {
          configs.push(config);
        } else {
          console.warn(`Invalid component configuration in ${modulePath}:`, config);
        }
      } catch (error) {
        console.warn(`Error processing component configuration in ${modulePath}:`, error);
      }
    }
  }

  // Register all discovered components
  componentRegistry.registerMany(configs);
  
  console.log(`Auto-discovered and registered ${configs.length} components`);
}

/**
 * Helper function to create and register a component in one step
 */
export function defineComponent<TProps = Record<string, unknown>>(
  config: ComponentWrapperConfig<TProps>
): WrappedComponent<TProps> {
  const wrappedComponent = createWrappedComponent(config);
  componentRegistry.register(config);
  return wrappedComponent;
}