/**
 * Valid Scryfall search keys (without operators) for validation.
 * This allowlist is used to detect potentially invalid/unknown search keys.
 *
 * Extracted from scryfall.ts to avoid circular dependencies and improve testability.
 */
export const VALID_SEARCH_KEYS = new Set([
  // Core operators
  'c',
  'color',
  'id',
  'identity',
  'ci',
  't',
  'type',
  'o',
  'oracle',
  'm',
  'mana',
  'mv',
  'cmc',
  'pow',
  'power',
  'tou',
  'toughness',
  'pt',
  'loy',
  'loyalty',
  'r',
  'rarity',
  's',
  'set',
  'edition',
  'e',
  'cn',
  'number',
  'collector',
  'lang',
  'language',

  // Boolean/Logic helpers
  'is',
  'not',
  'include',
  'in',

  // Formats & legality
  'f',
  'format',
  'legal',
  'banned',
  'restricted',

  // Platforms/Games
  'game',
  'games',
  'paper',
  'arena',
  'mtgo',

  // Art/Cosmetics
  'art',
  'artist',
  'flavor',
  'watermark',
  'border',
  'frame',
  'full',
  'textless',
  'atag',
  'arttag',

  // Time/Value
  'year',
  'date',
  'new',
  'old',
  'usd',
  'eur',
  'tix',
  'cheapest',

  // Sorting/View
  'order',
  'sort',
  'dir',
  'direction',
  'unique',
  'as',
  'st',

  // Special
  'cube',
  'devotion',
  'name',
  'wildpair',
  'keyword',
  'has', // e.g. has:foil

  // Oracle tags (otag/oracletag/function are aliases)
  'otag',
  'oracletag',
  'function',
]);

export const DEFAULT_OVERLY_BROAD_THRESHOLD = 1500;
