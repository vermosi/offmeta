/**
 * Client-side fallback query builder.
 * Used when the edge function is unavailable to produce a
 * best-effort Scryfall query from natural language input.
 * @module lib/search/fallback
 */

/** Common MTG slang → Scryfall syntax fragments */
const SLANG_MAP: Record<string, string> = {
  'mana rocks': 't:artifact o:"add" o:"{"',
  'mana rock': 't:artifact o:"add" o:"{"',
  'mana dorks': 't:creature o:"add" o:"{"',
  'mana dork': 't:creature o:"add" o:"{"',
  'board wipes': 'otag:boardwipe',
  'board wipe': 'otag:boardwipe',
  'boardwipe': 'otag:boardwipe',
  'boardwipes': 'otag:boardwipe',
  counterspells: 'otag:counter',
  counterspell: 'otag:counter',
  'card draw': 'otag:draw',
  ramp: 'otag:ramp',
  removal: 'otag:removal',
  tutor: 'otag:tutor',
  tutors: 'otag:tutor',
  lifegain: 'otag:lifegain',
  mill: 'otag:mill',
  blink: 'otag:blink',
  flicker: 'otag:flicker',
  reanimation: 'otag:reanimate',
  reanimate: 'otag:reanimate',
  'treasure tokens': 'o:"create" o:"treasure"',
  'treasure token': 'o:"create" o:"treasure"',
  treasure: 'o:"treasure"',
};

const COLOR_WORDS: Record<string, string> = {
  white: 'c:w',
  blue: 'c:u',
  black: 'c:b',
  red: 'c:r',
  green: 'c:g',
  colorless: 'c:c',
};

const TYPE_WORDS: Record<string, string> = {
  creature: 't:creature',
  creatures: 't:creature',
  artifact: 't:artifact',
  artifacts: 't:artifact',
  enchantment: 't:enchantment',
  enchantments: 't:enchantment',
  instant: 't:instant',
  instants: 't:instant',
  sorcery: 't:sorcery',
  sorceries: 't:sorcery',
  planeswalker: 't:planeswalker',
  planeswalkers: 't:planeswalker',
  land: 't:land',
  lands: 't:land',
};

const COST_WORDS: Record<string, string> = {
  cheap: 'mv<=3',
  low: 'mv<=2',
  expensive: 'mv>=6',
  high: 'mv>=5',
};

/**
 * Build a best-effort Scryfall query from a natural language string.
 * Intended as a client-side fallback when the AI edge function is unreachable.
 */
export function buildClientFallbackQuery(naturalQuery: string): string {
  const lower = naturalQuery.toLowerCase().trim();
  const parts: string[] = [];
  let residual = lower;

  // 1. Check full slang phrases first (longest match)
  const sortedSlang = Object.entries(SLANG_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [phrase, syntax] of sortedSlang) {
    if (residual.includes(phrase)) {
      parts.push(syntax);
      residual = residual.replace(phrase, ' ').trim();
    }
  }

  // 2. Extract colors
  for (const [word, syntax] of Object.entries(COLOR_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 3. Extract types
  for (const [word, syntax] of Object.entries(TYPE_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 4. Extract cost modifiers
  for (const [word, syntax] of Object.entries(COST_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 5. Clean up filler words from residual
  residual = residual
    .replace(
      /\b(that|the|with|for|and|or|a|an|in|of|to|make|produce|spells?)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();

  // 6. If there's meaningful residual, add as oracle text search
  if (residual.length > 2) {
    parts.push(`o:"${residual}"`);
  }

  // If nothing was extracted, return original as a name search
  if (parts.length === 0) {
    return naturalQuery.trim();
  }

  return parts.join(' ');
}
