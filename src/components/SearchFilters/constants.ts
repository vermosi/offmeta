import type { FilterState } from '@/types/filters';

export const COLORS = [
  {
    id: 'W',
    name: 'White',
    bg: 'bg-amber-100 dark:bg-amber-200',
    text: 'text-amber-900',
    border: 'border-amber-300',
  },
  {
    id: 'U',
    name: 'Blue',
    bg: 'bg-blue-100 dark:bg-blue-200',
    text: 'text-blue-900',
    border: 'border-blue-300',
  },
  {
    id: 'B',
    name: 'Black',
    bg: 'bg-zinc-200 dark:bg-zinc-300',
    text: 'text-zinc-900',
    border: 'border-zinc-400',
  },
  {
    id: 'R',
    name: 'Red',
    bg: 'bg-red-100 dark:bg-red-200',
    text: 'text-red-900',
    border: 'border-red-300',
  },
  {
    id: 'G',
    name: 'Green',
    bg: 'bg-green-100 dark:bg-green-200',
    text: 'text-green-900',
    border: 'border-green-300',
  },
  {
    id: 'C',
    name: 'Colorless',
    bg: 'bg-slate-100 dark:bg-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
] as const;

export const CARD_TYPES = [
  'Creature',
  'Instant',
  'Sorcery',
  'Enchantment',
  'Artifact',
  'Planeswalker',
  'Land',
  'Battle',
] as const;

export const SORT_OPTIONS = [
  { value: 'name-asc', labelKey: 'filters.sortNameAsc' },
  { value: 'name-desc', labelKey: 'filters.sortNameDesc' },
  { value: 'cmc-asc', labelKey: 'filters.sortCmcAsc' },
  { value: 'cmc-desc', labelKey: 'filters.sortCmcDesc' },
  { value: 'price-asc', labelKey: 'filters.sortPriceAsc' },
  { value: 'price-desc', labelKey: 'filters.sortPriceDesc' },
  { value: 'rarity-asc', labelKey: 'filters.sortRarityAsc' },
  { value: 'rarity-desc', labelKey: 'filters.sortRarityDesc' },
  { value: 'edhrec-asc', labelKey: 'filters.sortEdhrecAsc' },
  { value: 'edhrec-desc', labelKey: 'filters.sortEdhrecDesc' },
] as const;

export const RARITY_ORDER = {
  common: 0,
  uncommon: 1,
  rare: 2,
  mythic: 3,
  special: 4,
  bonus: 5,
};

export const buildDefaultFilters = (maxCmc: number): FilterState => ({
  colors: [],
  types: [],
  cmcRange: [0, maxCmc],
  sortBy: 'name-asc',
});
