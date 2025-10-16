// Main component palette with search and filtering
import React, { useState, useMemo, useEffect } from 'react';
import { WrappedComponent, ComponentCategory, componentRegistry } from '@oldworldcharm/shared';
import { ComponentCategory as CategoryComponent } from './ComponentCategory';
import { ComponentSearch } from '../search/ComponentSearch';
import { PaletteFilters, PaletteViewMode, PaletteSortBy, PaletteSortOrder } from './types';
import { searchComponents } from '../search/fuzzySearch';

/**
 * Props for the ComponentPalette
 */
export interface ComponentPaletteProps {
  /** Callback when a component is selected */
  onComponentSelect?: (component: WrappedComponent) => void;
  /** Callback when drag starts */
  onDragStart?: (component: WrappedComponent) => void;
  /** Initial view mode */
  initialViewMode?: PaletteViewMode;
  /** Whether to show search */
  showSearch?: boolean;
  /** Whether to show filters */
  showFilters?: boolean;
  /** Custom component list (if not using registry) */
  components?: WrappedComponent[];
}

/**
 * Main component palette interface
 */
export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onComponentSelect,
  onDragStart,
  initialViewMode = 'grid',
  showSearch = true,
  showFilters = true,
  components: customComponents,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<PaletteFilters>({});
  const [viewMode, setViewMode] = useState<PaletteViewMode>(initialViewMode);
  const [sortBy, setSortBy] = useState<PaletteSortBy>('name');
  const [sortOrder, setSortOrder] = useState<PaletteSortOrder>('asc');
  const [expandedCategories, setExpandedCategories] = useState<Set<ComponentCategory>>(
    new Set(['layout', 'forms']) // Default expanded categories
  );
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);

  // Get components from registry or props
  const allComponents = useMemo(() => {
    return customComponents || componentRegistry.getAll();
  }, [customComponents]);

  // Filter and search components
  const filteredComponents = useMemo(() => {
    if (!searchQuery && Object.keys(filters).length === 0) {
      return allComponents;
    }

    const searchResults = searchComponents(allComponents, {
      query: searchQuery,
      filters: {
        categories: filters.category ? [filters.category] : undefined,
        tags: filters.tags,
        isContainer: filters.isContainer,
      },
    });

    return searchResults.map(result => result.component);
  }, [allComponents, searchQuery, filters]);

  // Sort components
  const sortedComponents = useMemo(() => {
    const sorted = [...filteredComponents].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.displayName.localeCompare(b.displayName);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        case 'popularity':
          // Would use popularity metadata if available
          comparison = 0;
          break;
        case 'recent':
          // Would use creation/update date if available
          comparison = 0;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredComponents, sortBy, sortOrder]);

  // Group components by category
  const componentsByCategory = useMemo(() => {
    const grouped = new Map<ComponentCategory, WrappedComponent[]>();
    
    sortedComponents.forEach(component => {
      const existing = grouped.get(component.category) || [];
      existing.push(component);
      grouped.set(component.category, existing);
    });

    return grouped;
  }, [sortedComponents]);

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (newFilters: PaletteFilters) => {
    setFilters(newFilters);
  };

  const handleCategoryToggle = (category: ComponentCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleComponentSelect = (component: WrappedComponent) => {
    setSelectedComponent(component.id);
    onComponentSelect?.(component);
  };

  const handleDragStart = (component: WrappedComponent) => {
    onDragStart?.(component);
  };

  // Auto-expand categories when searching
  useEffect(() => {
    if (searchQuery) {
      const categoriesWithResults = new Set<ComponentCategory>();
      componentsByCategory.forEach((components, category) => {
        if (components.length > 0) {
          categoriesWithResults.add(category);
        }
      });
      setExpandedCategories(categoriesWithResults);
    }
  }, [searchQuery, componentsByCategory]);

  return (
    <div className="component-palette h-full flex flex-col bg-white">
      {/* Header */}
      <div className="palette-header border-b bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Components</h2>
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-white rounded-lg border p-1">
            {(['grid', 'list', 'compact'] as PaletteViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 text-xs rounded ${
                  viewMode === mode
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
              >
                {mode.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <ComponentSearch
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            showFilters={showFilters}
            placeholder="Search components..."
          />
        )}

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 mt-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as PaletteSortBy)}
            className="text-xs border rounded px-2 py-1"
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="popularity">Popularity</option>
            <option value="recent">Recent</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-xs border rounded px-2 py-1 hover:bg-gray-100"
            title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>

        {/* Results Summary */}
        <div className="mt-2 text-xs text-gray-500">
          {filteredComponents.length} component{filteredComponents.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {/* Component List */}
      <div className="palette-content flex-1 overflow-y-auto">
        {componentsByCategory.size > 0 ? (
          Array.from(componentsByCategory.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([category, components]) => (
              <CategoryComponent
                key={category}
                category={category}
                components={components}
                isExpanded={expandedCategories.has(category)}
                onToggle={handleCategoryToggle}
                onComponentSelect={handleComponentSelect}
                viewMode={viewMode}
              />
            ))
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No components found</h3>
              <p className="text-gray-500">
                {searchQuery
                  ? `No components match "${searchQuery}"`
                  : 'No components available'}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="palette-footer border-t bg-gray-50 p-2">
        <div className="text-xs text-gray-500 text-center">
          Drag components to the canvas to add them
        </div>
      </div>
    </div>
  );
};