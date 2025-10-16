// Component search interface with filters
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { PaletteFilters } from '../palette/types';
import { SearchFilters } from './SearchFilters';

/**
 * Props for ComponentSearch
 */
export interface ComponentSearchProps {
  /** Search callback */
  onSearch: (query: string) => void;
  /** Filter change callback */
  onFilterChange: (filters: PaletteFilters) => void;
  /** Whether to show filter controls */
  showFilters?: boolean;
  /** Search input placeholder */
  placeholder?: string;
  /** Initial search query */
  initialQuery?: string;
  /** Debounce delay in ms */
  debounceDelay?: number;
}

/**
 * Component search interface
 */
export const ComponentSearch: React.FC<ComponentSearchProps> = ({
  onSearch,
  onFilterChange,
  showFilters = true,
  placeholder = 'Search components...',
  initialQuery = '',
  debounceDelay = 300,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filters, setFilters] = useState<PaletteFilters>({});
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onSearch(searchQuery);
    }, debounceDelay);
  }, [onSearch, debounceDelay]);

  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = event.target.value;
    setQuery(newQuery);
    debouncedSearch(newQuery);
  };

  // Handle filter change
  const handleFilterChange = (newFilters: PaletteFilters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  // Toggle filter panel
  const toggleFilters = () => {
    setShowFilterPanel(!showFilterPanel);
  };

  // Keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (query) {
        handleClear();
      } else {
        inputRef.current?.blur();
      }
    }
  };

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null;
  }).length;

  return (
    <div className="component-search">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />

        <div className="absolute inset-y-0 right-0 flex items-center">
          {/* Clear Button */}
          {query && (
            <button
              onClick={handleClear}
              className="p-1 mr-1 text-gray-400 hover:text-gray-600 rounded"
              title="Clear search"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Filter Toggle */}
          {showFilters && (
            <button
              onClick={toggleFilters}
              className={`p-1 mr-2 rounded ${
                showFilterPanel || activeFilterCount > 0
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Filters"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && showFilterPanel && (
        <div className="mt-2">
          <SearchFilters
            filters={filters}
            onChange={handleFilterChange}
            onClose={() => setShowFilterPanel(false)}
          />
        </div>
      )}

      {/* Search Suggestions */}
      {query && (
        <div className="mt-1">
          <div className="text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to clear
          </div>
        </div>
      )}
    </div>
  );
};