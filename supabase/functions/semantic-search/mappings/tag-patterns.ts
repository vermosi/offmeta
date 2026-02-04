/**
 * Tag-first pattern mappings for common MTG concepts.
 * Uses otag: oracle tags when available, with oracle text fallbacks.
 * @module mappings/tag-patterns
 */

export interface TagPattern {
  pattern: RegExp;
  tag: string;
  fallback?: string;
}

/**
 * Patterns that should be matched to oracle tags first, with oracle text fallbacks.
 * Order matters - more specific patterns should come before generic ones.
 */
export const TAG_FIRST_MAP: TagPattern[] = [
  { pattern: /\bmana sinks?\b/gi, tag: 'mana-sink', fallback: 'o:"{X}"' },
  {
    pattern: /\bmana rocks?\b/gi,
    tag: 'manarock',
    fallback: 't:artifact o:"add"',
  },
  {
    pattern: /\bmanarocks?\b/gi,
    tag: 'manarock',
    fallback: 't:artifact o:"add"',
  },
  {
    pattern: /\bmana dorks?\b/gi,
    tag: 'mana-dork',
    fallback: 't:creature o:"add"',
  },
  {
    pattern: /\bboard[ -]?wipes?\b/gi,
    tag: 'board-wipe',
    fallback: 'o:"destroy all"',
  },
  { pattern: /\bwraths?\b/gi, tag: 'board-wipe', fallback: 'o:"destroy all"' },
  { pattern: /\bcantrips?\b/gi, tag: 'cantrip', fallback: 'o:"draw a card"' },
  {
    pattern: /\btutors?\b/gi,
    tag: 'tutor',
    fallback: 'o:"search your library"',
  },
  { pattern: /\bremoval\b/gi, tag: 'removal', fallback: 'o:"destroy"' },
  { pattern: /\bcard draw\b/gi, tag: 'card-draw', fallback: 'o:"draw"' },
  { pattern: /\bgives? flash\b/gi, tag: 'gives-flash', fallback: 'o:"flash"' },
  {
    pattern: /\bgives? hexproof\b/gi,
    tag: 'gives-hexproof',
    fallback: 'o:"hexproof"',
  },
  {
    pattern: /\bhexproof providers?\b/gi,
    tag: 'gives-hexproof',
    fallback: 'o:"hexproof"',
  },
  { pattern: /\bgives? haste\b/gi, tag: 'gives-haste', fallback: 'o:"haste"' },
  {
    pattern: /\bgives? indestructible\b/gi,
    tag: 'gives-indestructible',
    fallback: 'o:"indestructible"',
  },
  {
    pattern: /\bself[ -]?mill\b/gi,
    tag: 'self-mill',
    fallback: 'o:"mill" o:"you"',
  },
  {
    pattern: /\bgraveyard order matters\b/gi,
    tag: 'graveyard-order-matters',
    fallback: 'o:"graveyard" o:"order"',
  },
  {
    pattern: /\bgraveyard order\b/gi,
    tag: 'graveyard-order-matters',
    fallback: 'o:"graveyard" o:"order"',
  },
  {
    pattern: /\bcares? about graveyard order\b/gi,
    tag: 'graveyard-order-matters',
    fallback: 'o:"graveyard" o:"order"',
  },
  {
    pattern: /\bsoul sisters?\b/gi,
    tag: 'soul-warden-ability',
    fallback: 'o:"gain 1 life" o:"creature enters"',
  },
  { pattern: /\bshares? a name with a set\b/gi, tag: 'shares-name-with-set' },
  { pattern: /\buntap(?:per)?s?\b/gi, tag: 'untapper', fallback: 'o:"untap"' },
  {
    pattern: /\bedict(?:s)?\b/gi,
    tag: 'creature-removal',
    fallback: 'o:"sacrifice a creature"',
  },
  {
    pattern: /\bfog(?:s)?\b/gi,
    tag: 'fog',
    fallback: 'o:"prevent all combat damage"',
  },
  { pattern: /\blifegain\b/gi, tag: 'lifegain', fallback: 'o:"gain" o:"life"' },
  { pattern: /\blandfall\b/gi, tag: 'landfall' },
  {
    pattern: /\breanimation\b/gi,
    tag: 'reanimation',
    fallback: 'o:"from your graveyard to the battlefield"',
  },
  {
    pattern: /\bstax\b/gi,
    tag: 'stax',
    fallback: 'o:"opponent" (o:"can\'t" or o:"doesn\'t")',
  },
  {
    pattern: /\bhatebears?\b/gi,
    tag: 'hatebear',
    fallback: 't:creature o:"can\'t"',
  },
  {
    pattern: /\bpillowfort\b/gi,
    tag: 'pillowfort',
    fallback: 'o:"can\'t attack you"',
  },
  {
    pattern: /\baristocrats?\b/gi,
    tag: 'aristocrats',
    fallback: 'o:"whenever" (o:"dies" or o:"sacrifice")',
  },
  { pattern: /\bwheels?\b/gi, tag: 'wheel', fallback: 'o:"discard" o:"draw"' },
  {
    pattern: /\bimpulse draw\b/gi,
    tag: 'impulse-draw',
    fallback: 'o:"exile" o:"until end of turn" o:"play"',
  },
  {
    pattern: /\btreasure generators?\b/gi,
    // NOTE: otag:treasure-generator is NOT a valid Scryfall tag
    tag: '',
    fallback: 'o:"create" o:"Treasure"',
  },
  {
    pattern: /\bclone(?:s)?\b/gi,
    tag: 'clone',
    fallback: 'o:"copy of" o:"creature"',
  },
  {
    pattern: /\bblink(?:s|ing)?\b/gi,
    tag: 'blink',
    fallback: 'o:"exile" o:"return" o:"battlefield"',
  },
  {
    pattern: /\bflicker(?:s|ing)?\b/gi,
    tag: 'flicker',
    fallback: 'o:"exile" o:"return" o:"battlefield"',
  },
  {
    pattern: /\bextra turns?\b/gi,
    tag: 'extra-turn',
    fallback: 'o:"extra turn"',
  },
  {
    pattern: /\bextra combat(?:s)?\b/gi,
    tag: 'extra-combat',
    fallback: 'o:"additional combat"',
  },
  {
    pattern: /\bcost reducers?\b/gi,
    tag: 'cost-reducer',
    fallback: 'o:"cost" o:"less"',
  },
  {
    pattern: /\bcounters? matter\b/gi,
    tag: 'counters-matter',
    fallback: 'o:"counter" o:"on"',
  },
  // Counterspell patterns - must use hard-counter tag
  {
    pattern: /\bcounterspells?\b/gi,
    tag: 'hard-counter',
    fallback: 'o:"counter target spell"',
  },
  {
    pattern: /\bcounter ?magics?\b/gi,
    tag: 'hard-counter',
    fallback: 'o:"counter target spell"',
  },
  // ETB doubler patterns (Issue #4: Zero results on "double ETB effects")
  {
    pattern: /\betb doubl(?:ers?|ing)\b/gi,
    tag: 'etb-doubler',
    fallback:
      '(o:"triggers an additional time" or o:"one or more triggered abilities" o:"trigger")',
  },
  {
    pattern: /\bdoubles? etb(?:s)?\b/gi,
    tag: 'etb-doubler',
    fallback:
      '(o:"triggers an additional time" or o:"one or more triggered abilities" o:"trigger")',
  },
  {
    pattern: /\bpanharmonicon(?:-?like)?\s*(?:effect|card)?s?\b/gi,
    tag: 'etb-doubler',
    fallback:
      '(o:"triggers an additional time" or o:"one or more triggered abilities" o:"trigger")',
  },
  {
    pattern: /\btrigger(?:s)? (?:twice|2x|double|additional)\b/gi,
    tag: 'etb-doubler',
    fallback:
      '(o:"triggers an additional time" or o:"one or more triggered abilities")',
  },
  {
    pattern: /\bdeath trigger doubl(?:ers?|ing)\b/gi,
    tag: 'death-trigger-doubler',
    fallback: '(o:"triggers an additional time" o:"die")',
  },
  {
    pattern: /\bltb doubl(?:ers?|ing)\b/gi,
    tag: 'ltb-doubler',
    fallback: '(o:"triggers an additional time" o:"leaves")',
  },
  // Goad-related patterns
  {
    pattern: /\bgoad(?:ing|ed)?\s+(?:creatures?|all|effects?)?\b/gi,
    tag: 'goad',
    fallback: 'o:goad',
  },
  {
    pattern: /\bforce(?:s|d)?\s+(?:to\s+)?attack\b/gi,
    tag: 'goad',
    fallback: '(o:goad or o:"must attack")',
  },
];
