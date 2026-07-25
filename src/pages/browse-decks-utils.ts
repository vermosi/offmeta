export interface DeckFilterState {
  nameFilter: string;
  formatFilter: string;
  colorFilter: string[];
  tagFilter: string[];
}

export function buildActiveDeckFilters({
  nameFilter,
  formatFilter,
  colorFilter,
  tagFilter,
}: DeckFilterState): string[] {
  const active: string[] = [];

  if (nameFilter.trim()) {
    active.push(`Name: ${nameFilter.trim()}`);
  }
  if (formatFilter) {
    active.push(`Format: ${formatFilter}`);
  }
  if (colorFilter.length > 0) {
    active.push(`Colors: ${colorFilter.join(', ')}`);
  }
  if (tagFilter.length > 0) {
    active.push(`Tags: ${tagFilter.join(', ')}`);
  }

  return active;
}
