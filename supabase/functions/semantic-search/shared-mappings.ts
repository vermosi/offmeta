/**
 * Shared MTG Mappings and Constants
 *
 * Centralized source of truth for color maps, slang, and card types.
 */

export const COLOR_MAP: Record<string, string> = {
  white: 'w',
  w: 'w',
  blue: 'u',
  u: 'u',
  black: 'b',
  b: 'b',
  red: 'r',
  r: 'r',
  green: 'g',
  g: 'g',
  colorless: 'c',
  c: 'c',
};

export const MULTICOLOR_MAP: Record<string, string> = {
  azorius: 'wu',
  dimir: 'ub',
  rakdos: 'br',
  gruul: 'rg',
  selesnya: 'gw',
  orzhov: 'wb',
  izzet: 'ur',
  golgari: 'bg',
  boros: 'rw',
  simic: 'gu',
  bant: 'gwu',
  esper: 'wub',
  grixis: 'ubr',
  jund: 'brg',
  naya: 'rgw',
  abzan: 'wbg',
  jeskai: 'urw',
  sultai: 'bgu',
  mardu: 'rwb',
  temur: 'gur',
  'yore-tiller': 'wubr',
  'glint-eye': 'ubrg',
  'dune-brood': 'brgw',
  'ink-treader': 'rgwu',
  'witch-maw': 'gwub',
  'sans-white': 'ubrg',
  'sans-blue': 'brgw',
  'sans-black': 'rgwu',
  'sans-red': 'gwub',
  'sans-green': 'wubr',
};

export const CARD_TYPES = [
  'creature',
  'artifact',
  'enchantment',
  'instant',
  'sorcery',
  'land',
  'planeswalker',
  'battle',
  'kindred',
  'equipment',
];

export const WORD_NUMBER_MAP: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

export const COMPANION_RESTRICTIONS: Record<string, string[]> = {
  jegantha: [
    '-mana:{W}{W}',
    '-mana:{U}{U}',
    '-mana:{B}{B}',
    '-mana:{R}{R}',
    '-mana:{G}{G}',
  ],
};

export const SLANG_MAP: Record<string, string> = {
  bob: 'Dark Confidant',
  steve: 'Sakura-Tribe Elder',
  gary: 'Gray Merchant of Asphodel',
  tim: 'Prodigal Sorcerer',
  'sad robot': 'Solemn Simulacrum',
  mom: 'Mother of Runes',
  goyf: 'Tarmogoyf',
  snappy: 'Snapcaster Mage',
  bolt: 'Lightning Bolt',
  path: 'Path to Exile',
  swords: 'Swords to Plowshares',
  fow: 'Force of Will',
  tron: 't:land (set:atq OR set:chr)',
};

export const SYNONYM_MAP: Record<string, string> = {
  // Plurals → singular
  creatures: 'creature',
  spells: 'spell',
  lands: 'land',
  artifacts: 'artifact',
  enchantments: 'enchantment',
  planeswalkers: 'planeswalker',
  instants: 'instant',
  sorceries: 'sorcery',
  tutors: 'tutor',
  counterspells: 'counterspell',
  tokens: 'token',
  // Budget synonyms
  budget: 'cheap',
  affordable: 'cheap',
  inexpensive: 'cheap',
  'low cost': 'cheap',
  // Common variations
  edh: 'commander',
  cmdr: 'commander',
  cmc: 'mana value',
  mv: 'mana value',
  etbs: 'etb',
  'enters the battlefield': 'etb',
  ltbs: 'ltb',
  'leaves the battlefield': 'ltb',
  graveyard: 'gy',
  yard: 'gy',
  // Tribal
  tribal: 'typal',
  // Actions
  'draw cards': 'card draw',
  'draws cards': 'card draw',
  'drawing cards': 'card draw',
};
