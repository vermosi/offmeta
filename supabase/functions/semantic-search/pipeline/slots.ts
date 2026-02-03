/**
 * Stage 3: Slot Extraction
 * Extracts structured constraints from the normalized query
 */

import type { ExtractedSlots } from './types.ts';
import { COLOR_MAP, MULTICOLOR_MAP, CARD_TYPES } from '../shared-mappings.ts';

// Format aliases
const FORMAT_MAP: Record<string, string> = {
  commander: 'commander',
  edh: 'commander',
  modern: 'modern',
  standard: 'standard',
  pioneer: 'pioneer',
  legacy: 'legacy',
  vintage: 'vintage',
  pauper: 'pauper',
  historic: 'historic',
  brawl: 'brawl',
  alchemy: 'alchemy',
  explorer: 'explorer',
  timeless: 'timeless',
};

// Rarity map
const RARITY_MAP: Record<string, string> = {
  common: 'common',
  commons: 'common',
  uncommon: 'uncommon',
  uncommons: 'uncommon',
  rare: 'rare',
  rares: 'rare',
  mythic: 'mythic',
  mythics: 'mythic',
  'mythic rare': 'mythic',
};

// Common subtypes to look for
const COMMON_SUBTYPES = [
  'elf',
  'elves',
  'goblin',
  'goblins',
  'zombie',
  'zombies',
  'vampire',
  'vampires',
  'dragon',
  'dragons',
  'angel',
  'angels',
  'demon',
  'demons',
  'spirit',
  'spirits',
  'human',
  'humans',
  'wizard',
  'wizards',
  'warrior',
  'warriors',
  'soldier',
  'soldiers',
  'merfolk',
  'elemental',
  'elementals',
  'sliver',
  'slivers',
  'dinosaur',
  'dinosaurs',
  'knight',
  'knights',
  'cleric',
  'clerics',
  'rogue',
  'rogues',
  'pirate',
  'pirates',
  'cat',
  'cats',
  'dog',
  'dogs',
  'bird',
  'birds',
  'beast',
  'beasts',
  'equipment',
  'aura',
  'auras',
  'saga',
  'sagas',
  'vehicle',
  'vehicles',
];

/**
 * Extracts structured slots from a normalized query
 */
