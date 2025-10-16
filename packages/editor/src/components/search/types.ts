// Search types
import { WrappedComponent, ComponentCategory } from '@oldworldcharm/shared';

/**
 * Search configuration
 */
export interface SearchConfig {
  /** Minimum score threshold for results */
  threshold: number;
  /** Maximum number of results to return */
  maxResults: number;
  /** Fields to search in */
  searchFields: SearchField[];
  /** Whether to include fuzzy matching */
  fuzzyMatch: boolean;
  /** Whether to highlight matches */
  highlightMatches: boolean;
}

/**
 * Searchable fields with weights
 */
export interface SearchField {
  field: 'displayName' | 'type' | 'description' | 'tags' | 'keywords';
  weight: number;
}

/**
 * Search result with score and matches
 */
export interface ComponentSearchResult {
  component: WrappedComponent;
  score: number;
  matches: SearchFieldMatch[];
}

/**
 * Match information for a specific field
 */
export interface SearchFieldMatch {
  field: string;
  value: string;
  indices: [number, number][];
  score: number;
}

/**
 * Search filters
 */
export interface SearchFilters {
  categories?: ComponentCategory[];
  tags?: string[];
  isContainer?: boolean;
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[];
  popular?: boolean;
}

/**
 * Search options
 */
export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  config?: Partial<SearchConfig>;
}

/**
 * Search state
 */
export interface SearchState {
  query: string;
  results: ComponentSearchResult[];
  filters: SearchFilters;
  isSearching: boolean;
  hasSearched: boolean;
  totalResults: number;
  searchTime: number;
}