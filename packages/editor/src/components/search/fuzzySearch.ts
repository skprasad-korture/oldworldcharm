// Fuzzy search implementation with scoring and highlighting
import { WrappedComponent } from '@oldworldcharm/shared';
import { 
  SearchConfig, 
  SearchField, 
  ComponentSearchResult, 
  SearchFieldMatch,
  SearchFilters,
  SearchOptions 
} from './types';

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  threshold: 0.1,
  maxResults: 50,
  searchFields: [
    { field: 'displayName', weight: 1.0 },
    { field: 'type', weight: 0.8 },
    { field: 'description', weight: 0.6 },
    { field: 'tags', weight: 0.7 },
    { field: 'keywords', weight: 0.5 },
  ],
  fuzzyMatch: true,
  highlightMatches: true,
};

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate fuzzy match score between query and text
 */
function calculateFuzzyScore(query: string, text: string): number {
  if (!query || !text) return 0;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match gets highest score
  if (textLower === queryLower) return 1.0;

  // Starts with query gets high score
  if (textLower.startsWith(queryLower)) return 0.9;

  // Contains query gets medium score
  if (textLower.includes(queryLower)) return 0.7;

  // Fuzzy matching using Levenshtein distance
  const distance = levenshteinDistance(queryLower, textLower);
  const maxLength = Math.max(queryLower.length, textLower.length);
  
  if (maxLength === 0) return 0;
  
  const similarity = 1 - (distance / maxLength);
  
  // Only return fuzzy matches above a threshold
  return similarity > 0.6 ? similarity * 0.5 : 0;
}

/**
 * Find match indices in text for highlighting
 */
function findMatchIndices(query: string, text: string): [number, number][] {
  if (!query || !text) return [];

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  const indices: [number, number][] = [];

  let startIndex = 0;
  while (startIndex < textLower.length) {
    const index = textLower.indexOf(queryLower, startIndex);
    if (index === -1) break;
    
    indices.push([index, index + queryLower.length]);
    startIndex = index + 1;
  }

  return indices;
}

/**
 * Search a specific field in a component
 */
function searchField(
  component: WrappedComponent,
  field: SearchField,
  query: string,
  config: SearchConfig
): SearchFieldMatch | null {
  let value: string;
  
  switch (field.field) {
    case 'displayName':
      value = component.displayName;
      break;
    case 'type':
      value = component.type;
      break;
    case 'description':
      value = component.metadata.description;
      break;
    case 'tags':
      value = component.metadata.tags.join(' ');
      break;
    case 'keywords':
      // This would come from extended metadata in a real implementation
      value = '';
      break;
    default:
      return null;
  }

  const score = calculateFuzzyScore(query, value);
  
  if (score < config.threshold) return null;

  const indices = config.highlightMatches ? findMatchIndices(query, value) : [];

  return {
    field: field.field,
    value,
    indices,
    score: score * field.weight,
  };
}

/**
 * Apply filters to components
 */
