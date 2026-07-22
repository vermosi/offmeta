// Static guide metadata mirror used by the prerender edge function so
// social crawlers get per-route og:title/og:description for /guides/:slug.
// Keep in sync with src/data/guides.ts (slug, metaTitle, metaDescription, heading).

export interface GuideMeta {
  slug: string;
  title: string;
  description: string;
  heading: string;
}

export const GUIDES_META: GuideMeta[] = [
  {
    slug: 'search-by-creature-type',
    title: 'MTG Tribe Search — Find Dragons, Elves & More | OffMeta',
    description:
      'Find every Dragon, Elf, Goblin or Vampire in MTG without Scryfall syntax. Type the tribe in plain English — OffMeta does the rest. Free, instant, no login.',
    heading: 'How to Search MTG Cards by Creature Type',
  },
  {
    slug: 'filter-by-color',
    title: 'MTG Color Search — Find Cards by Color or Identity | OffMeta',
    description:
      'Search MTG cards by color, guild pair, shard or commander color identity in plain English. Mono-red, Esper, Bant — no syntax, no login. Try it free.',
    heading: 'Filter MTG Cards by Color and Color Identity',
  },
  {
    slug: 'budget-price-filters',
    title: 'Budget MTG Card Finder — Cheap Staples Under $5 | OffMeta',
    description:
      'Find budget MTG cards in seconds: cheap removal, ramp, board wipes & Commander staples under $5, $10 or any price. Plain English search, free to use.',
    heading: 'Find Budget MTG Cards by Price',
  },
  {
    slug: 'format-legality-search',
    title: 'MTG Format Legal Search — Commander, Modern & More | OffMeta',
    description:
      'Find cards legal in Commander, Standard, Modern, Pioneer, Pauper & more. Type "modern counterspells" or "pauper removal" — OffMeta filters by format instantly.',
    heading: 'Search MTG Cards by Format Legality',
  },
  {
    slug: 'keyword-ability-search',
    title: 'MTG Keywords List — Flying, Deathtouch & 100+ | OffMeta',
    description:
      'Complete MTG keyword list: flying, deathtouch, haste, trample, lifelink, ward & 100+ more. Search every card with any keyword ability — no Scryfall syntax needed.',
    heading: 'MTG Keyword Ability Search',
  },
  {
    slug: 'ramp-and-card-draw',
    title: 'Best MTG Ramp & Card Draw — Find Engines Fast | OffMeta',
    description:
      'Find the best ramp spells, mana dorks, card draw engines & Commander staples in MTG. Search by what cards do — not what they say. Free, no syntax.',
    heading: 'Find MTG Ramp and Card Draw Engines',
  },
  {
    slug: 'tribal-synergies-for-commander',
    title: 'MTG Tribal Finder — Lords & Payoffs for Commander | OffMeta',
    description:
      'Build better tribal Commander decks. Find lords, anthems, tribal payoffs & synergies for Dragons, Elves, Goblins or any tribe — instantly, in plain English.',
    heading: 'Tribal Synergies for Commander',
  },
  {
    slug: 'token-and-sacrifice-synergies',
    title: 'MTG Aristocrats Finder — Tokens, Sac & Drains | OffMeta',
    description:
      'Build the perfect Aristocrats deck: token generators, sacrifice outlets, death triggers & drain effects in one search. Free MTG card finder, no syntax.',
    heading: 'Token and Sacrifice (Aristocrats) Synergies',
  },
  {
    slug: 'etb-and-flicker-combos',
    title: 'MTG ETB & Flicker Combos — Best Blink Cards (2026) | OffMeta',
    description:
      'Find every ETB trigger, blink effect & flicker payoff in MTG. Build infinite ETB combos and value engines for Commander — no Scryfall syntax required.',
    heading: 'ETB Triggers and Flicker Combos',
  },
  {
    slug: 'multi-constraint-complex-search',
    title: 'Advanced MTG Search — Color, Type, Price & Format | OffMeta',
    description:
      'Run complex MTG searches in one sentence: "Esper utility lands under $5 for Commander". Combine color, type, format, price & function — OffMeta handles it.',
    heading: 'Multi-Constraint Advanced Search',
  },
];

export function getGuideMetaBySlug(slug: string): GuideMeta | undefined {
  return GUIDES_META.find((g) => g.slug === slug);
}
