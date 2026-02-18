/**
 * Shared format constants used across the deck builder pages.
 * @module data/formats
 */

export const FORMATS = [
  { value: 'commander', label: 'Commander', max: 100 },
  { value: 'standard', label: 'Standard', max: 60 },
  { value: 'modern', label: 'Modern', max: 60 },
  { value: 'pioneer', label: 'Pioneer', max: 60 },
  { value: 'legacy', label: 'Legacy', max: 60 },
  { value: 'vintage', label: 'Vintage', max: 60 },
  { value: 'pauper', label: 'Pauper', max: 60 },
  { value: 'oathbreaker', label: 'Oathbreaker', max: 60 },
  { value: 'brawl', label: 'Brawl', max: 60 },
] as const;

/** Human-readable labels keyed by format value — for display in lists. */
export const FORMAT_LABELS: Record<string, string> = Object.fromEntries(
  FORMATS.map(({ value, label }) => [value, label]),
);
