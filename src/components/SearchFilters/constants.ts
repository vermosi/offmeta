import type { FilterState } from '@/types/filters';

export const COLORS = [
  {
    id: 'W',
    name: 'White',
    bg: 'mtg-chip-white',
    text: '',
    border: '',
  },
  {
    id: 'U',
    name: 'Blue',
    bg: 'mtg-chip-blue',
    text: '',
    border: '',
  },
  {
    id: 'B',
    name: 'Black',
    bg: 'mtg-chip-black',
    text: '',
    border: '',
  },
  {
    id: 'R',
    name: 'Red',
    bg: 'mtg-chip-red',
    text: '',
    border: '',
  },
  {
    id: 'G',
    name: 'Green',
    bg: 'mtg-chip-green',
    text: '',
    border: '',
  },
  {
    id: 'C',
    name: 'Colorless',
    bg: 'mtg-chip-colorless',
    text: '',
    border: '',
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
