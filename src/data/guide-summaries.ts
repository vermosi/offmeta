/**
 * Lightweight guide index (slug + title only) for nav/footer usage.
 * Kept separate from `guides.ts` so components that only need to link to
 * guides don't pull in the full 25KB+ guide content bundle.
 * Order matches `GUIDES` in `./guides.ts`.
 */

export interface GuideSummary {
  slug: string;
  title: string;
}

export const GUIDE_SUMMARIES: GuideSummary[] = [
  { slug: 'search-by-creature-type', title: 'Search by Creature Type' },
  { slug: 'filter-by-color', title: 'Filter by Color' },
  { slug: 'budget-price-filters', title: 'Budget & Price Filters' },
  { slug: 'format-legality-search', title: 'Format Legality Search' },
  { slug: 'keyword-ability-search', title: 'MTG Keyword Ability Search' },
  { slug: 'ramp-and-card-draw', title: 'Ramp & Card Draw' },
  { slug: 'tribal-synergies-for-commander', title: 'Tribal Synergies for Commander' },
  { slug: 'token-and-sacrifice-synergies', title: 'Token & Sacrifice Synergies' },
  { slug: 'etb-and-flicker-combos', title: 'ETB & Flicker Combos' },
  { slug: 'multi-constraint-complex-search', title: 'Multi-Constraint Complex Search' },
];