export function extractSlots(normalizedQuery: string): ExtractedSlots {
  let remaining = normalizedQuery;

  const slots: ExtractedSlots = {
    format: null,
    colors: null,
    types: { include: [], includeOr: [], exclude: [] },
    subtypes: [],
    mv: null,
    power: null,
    toughness: null,
    year: null,
    price: null,
    rarity: null,
    includeText: [],
    excludeText: [],
    tags: [],
    specials: [],
    residual: '',
  };

  // Extract format
  const formatResult = extractFormat(remaining);
  slots.format = formatResult.format;
  remaining = formatResult.remaining;

  // Extract colors
  const colorResult = extractColors(remaining);
  slots.colors = colorResult.colors;
  remaining = colorResult.remaining;

  // Extract types
  const typeResult = extractTypes(remaining);
  slots.types = typeResult.types;
  remaining = typeResult.remaining;

  // Extract subtypes
  const subtypeResult = extractSubtypes(remaining);
  slots.subtypes = subtypeResult.subtypes;
  remaining = subtypeResult.remaining;

  // Extract numeric constraints
  const mvResult = extractNumericConstraint(remaining, [
    'mana value',
    'mana',
    'mv',
    'cost',
    'costs',
  ]);
  slots.mv = mvResult.constraint;
  remaining = mvResult.remaining;

  const powerResult = extractNumericConstraint(remaining, ['power', 'pow']);
  slots.power = powerResult.constraint;
  remaining = powerResult.remaining;

  const toughResult = extractNumericConstraint(remaining, ['toughness', 'tou']);
  slots.toughness = toughResult.constraint;
  remaining = toughResult.remaining;

  // Extract year constraints
  const yearResult = extractYearConstraint(remaining);
  slots.year = yearResult.constraint;
  remaining = yearResult.remaining;

  // Extract price constraints
  const priceResult = extractPriceConstraint(remaining);
  slots.price = priceResult.constraint;
  remaining = priceResult.remaining;

  // Extract rarity
  const rarityResult = extractRarity(remaining);
  slots.rarity = rarityResult.rarity;
  remaining = rarityResult.remaining;

  // Extract negations
  const negationResult = extractNegations(remaining);
  slots.types.exclude = negationResult.excludedTypes;
  slots.excludeText = negationResult.excludedText;
  remaining = negationResult.remaining;

  // Clean up residual
  slots.residual = remaining
    .replace(/\s+/g, ' ')
    .replace(/\b(that|which|with|the|a|an|cards?|is|are|for|in|my)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return slots;
}

function extractFormat(query: string): {
  format: string | null;
  remaining: string;
} {
  for (const [alias, format] of Object.entries(FORMAT_MAP)) {
    const patterns = [
      new RegExp(`\\b${alias}\\s+(?:legal|format|deck)\\b`, 'gi'),
      new RegExp(`\\b(?:legal|format)\\s+(?:in\\s+)?${alias}\\b`, 'gi'),
      new RegExp(`\\bfor\\s+${alias}\\b`, 'gi'),
      new RegExp(`\\b${alias}\\b`, 'gi'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(query)) {
        return {
          format,
          remaining: query.replace(pattern, '').trim(),
        };
      }
    }
  }

  return { format: null, remaining: query };
}

function extractColors(query: string): {
  colors: ExtractedSlots['colors'];
  remaining: string;
} {
  let remaining = query;

  // Check for commander identity context
  const identityContext =
    /\b(commander deck|fits into|goes into|can go in|usable in|color identity|ci)\b/i.test(
      query,
    );
  const exactContext = /\b(exactly|only|just|strictly|mono)\b/i.test(query);

  // Check for mono-color
  const monoMatch = remaining.match(
    /\bmono[-\s]?(white|blue|black|red|green|w|u|b|r|g)\b/i,
  );
  if (monoMatch) {
    const colorCode =
      COLOR_MAP[monoMatch[1].toLowerCase()] || monoMatch[1].toLowerCase();
    remaining = remaining.replace(monoMatch[0], '').trim();
    return {
      colors: {
        values: [colorCode],
        mode: 'identity',
        operator: 'exact',
      },
      remaining,
    };
  }

  // Check for multicolor names (guilds/shards/wedges)
  for (const [name, codes] of Object.entries(MULTICOLOR_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(remaining)) {
      remaining = remaining.replace(regex, '').trim();
      return {
        colors: {
          values: codes.split(''),
          mode: identityContext ? 'identity' : 'color',
          operator: identityContext
            ? exactContext
              ? 'exact'
              : 'within'
            : 'exact',
        },
        remaining,
      };
    }
  }

  // Check for "X or Y" color patterns
  const orMatch = remaining.match(
    /\b(white|blue|black|red|green)\s+or\s+(white|blue|black|red|green)\b/i,
  );
  if (orMatch) {
    const color1 = COLOR_MAP[orMatch[1].toLowerCase()];
    const color2 = COLOR_MAP[orMatch[2].toLowerCase()];
    remaining = remaining.replace(orMatch[0], '').trim();
    return {
      colors: {
        values: [color1, color2],
        mode: identityContext ? 'identity' : 'color',
        operator: 'or',
      },
      remaining,
    };
  }

  // Check for "X and Y" color patterns
  const andMatch = remaining.match(
    /\b(white|blue|black|red|green)\s+and\s+(white|blue|black|red|green)\b/i,
  );
  if (andMatch) {
    const color1 = COLOR_MAP[andMatch[1].toLowerCase()];
    const color2 = COLOR_MAP[andMatch[2].toLowerCase()];
    remaining = remaining.replace(andMatch[0], '').trim();
    return {
      colors: {
        values: [color1, color2],
        mode: identityContext ? 'identity' : 'color',
        operator: identityContext ? (exactContext ? 'exact' : 'within') : 'and',
      },
      remaining,
    };
  }

  // Check for single color mentions
  const colorMatches = remaining.match(
    /\b(white|blue|black|red|green|colorless)\b/gi,
  );
  if (colorMatches && colorMatches.length > 0) {
    const uniqueColors = [
      ...new Set(
        colorMatches.map((c) => {
          const lower = c.toLowerCase();
          return lower === 'colorless' ? 'c' : COLOR_MAP[lower];
        }),
      ),
    ];

    for (const match of colorMatches) {
      remaining = remaining
        .replace(new RegExp(`\\b${match}\\b`, 'i'), '')
        .trim();
    }

    return {
      colors: {
        values: uniqueColors,
        mode: identityContext ? 'identity' : 'color',
        operator:
          uniqueColors.length > 1 ? 'and' : exactContext ? 'exact' : 'include',
      },
      remaining,
    };
  }

  return { colors: null, remaining };
}

/**
 * Extracts type constraints from query, detecting OR patterns
 *
 * Scryfall Syntax Reference:
 * - t:X t:Y = card must have BOTH types (AND) - e.g., t:artifact t:creature
 * - (t:X or t:Y) = card must have EITHER type (OR) - e.g., (t:artifact or t:land)
 * - -t:X = card must NOT have type - e.g., -t:creature
 */
function extractTypes(query: string): {
  types: { include: string[]; includeOr: string[]; exclude: string[] };
  remaining: string;
} {
  let remaining = query;
  const include: string[] = [];
  const includeOr: string[] = [];
  const exclude: string[] = [];

  // FIRST: Check for "X or Y" type patterns (e.g., "artifacts or lands", "instant or sorcery")
  // This must be done BEFORE extracting individual types to prevent duplication
  const orPatterns = [
    // Match "artifacts or lands", "instant or sorcery", etc.
    /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\s+or\s+(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\b/gi,
    // Match "creatures, artifacts, or lands" (comma-separated with or)
    /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?(?:\s*,\s*(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?)+\s*,?\s*or\s+(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\b/gi,
  ];

  for (const orPattern of orPatterns) {
    const orMatches = remaining.matchAll(orPattern);
    for (const orMatch of orMatches) {
      // Extract all types mentioned in the OR pattern
      const typesInMatch = orMatch[0].match(
        /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)/gi,
      );
      if (typesInMatch) {
        for (const t of typesInMatch) {
          const normalized = t.toLowerCase();
          if (!includeOr.includes(normalized)) {
            includeOr.push(normalized);
          }
        }
      }
      remaining = remaining.replace(orMatch[0], '').trim();
    }
  }

  // Handle "spells" as instant OR sorcery (not AND)
  if (
    /\bspells?\b/i.test(remaining) &&
    !includeOr.includes('instant') &&
    !includeOr.includes('sorcery')
  ) {
    includeOr.push('instant', 'sorcery');
    remaining = remaining.replace(/\bspells?\b/gi, '').trim();
  }

  // Check for negated types
  for (const type of CARD_TYPES) {
    const negPattern = new RegExp(
      `\\b(?:not|isn't|isnt|aren't|arent|no|non[-\\s]?)${type}s?\\b`,
      'gi',
    );
    if (negPattern.test(remaining)) {
      exclude.push(type);
      remaining = remaining.replace(negPattern, '').trim();
    }
  }

  // Check for remaining individual types (these should be AND'd together)
  // Skip types that are already in includeOr to prevent duplication
  for (const type of CARD_TYPES) {
    if (includeOr.includes(type)) continue; // Already handled in OR pattern

    const pattern = new RegExp(`\\b${type}s?\\b`, 'gi');
    if (pattern.test(remaining) && !exclude.includes(type)) {
      include.push(type);
      remaining = remaining.replace(pattern, '').trim();
    }
  }

  return { types: { include, includeOr, exclude }, remaining };
}

function extractSubtypes(query: string): {
  subtypes: string[];
  remaining: string;
} {
  let remaining = query;
  const subtypes: string[] = [];

  for (const subtype of COMMON_SUBTYPES) {
    const pattern = new RegExp(`\\b${subtype}\\b`, 'gi');
    if (pattern.test(remaining)) {
      // Normalize plural to singular
      const singular = subtype.replace(/s$/, '').replace(/ves$/, 'f');
      if (!subtypes.includes(singular)) {
        subtypes.push(singular);
      }
      remaining = remaining.replace(pattern, '').trim();
    }
  }

  return { subtypes, remaining };
}

function extractNumericConstraint(
  query: string,
  aliases: string[],
): { constraint: { op: string; value: number } | null; remaining: string } {
  let remaining = query;
  const aliasGroup = aliases
    .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const patterns: Array<{
    regex: RegExp;
    extractOp: (match: RegExpMatchArray) => string;
  }> = [
    {
      regex: new RegExp(`(>=?|<=?|=)(\\d+)\\s*(?:${aliasGroup})?\\b`, 'i'),
      extractOp: (m) => m[1],
    },
    {
      regex: new RegExp(`(?:${aliasGroup})\\s*(>=?|<=?|=)\\s*(\\d+)\\b`, 'i'),
      extractOp: (m) => m[1],
    },
    {
      regex: new RegExp(`(?:${aliasGroup})\\s*(\\d+)\\s+or\\s+less\\b`, 'i'),
      extractOp: () => '<=',
    },
    {
      regex: new RegExp(`(?:${aliasGroup})\\s*(\\d+)\\s+or\\s+more\\b`, 'i'),
      extractOp: () => '>=',
    },
    {
      regex: new RegExp(`(\\d+)\\s*(?:${aliasGroup})\\b`, 'i'),
      extractOp: () => '=',
    },
    {
      regex: new RegExp(`(?:${aliasGroup})\\s*(\\d+)\\b`, 'i'),
      extractOp: () => '=',
    },
  ];

  for (const { regex, extractOp } of patterns) {
    const match = remaining.match(regex);
    if (match) {
      const numMatch = match[0].match(/\d+/);
      if (numMatch) {
        const value = Number(numMatch[0]);
        if (!Number.isNaN(value)) {
          remaining = remaining.replace(match[0], '').trim();
          return { constraint: { op: extractOp(match), value }, remaining };
        }
      }
    }
  }

  return { constraint: null, remaining };
}

function extractYearConstraint(query: string): {
  constraint: { op: string; value: number } | null;
  remaining: string;
} {
  let remaining = query;

  const patterns: Array<{ regex: RegExp; op: string; fixedValue?: number }> = [
    { regex: /\b(?:after|since|post)\s+(\d{4})\b/i, op: '>' },
    { regex: /\b(?:before|pre)\s+(\d{4})\b/i, op: '<' },
    { regex: /\b(?:from|in|released in)\s+(\d{4})\b/i, op: '=' },
    {
      regex: /\b(?:recent|new)\s+cards?\b/i,
      op: '>=',
      fixedValue: new Date().getFullYear() - 2,
    },
    { regex: /\b(?:old|classic)\s+cards?\b/i, op: '<', fixedValue: 2003 },
  ];

  for (const pattern of patterns) {
    const match = remaining.match(pattern.regex);
    if (match) {
      const value =
        pattern.fixedValue !== undefined
          ? pattern.fixedValue
          : Number(match[1]);
      remaining = remaining.replace(match[0], '').trim();
      return { constraint: { op: pattern.op, value }, remaining };
    }
  }

  return { constraint: null, remaining };
}

function extractPriceConstraint(query: string): {
  constraint: { op: string; value: number } | null;
  remaining: string;
} {
  let remaining = query;

  // Already normalized in normalize step: usd<X, usd>X
  const usdMatch = remaining.match(/\busd([<>=]+)(\d+)\b/i);
  if (usdMatch) {
    remaining = remaining.replace(usdMatch[0], '').trim();
    return {
      constraint: { op: usdMatch[1], value: Number(usdMatch[2]) },
      remaining,
    };
  }

  // Handle budget/cheap/expensive
  if (/\b(cheap|budget|affordable|inexpensive)\b/i.test(remaining)) {
    remaining = remaining
      .replace(/\b(cheap|budget|affordable|inexpensive)\b/gi, '')
      .trim();
    return { constraint: { op: '<', value: 5 }, remaining };
  }

  if (/\b(expensive|costly|pricey)\b/i.test(remaining)) {
    remaining = remaining.replace(/\b(expensive|costly|pricey)\b/gi, '').trim();
    return { constraint: { op: '>', value: 20 }, remaining };
  }

  return { constraint: null, remaining };
}

function extractRarity(query: string): {
  rarity: string | null;
  remaining: string;
} {
  let remaining = query;

  for (const [alias, rarity] of Object.entries(RARITY_MAP)) {
    const pattern = new RegExp(`\\b${alias}\\b`, 'gi');
    if (pattern.test(remaining)) {
      remaining = remaining.replace(pattern, '').trim();
      return { rarity, remaining };
    }
  }

  return { rarity: null, remaining };
}

function extractNegations(query: string): {
  excludedTypes: string[];
  excludedText: string[];
  remaining: string;
} {
  let remaining = query;
  const excludedTypes: string[] = [];
  const excludedText: string[] = [];

  // Pattern: "not X", "without X", "no X", "doesn't X"
  const negPatterns = [
    /\b(?:not|without|no|doesn't|does not|isn't|is not)\s+([a-z]+)\b/gi,
  ];

  for (const pattern of negPatterns) {
    let match;
    while ((match = pattern.exec(remaining)) !== null) {
      const term = match[1].toLowerCase();

      // Check if it's a type
      if (
        CARD_TYPES.includes(term) ||
        CARD_TYPES.includes(term.replace(/s$/, ''))
      ) {
        const singularType = term.replace(/s$/, '');
        if (!excludedTypes.includes(singularType)) {
          excludedTypes.push(singularType);
        }
      } else {
        // It's a text exclusion
        excludedText.push(term);
      }

      remaining = remaining.replace(match[0], '').trim();
    }
  }

  return { excludedTypes, excludedText, remaining };
}
