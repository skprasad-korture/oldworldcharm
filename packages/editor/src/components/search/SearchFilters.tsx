// Search filters interface
import React from 'react';
import { ComponentCategory, CATEGORY_METADATA } from '@oldworldcharm/shared';
import { PaletteFilters } from '../palette/types';

/**
 * Props for SearchFilters
 */
export interface SearchFiltersProps {
  /** Current filter values */
  filters: PaletteFilters;
  /** Filter change callback */
  onChange: (filters: PaletteFilters) => void;
  /** Close callback */
  onClose: () => void;
}

/**
 * Search filters panel
 */
export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  onChange,
  onClose,
}) => {
  // Handle category filter change
  const handleCategoryChange = (category: ComponentCategory | undefined) => {
    onChange({
      ...filters,
      category,
    });
  };

  // Handle container filter change
  const handleContainerChange = (isContainer: boolean | undefined) => {
    onChange({
      ...filters,
      isContainer,
    });
  };

  // Handle difficulty filter change
  const handleDifficultyChange = (difficulty: 'beginner' | 'intermediate' | 'advanced' | undefined) => {
    onChange({
      ...filters,
      difficulty,
    });
  };

  // Handle popular filter change
  const handlePopularChange = (popular: boolean | undefined) => {
    onChange({
      ...filters,
      popular,
    });
  };

  // Handle tag filter change
  const handleTagsChange = (tags: string[]) => {
    onChange({
      ...filters,
      tags: tags.length > 0 ? tags : undefined,
    });
  };

  // Clear all filters
  const handleClearAll = () => {
    onChange({});
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null;
  });

  return (
    <div className="search-filters bg-white border rounded-lg shadow-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Category
          </label>
          <select
            value={filters.category || ''}
            onChange={(e) => handleCategoryChange(e.target.value as ComponentCategory || undefined)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="">All categories</option>
            {Object.entries(CATEGORY_METADATA).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Container Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Component Type
          </label>
          <div className="space-y-1">
            <label className="flex items-center">
              <input
                type="radio"
                name="container"
                checked={filters.isContainer === undefined}
                onChange={() => handleContainerChange(undefined)}
                className="mr-2"
              />
              <span className="text-xs">All types</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="container"
                checked={filters.isContainer === true}
                onChange={() => handleContainerChange(true)}
                className="mr-2"
              />
              <span className="text-xs">Containers only</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="container"
                checked={filters.isContainer === false}
                onChange={() => handleContainerChange(false)}
                className="mr-2"
              />
              <span className="text-xs">Components only</span>
            </label>
          </div>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Difficulty
          </label>
          <select
            value={filters.difficulty || ''}
            onChange={(e) => handleDifficultyChange(e.target.value as any || undefined)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        {/* Popular Filter */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filters.popular === true}
              onChange={(e) => handlePopularChange(e.target.checked ? true : undefined)}
              className="mr-2"
            />
            <span className="text-xs font-medium text-gray-700">Popular components only</span>
          </label>
        </div>

        {/* Tags Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Tags
          </label>
          <TagInput
            value={filters.tags || []}
            onChange={handleTagsChange}
            placeholder="Add tags..."
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Tag input component
 */
interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TagInput: React.FC<TagInputProps> = ({ value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const tag = inputValue.trim();
      if (tag && !value.includes(tag)) {
        onChange([...value, tag]);
        setInputValue('');
      }
    } else if (event.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="tag-input border border-gray-300 rounded px-2 py-1 min-h-[32px] flex flex-wrap items-center gap-1">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
        >
          {tag}
          <button
            onClick={() => removeTag(tag)}
            className="ml-1 text-blue-600 hover:text-blue-800"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[60px] outline-none text-xs"
      />
    </div>
  );
};