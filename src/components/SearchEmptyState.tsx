import { useQuerySuggestions } from '@/hooks/useQuerySuggestions';
import { EmptyState } from '@/components/EmptyState';
import type { FilterState } from '@/types/filters';

interface SearchEmptyStateProps {
  query: string;
  totalCards: number;
  hasSearched: boolean;
  onTryExample?: (query: string) => void;
  onTrySuggestion?: (scryfallQuery: string) => void;
  activeFilters?: FilterState | null;
  onApplyFilterPatch?: (patch: Partial<FilterState>) => void;
  onClearAllFilters?: () => void;
  variant?: 'server' | 'filtered';
  filteredFromCount?: number;
}

export function SearchEmptyState({
  query,
  totalCards,
  hasSearched,
  onTryExample,
  onTrySuggestion,
  activeFilters,
  onApplyFilterPatch,
  onClearAllFilters,
  variant = 'server',
  filteredFromCount,
}: SearchEmptyStateProps) {
  const { suggestions, isChecking } = useQuerySuggestions(
    query,
    totalCards,
    hasSearched,
  );

  return (
    <EmptyState
      query={query}
      onTryExample={onTryExample}
      suggestions={suggestions}
      isCheckingSuggestions={isChecking}
      onTrySuggestion={onTrySuggestion}
      activeFilters={activeFilters}
      onApplyFilterPatch={onApplyFilterPatch}
      onClearAllFilters={onClearAllFilters}
      variant={variant}
      filteredFromCount={filteredFromCount}
    />
  );
}
