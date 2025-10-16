// Component palette types
import { ComponentCategory, WrappedComponent } from '@oldworldcharm/shared';

/**
 * Component palette filter options
 */
export interface PaletteFilters {
  category?: ComponentCategory;
  search?: string;
  tags?: string[];
  isContainer?: boolean;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  popular?: boolean;
}

/**
 * Component palette sort options
 */
export type PaletteSortBy = 'name' | 'category' | 'popularity' | 'recent';
export type PaletteSortOrder = 'asc' | 'desc';

/**
 * Component palette view mode
 */
export type PaletteViewMode = 'grid' | 'list' | 'compact';

/**
 * Drag and drop data for components
 */
export interface ComponentDragData {
  componentId: string;
  componentType: string;
  defaultProps: Record<string, unknown>;
  isContainer: boolean;
  source: 'palette';
}

/**
 * Component palette state
 */
export interface PaletteState {
  components: WrappedComponent[];
  filteredComponents: WrappedComponent[];
  filters: PaletteFilters;
  sortBy: PaletteSortBy;
  sortOrder: PaletteSortOrder;
  viewMode: PaletteViewMode;
  selectedCategory?: ComponentCategory;
  searchQuery: string;
  isLoading: boolean;
  error?: string;
}

/**
 * Component item props for rendering in palette
 */
export interface ComponentItemProps {
  component: WrappedComponent;
  viewMode: PaletteViewMode;
  onSelect?: (component: WrappedComponent) => void;
  onDragStart?: (component: WrappedComponent, dragData: ComponentDragData) => void;
  isSelected?: boolean;
  showPreview?: boolean;
}

/**
 * Component category props
 */
export interface ComponentCategoryProps {
  category: ComponentCategory;
  components: WrappedComponent[];
  isExpanded: boolean;
  onToggle: (category: ComponentCategory) => void;
  onComponentSelect?: (component: WrappedComponent) => void;
  viewMode: PaletteViewMode;
}

/**
 * Search result with highlighting
 */
export interface SearchResult {
  component: WrappedComponent;
  matches: SearchMatch[];
  score: number;
}

/**
 * Search match information
 */
export interface SearchMatch {
  field: 'name' | 'description' | 'tags' | 'keywords';
  value: string;
  indices: [number, number][];
}