function applyFilters(components: WrappedComponent[], filters: SearchFilters): WrappedComponent[] {
  return components.filter(component => {
    // Category filter
    if (filters.categories && filters.categories.length > 0) {
      if (!filters.categories.includes(component.category)) {
        return false;
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => 
        component.metadata.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Container filter
    if (filters.isContainer !== undefined) {
      if (component.isContainer !== filters.isContainer) {
        return false;
      }
    }

    // Note: difficulty and popular filters would require extended metadata
    // These would be implemented when that metadata is available

    return true;
  });
}

/**
 * Search components with fuzzy matching and scoring
 */
export function searchComponents(
  components: WrappedComponent[],
  options: SearchOptions
): ComponentSearchResult[] {
  const config = { ...DEFAULT_SEARCH_CONFIG, ...options.config };
  const { query, filters = {} } = options;

  // Apply filters first
  const filteredComponents = applyFilters(components, filters);

  // If no query, return all filtered components
  if (!query.trim()) {
    return filteredComponents.map(component => ({
      component,
      score: 1.0,
      matches: [],
    }));
  }

  const results: ComponentSearchResult[] = [];

  for (const component of filteredComponents) {
    const matches: SearchFieldMatch[] = [];
    let totalScore = 0;

    // Search each configured field
    for (const field of config.searchFields) {
      const match = searchField(component, field, query, config);
      if (match) {
        matches.push(match);
        totalScore += match.score;
      }
    }

    // Only include components with matches
    if (matches.length > 0) {
      // Normalize score by number of fields searched
      const normalizedScore = totalScore / config.searchFields.length;
      
      results.push({
        component,
        score: normalizedScore,
        matches,
      });
    }
  }

  // Sort by score (highest first) and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxResults);
}

/**
 * Highlight matches in text
 */
export function highlightMatches(text: string, indices: [number, number][]): string {
  if (!indices.length) return text;

  let result = '';
  let lastIndex = 0;

  for (const [start, end] of indices) {
    // Add text before match
    result += text.slice(lastIndex, start);
    
    // Add highlighted match
    result += `<mark>${text.slice(start, end)}</mark>`;
    
    lastIndex = end;
  }

  // Add remaining text
  result += text.slice(lastIndex);

  return result;
}

/**
 * Get search suggestions based on partial query
 */
export function getSearchSuggestions(
  components: WrappedComponent[],
  partialQuery: string,
  maxSuggestions = 5
): string[] {
  if (!partialQuery.trim()) return [];

  const suggestions = new Set<string>();
  const queryLower = partialQuery.toLowerCase();

  for (const component of components) {
    // Check component name
    if (component.displayName.toLowerCase().includes(queryLower)) {
      suggestions.add(component.displayName);
    }

    // Check tags
    for (const tag of component.metadata.tags) {
      if (tag.toLowerCase().includes(queryLower)) {
        suggestions.add(tag);
      }
    }

    // Check type
    if (component.type.toLowerCase().includes(queryLower)) {
      suggestions.add(component.type);
    }

    if (suggestions.size >= maxSuggestions) break;
  }

  return Array.from(suggestions).slice(0, maxSuggestions);
}

/**
 * Create a search index for faster searching
 */
export class ComponentSearchIndex {
  private components: WrappedComponent[] = [];
  private index: Map<string, Set<number>> = new Map();

  constructor(components: WrappedComponent[]) {
    this.buildIndex(components);
  }

  private buildIndex(components: WrappedComponent[]): void {
    this.components = components;
    this.index.clear();

    components.forEach((component, idx) => {
      const searchableText = [
        component.displayName,
        component.type,
        component.metadata.description,
        ...component.metadata.tags,
      ].join(' ').toLowerCase();

      // Create n-grams for better fuzzy matching
      const words = searchableText.split(/\s+/);
      
      for (const word of words) {
        if (word.length < 2) continue;
        
        // Add full word
        this.addToIndex(word, idx);
        
        // Add prefixes for autocomplete
        for (let i = 2; i <= word.length; i++) {
          this.addToIndex(word.slice(0, i), idx);
        }
      }
    });
  }

  private addToIndex(term: string, componentIndex: number): void {
    if (!this.index.has(term)) {
      this.index.set(term, new Set());
    }
    this.index.get(term)!.add(componentIndex);
  }

  /**
   * Fast search using the index
   */
  search(options: SearchOptions): ComponentSearchResult[] {
    const { query, filters = {} } = options;
    
    if (!query.trim()) {
      return applyFilters(this.components, filters).map(component => ({
        component,
        score: 1.0,
        matches: [],
      }));
    }

    const queryTerms = query.toLowerCase().split(/\s+/);
    const candidateIndices = new Set<number>();

    // Find candidate components using the index
    for (const term of queryTerms) {
      const indices = this.index.get(term);
      if (indices) {
        indices.forEach(idx => candidateIndices.add(idx));
      }
    }

    // Get candidate components
    const candidates = Array.from(candidateIndices).map(idx => this.components[idx]);
    
    // Apply filters and full search on candidates
    const filteredCandidates = applyFilters(candidates, filters);
    
    return searchComponents(filteredCandidates, options);
  }

  /**
   * Update the index with new components
   */
  updateIndex(components: WrappedComponent[]): void {
    this.buildIndex(components);
  }
}