import { KNOWN_OTAGS } from './tags.ts';
import {
  COLOR_MAP,
  MULTICOLOR_MAP,
  CARD_TYPES,
  WORD_NUMBER_MAP,
  COMPANION_RESTRICTIONS,
  SLANG_MAP,
} from './shared-mappings.ts';

export interface ParsedIntent {
  colors: {
    values: string[];
    isIdentity: boolean;
    isExact: boolean;
    isOr: boolean;
  } | null;

  types: string[];
  subtypes: string[];

  cmc: { op: string; value: number } | null;
  power: { op: string; value: number } | null;
  toughness: { op: string; value: number } | null;

  isCommander: boolean;
  format: string | null;
  yearConstraint: { op: string; year: number } | null;
  priceConstraint: { op: string; value: number } | null;

  remainingQuery: string;
  warnings: string[];

  oraclePatterns: string[];
  tagTokens: string[];
  statTotalApprox: number | null;
}

interface NumericConstraint {
  field: string;
  op: string;
  value: number;
}

interface SearchIR {
  monoColor?: string;
  colorConstraint?: {
    values: string[];
    mode: 'color' | 'identity';
    operator: 'or' | 'and' | 'exact' | 'within' | 'include';
  };
  colorCountConstraint?: NumericConstraint;
  types: string[];
  subtypes: string[];
  excludedTypes: string[];
  numeric: NumericConstraint[];
  tags: string[];
  artTags: string[];
  oracle: string[];
  specials: string[];
  warnings: string[];
  remaining: string;
}

/**
 * Keyword Mappings - Use Scryfall's kw: operator for keyword abilities
 * This is more accurate than searching oracle text for keyword names.
 */
const KEYWORD_MAP: Record<string, string> = {
  haste: 'kw:haste',
  flying: 'kw:flying',
  trample: 'kw:trample',
  deathtouch: 'kw:deathtouch',
  lifelink: 'kw:lifelink',
  vigilance: 'kw:vigilance',
  menace: 'kw:menace',
  reach: 'kw:reach',
  'first strike': 'kw:first-strike',
  'double strike': 'kw:double-strike',
  hexproof: 'kw:hexproof',
  indestructible: 'kw:indestructible',
  flash: 'kw:flash',
  defender: 'kw:defender',
  infect: 'kw:infect',
  flashback: 'kw:flashback',
  buyback: 'kw:buyback',
  kicker: 'kw:kicker',
  prowess: 'kw:prowess',
  ward: 'kw:ward',
  shroud: 'kw:shroud',
  fear: 'kw:fear',
  intimidate: 'kw:intimidate',
  skulk: 'kw:skulk',
  shadow: 'kw:shadow',
  horsemanship: 'kw:horsemanship',
  protection: 'kw:protection',
  absorb: 'kw:absorb',
  cascade: 'kw:cascade',
  convoke: 'kw:convoke',
  delve: 'kw:delve',
  dredge: 'kw:dredge',
  emerge: 'kw:emerge',
  evoke: 'kw:evoke',
  exploit: 'kw:exploit',
  extort: 'kw:extort',
  living: 'kw:living-weapon',
  madness: 'kw:madness',
  miracle: 'kw:miracle',
  modular: 'kw:modular',
  morph: 'kw:morph',
  mutate: 'kw:mutate',
  ninjutsu: 'kw:ninjutsu',
  outlast: 'kw:outlast',
  persist: 'kw:persist',
  phasing: 'kw:phasing',
  rampage: 'kw:rampage',
  rebound: 'kw:rebound',
  regenerate: 'kw:regenerate',
  replicate: 'kw:replicate',
  retrace: 'kw:retrace',
  scavenge: 'kw:scavenge',
  storm: 'kw:storm',
  sunburst: 'kw:sunburst',
  suspend: 'kw:suspend',
  totem: 'kw:totem-armor',
  transfigure: 'kw:transfigure',
  transmute: 'kw:transmute',
  undying: 'kw:undying',
  unearth: 'kw:unearth',
  wither: 'kw:wither',
  // New keywords from analytics (Issue #3: "red goad" lost intent)
  goad: 'o:goad',
  goading: 'o:goad',
  provoke: 'kw:provoke',
  myriad: 'kw:myriad',
  encore: 'kw:encore',
  blitz: 'kw:blitz',
  connive: 'kw:connive',
  offspring: 'kw:offspring',
  backup: 'kw:backup',
};

/**
 * Special keyword mappings that don't use kw: operator
 */
const SPECIAL_KEYWORD_MAP: Record<string, string> = {
  unblockable: 'o:"can\'t be blocked"',
  evasion:
    '(kw:flying or kw:menace or kw:skulk or kw:shadow or kw:fear or kw:intimidate or kw:horsemanship)',
  affinity: 'o:"affinity for"',
  annihilator: 'o:"annihilator"',
};

/**
 * "Cards Like X" Mappings - Maps famous cards to functional equivalents
 * Searches for cards that do similar things, not cards that mention the name
 */
const CARDS_LIKE_MAP: Record<string, string> = {
  // Ramp
  cultivate: 'otag:land-ramp o:"search your library" o:"basic land"',
  kodama: 'otag:land-ramp o:"search your library" o:"basic land"',
  'rampant growth': 'otag:land-ramp mv<=2',
  "nature's lore": 'otag:land-ramp mv<=2 o:"forest"',
  farseek: 'otag:land-ramp mv=2',
  'sol ring': 't:artifact mv<=2 o:"add" o:"{C}{C}"',
  'mana crypt': 't:artifact mv=0 o:"add"',
  'arcane signet': 't:artifact mv=2 o:"add" o:"color"',

  // Card draw
  brainstorm: 'o:"draw" o:"cards" o:"put" o:"top"',
  ponder: 'o:"look at the top" o:"shuffle"',
  preordain: 'o:"scry" o:"draw a card" mv<=2',
  rhystic: 'o:"whenever" o:"opponent" o:"pay" o:"draw"',

  // Removal
  'swords to plowshares': 'o:"exile target creature" mv<=2',
  'path to exile': 'o:"exile target creature" mv<=2',
  'wrath of god': 'otag:creature-board-wipe',
  damnation: 'otag:creature-board-wipe',
  'cyclonic rift': 'otag:mass-bounce',

  // Counters
  counterspell: 'otag:hard-counter',
  'mana drain': 'otag:hard-counter',
  'force of will': 'otag:hard-counter o:"without paying"',

  // Aristocrats/Sacrifice
  'blood artist': 'otag:blood-artist-effect',
  'zulaport cutthroat': 'otag:blood-artist-effect',
  'viscera seer': 'otag:free-sacrifice-outlet',

  // Tutors
  'demonic tutor': 'otag:tutor o:"search your library" o:"hand"',
  vampiric: 'otag:tutor o:"search your library" o:"top"',
  'enlightened tutor': 'otag:artifact-tutor or otag:enchantment-tutor',
  'mystical tutor': 'otag:instant-or-sorcery-tutor',
  'worldly tutor': 'otag:creature-tutor',

  // Reanimation
  reanimate: 'otag:reanimation mv<=3',
  'animate dead': 'otag:reanimation t:enchantment',
  exhume: 'otag:reanimation',

  // Value creatures
  'dark confidant': 'o:"beginning of your upkeep" o:"draw" o:"life"',
  bob: 'o:"beginning of your upkeep" o:"draw" o:"life"',

  // Equipment
  'lightning greaves': 't:equipment o:"haste" o:"shroud" or o:"hexproof"',
  'swiftfoot boots': 't:equipment o:"haste" o:"hexproof"',
  skullclamp: 't:equipment o:"draw"',

  // Mana dorks
  'llanowar elves': 'otag:mana-dork mv=1 o:"add {G}"',
  'birds of paradise': 'otag:mana-dork mv=1 o:"add" o:"any color"',

  // Wheels
  'wheel of fortune': 'otag:wheel',
  windfall: 'otag:wheel',

  // Land destruction
  'strip mine': 't:land o:"destroy target land"',
  'ghost quarter': 't:land o:"destroy target" o:"land"',
};

/**
 * Archetype Strategy Mappings
 * Maps common deck strategy terms to appropriate Scryfall syntax
 */
const ARCHETYPE_MAP: Record<string, string> = {
  sacrifice:
    '(otag:sacrifice-outlet or otag:aristocrats or (o:"whenever" (o:"dies" or o:"sacrifice")))',
  spellslinger:
    '(t:instant or t:sorcery or o:"whenever you cast" o:"instant" or o:"whenever you cast" o:"sorcery")',
  tokens: 'otag:token-generator',
  aggro: 't:creature mv<=3 pow>=2',
  voltron:
    '(t:equipment or t:aura or o:"equipped creature" or o:"enchanted creature")',
  aristocrats: 'otag:aristocrats',
  reanimator: 'otag:reanimation',
  control: '(otag:hard-counter or otag:removal or otag:board-wipe)',
  combo:
    '(o:"infinite" or o:"you win the game" or o:"opponents lose the game")',
  midrange: 't:creature mv>=3 mv<=5',
  lifegain: 'otag:lifegain',
  mill: 'otag:mill',
  discard: '(o:"discard" o:"opponent" or otag:discard-outlet)',
  graveyard:
    '(otag:reanimation or otag:graveyard-recursion or o:"from your graveyard")',
  tribal: 'o:"creature type" or o:"of the chosen type"',
  superfriends: 't:planeswalker',
};

// Local logic-specific mappings (stay in this file as they use logic)
const TAG_FIRST_MAP: Array<{
  pattern: RegExp;
  tag: string;
  fallback?: string;
}> = [
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
    tag: 'treasure-generator',
    fallback: 'o:"treasure token"',
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

const ART_TAG_MAP: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\bcows? in (the )?art\b/gi, tag: 'cow' },
  { pattern: /\bdogs? in (the )?art\b/gi, tag: 'dog' },
  { pattern: /\bcats? in (the )?art\b/gi, tag: 'cat' },
  { pattern: /\btrees? in (the )?art\b/gi, tag: 'tree' },
  { pattern: /\bmountains? in (the )?art\b/gi, tag: 'mountain' },
  { pattern: /\bocean in (the )?art\b/gi, tag: 'ocean' },
  { pattern: /\bskulls? in (the )?art\b/gi, tag: 'skull' },
  // Expanded art tags
  { pattern: /\bhooks? in (the )?art\b/gi, tag: 'hook' },
  { pattern: /\baxes? in (the )?art\b/gi, tag: 'axe' },
  { pattern: /\bswords? in (the )?art\b/gi, tag: 'sword' },
  { pattern: /\bshields? in (the )?art\b/gi, tag: 'shield' },
  { pattern: /\barmou?r in (the )?art\b/gi, tag: 'armor' },
  { pattern: /\bhelmets? in (the )?art\b/gi, tag: 'helmet' },
  { pattern: /\bfire in (the )?art\b/gi, tag: 'fire' },
  { pattern: /\bwater in (the )?art\b/gi, tag: 'water' },
  { pattern: /\bdragons? in (the )?art\b/gi, tag: 'dragon' },
  { pattern: /\bangels? in (the )?art\b/gi, tag: 'angel' },
  { pattern: /\bdemons? in (the )?art\b/gi, tag: 'demon' },
  { pattern: /\bhorses? in (the )?art\b/gi, tag: 'horse' },
  { pattern: /\bwolves? in (the )?art\b/gi, tag: 'wolf' },
  { pattern: /\bbirds? in (the )?art\b/gi, tag: 'bird' },
  { pattern: /\bsnakes? in (the )?art\b/gi, tag: 'snake' },
  { pattern: /\bspiders? in (the )?art\b/gi, tag: 'spider' },
  // "Art with X" pattern
  {
    pattern: /\bart (?:with|showing|depicting|featuring) ([\w]+)\b/gi,
    tag: '$1',
  },
];

// "Cheap" can mean low CMC (default) or low price - context determines which

function normalizeQuery(query: string): string {
  let normalized = query
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

  // Apply slang mappings
  for (const [slang, formal] of Object.entries(SLANG_MAP)) {
    const regex = new RegExp(`\\b${slang}\\b`, 'gi');
    if (regex.test(normalized)) {
      normalized = normalized.replace(regex, formal);
    }
  }

  normalized = normalized
    .replace(/\bconverted mana cost\b/gi, 'mv')
    .replace(/\bcmc\b/gi, 'mv')
    .replace(/\bmana value\b/gi, 'mv')
    .replace(/\bcolor identity\b/gi, 'ci')
    .replace(/\bcolour identity\b/gi, 'ci');

  for (const [word, value] of Object.entries(WORD_NUMBER_MAP)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(regex, String(value));
  }

  return normalized.replace(/\s+/g, ' ').trim();
}

function applyTagMappings(query: string, ir: SearchIR): string {
  let remaining = query;

  for (const { pattern, tag, fallback } of TAG_FIRST_MAP) {
    if (pattern.test(remaining)) {
      remaining = remaining.replace(pattern, '').trim();
      if (KNOWN_OTAGS.has(tag)) {
        ir.tags.push(`otag:${tag}`);
      } else if (fallback) {
        ir.oracle.push(fallback);
        ir.warnings.push(
          `Oracle tag unavailable for ${tag}; using oracle fallback.`,
        );
      }
    }
  }

  for (const { pattern, tag } of ART_TAG_MAP) {
    if (pattern.test(remaining)) {
      remaining = remaining.replace(pattern, '').trim();
      ir.artTags.push(`atag:${tag}`);
    }
  }

  return remaining;
}

/**
 * Parse keyword abilities and map them to Scryfall's kw: operator
 * This is more accurate than searching oracle text.
 */
function parseKeywords(query: string, ir: SearchIR): string {
  let remaining = query;
  const matchedKeywords = new Set<string>();

  // Handle "creatures with X" or "X creatures" patterns
  for (const [keyword, scryfallSyntax] of Object.entries(KEYWORD_MAP)) {
    // Match patterns like "creatures with flying", "flying creatures", "has flying"
    const patterns = [
      new RegExp(`\\b(?:with|has|have)\\s+${keyword}\\b`, 'gi'),
      new RegExp(`\\b${keyword}\\s+(?:creature|creatures)\\b`, 'gi'),
      new RegExp(
        `\\b(?:creature|creatures)\\s+(?:with|that have)\\s+${keyword}\\b`,
        'gi',
      ),
    ];

    for (const pattern of patterns) {
      const match = remaining.match(pattern);
      if (match) {
        if (!matchedKeywords.has(keyword)) {
          ir.specials.push(scryfallSyntax);
          matchedKeywords.add(keyword);
        }
        remaining = remaining.replace(pattern, '').trim();
      }
    }
  }

  // Second pass: match standalone keywords that weren't caught above
  // This handles cases like "artifact creatures with deathtouch" where
  // the keyword might remain after type extraction
  for (const [keyword, scryfallSyntax] of Object.entries(KEYWORD_MAP)) {
    if (matchedKeywords.has(keyword)) continue; // Already matched

    const match = remaining.match(new RegExp(`\\b${keyword}\\b`, 'gi'));
    if (match) {
      ir.specials.push(scryfallSyntax);
      matchedKeywords.add(keyword);
      remaining = remaining
        .replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '')
        .trim();
    }
  }

  for (const [keyword, scryfallSyntax] of Object.entries(SPECIAL_KEYWORD_MAP)) {
    const patterns = [
      new RegExp(`\\b(?:with|has|have)\\s+${keyword}\\b`, 'gi'),
      new RegExp(`\\b${keyword}\\s+(?:creature|creatures)\\b`, 'gi'),
      new RegExp(`\\b${keyword}\\b`, 'gi'),
    ];

    for (const pattern of patterns) {
      if (pattern.test(remaining)) {
        ir.specials.push(scryfallSyntax);
        remaining = remaining.replace(pattern, '').trim();
        break;
      }
    }
  }

  return remaining;
}

/**
 * Parse "X enablers" patterns - cards that give other cards abilities
 * e.g., "haste enablers" → otag:gives-haste
 */
function parseEnablers(query: string, ir: SearchIR): string {
  let remaining = query;

  const enablerKeywords = [
    'haste',
    'flying',
    'trample',
    'deathtouch',
    'lifelink',
    'menace',
    'hexproof',
    'indestructible',
    'vigilance',
    'first-strike',
    'double-strike',
    'reach',
    'protection',
  ];

  for (const keyword of enablerKeywords) {
    const pattern = new RegExp(
      `\\b${keyword.replace('-', '[ -]?')}\\s+enablers?\\b`,
      'gi',
    );
    if (pattern.test(remaining)) {
      const tagName = `gives-${keyword}`;
      if (KNOWN_OTAGS.has(tagName)) {
        ir.tags.push(`otag:${tagName}`);
      } else {
        // Fallback to oracle text search
        ir.oracle.push(`o:"${keyword.replace('-', ' ')}"`);
      }
      remaining = remaining.replace(pattern, '').trim();
    }
  }

  // Also handle "grants X" pattern
  for (const keyword of enablerKeywords) {
    const pattern = new RegExp(
      `\\b(?:grants?|gives?)\\s+${keyword.replace('-', '[ -]?')}\\b`,
      'gi',
    );
    if (pattern.test(remaining)) {
      const tagName = `gives-${keyword}`;
      if (KNOWN_OTAGS.has(tagName)) {
        ir.tags.push(`otag:${tagName}`);
      } else {
        ir.oracle.push(`o:"${keyword.replace('-', ' ')}"`);
      }
      remaining = remaining.replace(pattern, '').trim();
    }
  }

  return remaining;
}

/**
 * Parse token creation patterns
 * "makes pirate tokens" → o:"create" o:"pirate" o:"token"
 */
function parseTokenCreation(query: string, ir: SearchIR): string {
  let remaining = query;

  // Match patterns like "makes X tokens", "creates X tokens", "X token generators"
  const tokenPatterns = [
    /\b(?:make|makes|create|creates|generating?|produce|produces)\s+(\w+)\s+tokens?\b/gi,
    /\b(\w+)\s+token\s+(?:generator|creator|maker)s?\b/gi,
    /\b(?:cards? that )?(?:make|create)s?\s+(\w+)\s+tokens?\b/gi,
  ];

  for (const pattern of tokenPatterns) {
    let match;
    while ((match = pattern.exec(remaining)) !== null) {
      const tokenType = match[1].toLowerCase();

      // Skip generic words
      if (
        ['a', 'an', 'the', 'some', 'any', 'multiple', 'many'].includes(
          tokenType,
        )
      ) {
        continue;
      }

      // Build oracle text search for token creation
      ir.oracle.push(`o:"create" o:"${tokenType}" o:"token"`);
      remaining = remaining.replace(match[0], '').trim();
    }
    // Reset regex state
    pattern.lastIndex = 0;
  }

  return remaining;
}

/**
 * Parse "cards like X" patterns - Functional similarity search
 * "cards like Cultivate" → search for ramp cards, not cards that mention "Cultivate"
 */
function parseCardsLike(query: string, ir: SearchIR): string {
  let remaining = query;

  // Match patterns like "cards like X", "similar to X", "X alternatives"
  const cardsLikePatterns = [
    /\b(?:cards?|spells?|creatures?)\s+(?:like|similar to)\s+([^,]+?)(?:\s+(?:in|for|that)|$)/gi,
    /\b(?:like|similar to)\s+([^,]+?)(?:\s+(?:in|for|that)|$)/gi,
    /\b([^,]+?)\s+(?:alternatives?|replacements?|substitutes?)\b/gi,
  ];

  for (const pattern of cardsLikePatterns) {
    let match;
    while ((match = pattern.exec(remaining)) !== null) {
      const cardName = match[1]
        .trim()
        .toLowerCase()
        .replace(/^['"]|['"]$/g, '') // Remove quotes
        .replace(/\s+/g, ' '); // Normalize spaces

      // Check if we have a known mapping for this card
      let found = false;
      for (const [knownCard, scryfallSyntax] of Object.entries(
        CARDS_LIKE_MAP,
      )) {
        if (cardName.includes(knownCard) || knownCard.includes(cardName)) {
          ir.specials.push(scryfallSyntax);
          found = true;
          break;
        }
      }

      // If no specific mapping, try to extract the card's function generically
      if (!found) {
        // For unknown cards, we'll let the AI handle it
        // but remove the "cards like" wrapper to help with remaining query
        ir.warnings.push(
          `No specific mapping for "${cardName}"; AI will interpret.`,
        );
      }

      remaining = remaining.replace(match[0], '').trim();
    }
    pattern.lastIndex = 0;
  }

  return remaining;
}

/**
 * Parse archetype/strategy patterns combined with guild names
 * "rakdos sacrifice" → c=br + sacrifice strategy
 *
 * IMPORTANT: Only match archetype keywords when they stand alone as deck themes,
 * not when they're part of a verb phrase like "sacrifice lands" or "sacrifice a creature"
 */
function parseArchetypes(query: string, ir: SearchIR): string {
  let remaining = query;

  // Skip archetype matching for certain patterns that use "sacrifice" as a verb
  const skipSacrificeAsArchetype =
    /\bsacrifice\s+(a\s+)?(creature|land|artifact|enchantment|permanent)/i.test(
      remaining,
    );

  for (const [archetype, scryfallSyntax] of Object.entries(ARCHETYPE_MAP)) {
    // Skip "sacrifice" archetype if it's being used as a verb (e.g., "sacrifice lands")
    if (archetype === 'sacrifice' && skipSacrificeAsArchetype) {
      continue;
    }

    // Only match archetype when it appears as a standalone theme word,
    // not when preceded by common verbs like "to", "can", "let you"
    const standalonPattern = new RegExp(
      `(?<!(?:to|can|let you|that|which|cards that)\\s)\\b${archetype}\\b(?!\\s+(?:a|an|the|your|target|lands?|creatures?|artifacts?))`,
      'gi',
    );

    if (standalonPattern.test(remaining)) {
      ir.specials.push(scryfallSyntax);
      remaining = remaining.replace(standalonPattern, '').trim();
    }
  }

  return remaining;
}

/**
 * Parse exclusion patterns
 * "not a creature", "non-creature", "without creatures" → -t:creature
 */
function parseExclusions(query: string, ir: SearchIR): string {
  let remaining = query;

  const exclusionPatterns = [
    {
      pattern:
        /\b(?:not|non|no|isn't|aren't|without|excluding)\s+(?:a\s+)?(creature|land|artifact|enchantment|instant|sorcery|planeswalker)s?\b/gi,
      extract: 1,
    },
    {
      pattern:
        /\b(?:creature|land|artifact|enchantment|instant|sorcery|planeswalker)s?\s*-?\s*(?:less|free)\b/gi,
      extract: 0,
    },
  ];

  for (const { pattern, extract } of exclusionPatterns) {
    let match;
    while ((match = pattern.exec(remaining)) !== null) {
      let type = extract === 0 ? match[0] : match[1];
      type = type
        .toLowerCase()
        .replace(/s$/, '')
        .replace(/-?(less|free)/, '')
        .trim();

      if (
        [
          'creature',
          'land',
          'artifact',
          'enchantment',
          'instant',
          'sorcery',
          'planeswalker',
        ].includes(type)
      ) {
        if (!ir.excludedTypes.includes(type)) {
          ir.excludedTypes.push(type);
        }
        remaining = remaining.replace(match[0], '').trim();
      }
    }
    pattern.lastIndex = 0;
  }

  return remaining;
}

function parseNumericConstraint(
  query: string,
  field: string,
  aliases: string[],
): { constraint: NumericConstraint | null; remaining: string } {
  let remaining = query;
  const aliasGroup = aliases
    .map((alias) => alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
    .join('|');

  const patterns: Array<{ regex: RegExp; op: string }> = [
    {
      regex: new RegExp(
        `\\b(?:at least|min(?:imum)?|>=?)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`,
        'i',
      ),
      op: '>=',
    },
    {
      regex: new RegExp(`\\b(\\d+)\\s*(?:${aliasGroup})?\\s*\\+\\b`, 'i'),
      op: '>=',
    },
    {
      regex: new RegExp(`\\b(\\d+)\\s*(?:${aliasGroup})\\s+or\\s+more\\b`, 'i'),
      op: '>=',
    },
    {
      regex: new RegExp(`\\b(?:${aliasGroup})\\s*(\\d+)\\s+or\\s+more\\b`, 'i'),
      op: '>=',
    },
    {
      regex: new RegExp(
        `\\b(?:at most|max(?:imum)?|<=?)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`,
        'i',
      ),
      op: '<=',
    },
    {
      regex: new RegExp(`\\b(\\d+)\\s*(?:${aliasGroup})\\s+or\\s+less\\b`, 'i'),
      op: '<=',
    },
    {
      regex: new RegExp(`\\b(?:${aliasGroup})\\s*(\\d+)\\s+or\\s+less\\b`, 'i'),
      op: '<=',
    },
    {
      regex: new RegExp(
        `\\b(?:under|less than|below)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`,
        'i',
      ),
      op: '<',
    },
    {
      regex: new RegExp(
        `\\b(?:over|more than|above)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`,
        'i',
      ),
      op: '>',
    },
    {
      regex: new RegExp(
        `\\b(?:exactly|equals?)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`,
        'i',
      ),
      op: '=',
    },
    { regex: new RegExp(`\\b(\\d+)\\s*(?:${aliasGroup})\\b`, 'i'), op: '=' },
    { regex: new RegExp(`\\b(?:${aliasGroup})\\s*(\\d+)\\b`, 'i'), op: '=' },
  ];

  for (const { regex, op } of patterns) {
    const match = remaining.match(regex);
    if (match) {
      const value = Number(match[1]);
      if (!Number.isNaN(value)) {
        remaining = remaining.replace(match[0], '').trim();
        return { constraint: { field, op, value }, remaining };
      }
    }
  }

  return { constraint: null, remaining };
}

function parseColors(query: string, ir: SearchIR): string {
  let remaining = query;

  // Detect if user explicitly wants COLOR IDENTITY (for commander)
  // vs actual card COLOR (what mana symbols appear on the card)
  const identityIntent =
    /\b(ci|color identity|commander deck|fits into|goes into|can go in|usable in|identity)\b/i.test(
      remaining,
    );
  const exactIntent = /\b(exactly|only|just|strictly|mono)\b/i.test(remaining);

  // MONO-COLOR: "mono red", "mono-blue", "monoblack"
  // This means EXACTLY that color, not more
  const monoMatch = remaining.match(
    /\bmono[-\s]?(white|blue|black|red|green|w|u|b|r|g|colou?r(?:ed)?)\b/i,
  );
  if (monoMatch) {
    const colorInput = monoMatch[1].toLowerCase();
    // "monocolored" means c=1 (exactly one color)
    if (
      colorInput === 'color' ||
      colorInput === 'colored' ||
      colorInput === 'colour' ||
      colorInput === 'coloured'
    ) {
      ir.colorCountConstraint = { field: 'c', op: '=', value: 1 };
    } else {
      const colorCode = COLOR_MAP[colorInput];
      ir.monoColor = colorCode;
    }
    remaining = remaining.replace(monoMatch[0], '').trim();
    return remaining;
  }

  // Check for shorthand like "WUB", "RG", etc. in identity context
  if (identityIntent) {
    const shorthandMatch = remaining.match(/\b([wubrg]{2,5})\b/i);
    if (shorthandMatch) {
      const values = shorthandMatch[1].toLowerCase().split('');
      ir.colorConstraint = {
        values,
        mode: 'identity',
        operator: exactIntent ? 'exact' : 'within',
      };
      remaining = remaining.replace(shorthandMatch[0], '').trim();
      return remaining;
    }
  }

  // Named color pairs (guild names, etc.)
  for (const [name, codes] of Object.entries(MULTICOLOR_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(remaining)) {
      ir.colorConstraint = {
        values: codes.split(''),
        mode: identityIntent ? 'identity' : 'color',
        operator:
          identityIntent &&
          /\b(commander deck|fits into|goes into|can go in|usable in)\b/i.test(
            remaining,
          )
            ? 'within'
            : 'exact',
      };
      remaining = remaining.replace(regex, '').trim();
      return remaining;
    }
  }

  // "X or Y" color pattern - e.g., "red or black creature"
  // This means cards that are red OR black, not both
  // CRITICAL: Use c= for card color (what's on the card), NOT identity
  const orMatch = remaining.match(
    /\b(white|blue|black|red|green)\s+or\s+(white|blue|black|red|green)\b/i,
  );
  if (orMatch) {
    const color1 = COLOR_MAP[orMatch[1].toLowerCase()];
    const color2 = COLOR_MAP[orMatch[2].toLowerCase()];
    ir.colorConstraint = {
      values: [color1, color2],
      // Default to CARD COLOR unless identity explicitly requested
      mode: identityIntent ? 'identity' : 'color',
      operator: 'or',
    };
    remaining = remaining.replace(orMatch[0], '').trim();
    return remaining;
  }

  // "X and Y" - cards that are BOTH colors
  const andMatch = remaining.match(
    /\b(white|blue|black|red|green)\s+and\s+(white|blue|black|red|green)\b/i,
  );
  if (andMatch) {
    const color1 = COLOR_MAP[andMatch[1].toLowerCase()];
    const color2 = COLOR_MAP[andMatch[2].toLowerCase()];
    ir.colorConstraint = {
      values: [color1, color2],
      mode: identityIntent ? 'identity' : 'color',
      operator: identityIntent ? (exactIntent ? 'exact' : 'within') : 'and',
    };
    remaining = remaining.replace(andMatch[0], '').trim();
    return remaining;
  }

  // Hyphenated colors: "black-red", "blue/green"
  const hyphenMatch = remaining.match(
    /\b(white|blue|black|red|green)[-/\s]+(white|blue|black|red|green)\b/i,
  );
  if (hyphenMatch) {
    const color1 = COLOR_MAP[hyphenMatch[1].toLowerCase()];
    const color2 = COLOR_MAP[hyphenMatch[2].toLowerCase()];
    ir.colorConstraint = {
      values: [color1, color2],
      mode: identityIntent ? 'identity' : 'color',
      operator: identityIntent ? (exactIntent ? 'exact' : 'within') : 'and',
    };
    remaining = remaining.replace(hyphenMatch[0], '').trim();
    return remaining;
  }

  // Single or multiple color words
  const colorMatches = remaining.match(/\b(white|blue|black|red|green)\b/gi);
  if (colorMatches && colorMatches.length > 0) {
    const uniqueColors = [
      ...new Set(colorMatches.map((color) => COLOR_MAP[color.toLowerCase()])),
    ];
    ir.colorConstraint = {
      values: uniqueColors,
      // Default to card color, not identity
      mode: identityIntent ? 'identity' : 'color',
      operator:
        uniqueColors.length > 1 && /\bor\b/i.test(remaining)
          ? 'or'
          : identityIntent
            ? exactIntent
              ? 'exact'
              : 'within'
            : 'and',
    };
    for (const match of colorMatches) {
      remaining = remaining
        .replace(new RegExp(`\\b${match}\\b`, 'i'), '')
        .trim();
    }
  }

  return remaining;
}

/**
 * Parses type constraints, detecting OR patterns
 *
 * SCRYFALL SYNTAX REFERENCE:
 * - t:X t:Y = card must have BOTH types (AND) - e.g., t:artifact t:creature → artifact creatures
 * - (t:X or t:Y) = card must have EITHER type (OR) - e.g., (t:artifact or t:land)
 * - -t:X = card must NOT have type
 *
 * CRITICAL: A card CANNOT be both artifact AND instant (or sorcery). These are mutually exclusive.
 * So "artifacts or instants that add mana" should be (t:artifact or t:instant), NOT t:artifact t:instant.
 *
 * "artifacts or lands" → (t:artifact or t:land)
 * "artifact creatures" → t:artifact t:creature (valid combination)
 * "spells" → (t:instant or t:sorcery)
 */
function parseTypes(query: string, ir: SearchIR): string {
  let remaining = query;
  const typesHandledAsOr = new Set<string>();

  // FIRST: Check for "X or Y" type patterns (e.g., "artifacts or lands")
  // These MUST become (t:X or t:Y) because a card can't be both
  const orPatterns = [
    // Match "artifacts or lands", "instant or sorcery", etc.
    /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\s+or\s+(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\b/gi,
    // Match extended OR chains: "artifacts, lands, or enchantments"
    /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?(?:\s*,\s*(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?)*\s*,?\s*or\s+(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\b/gi,
  ];

  for (const orPattern of orPatterns) {
    const orMatches = [...remaining.matchAll(orPattern)];
    for (const orMatch of orMatches) {
      const typesInMatch = orMatch[0].match(
        /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)/gi,
      );
      if (typesInMatch && typesInMatch.length >= 2) {
        // Store as OR group in specials (will be rendered as (t:X or t:Y))
        const uniqueTypes = [
          ...new Set(typesInMatch.map((t) => t.toLowerCase())),
        ];
        const orParts = uniqueTypes.map((t) => `t:${t}`);
        ir.specials.push(`(${orParts.join(' or ')})`);
        // Mark these types as handled so we don't add them again as AND
        uniqueTypes.forEach((t) => typesHandledAsOr.add(t));
        remaining = remaining.replace(orMatch[0], '').trim();
      }
    }
  }

  // Handle "spells" as instant OR sorcery
  if (/\bspells?\b/i.test(remaining)) {
    ir.specials.push('(t:instant or t:sorcery)');
    typesHandledAsOr.add('instant');
    typesHandledAsOr.add('sorcery');
    remaining = remaining.replace(/\bspells?\b/gi, '').trim();
  }

  // Now extract remaining individual types (AND logic)
  // SKIP types that were already handled in OR patterns to prevent duplication
  for (const type of CARD_TYPES) {
    // Skip if already in an OR group
    if (typesHandledAsOr.has(type)) continue;

    const typePattern = new RegExp(`\\b${type}s?\\b`, 'i');
    if (typePattern.test(remaining)) {
      ir.types.push(type);
      remaining = remaining.replace(typePattern, '').trim();
    }
  }

  return remaining;
}

function parseCompanions(query: string, ir: SearchIR): string {
  let remaining = query;
  const companionMatch = remaining.match(/\bcompanion\b/i);
  if (!companionMatch) return remaining;

  for (const [name, restrictions] of Object.entries(COMPANION_RESTRICTIONS)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(remaining)) {
      ir.specials.push(...restrictions);
      remaining = remaining.replace(regex, '').trim();
      remaining = remaining.replace(/\bcompanion\b/gi, '').trim();
      return remaining;
    }
  }

  ir.specials.push('is:companion');
  remaining = remaining.replace(/\bcompanion\b/gi, '').trim();
  return remaining;
}

function parseSpecialPatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  const commanderFormatPattern =
    /\bcommander(?:-|\s)?(deck|format|legal)\b|\blegal in commander\b/gi;
  if (commanderFormatPattern.test(remaining)) {
    ir.specials.push('f:commander');
    remaining = remaining.replace(commanderFormatPattern, '').trim();
  }

  if (
    /\bcommander\b|\bis:commander\b|\bas commander\b|\bcommanders\b/i.test(
      remaining,
    )
  ) {
    ir.specials.push('is:commander');
    remaining = remaining.replace(/\b(?:as )?commander\b/gi, '').trim();
  }

  if (
    /\bmore than (?:one|1) color\b|\bmulticolor\b|\b(at least|two or more) colors?\b/i.test(
      remaining,
    )
  ) {
    ir.colorCountConstraint = { field: 'id', op: '>', value: 1 };
    remaining = remaining
      .replace(
        /\bmore than (?:one|1) color\b|\bmulticolor\b|\b(at least|two or more) colors?\b/gi,
        '',
      )
      .trim();
  }

  if (
    /\bblue\b/i.test(remaining) &&
    /\b(one of which|including|with)\b/i.test(remaining)
  ) {
    ir.specials.push('ci>=u');
    remaining = remaining
      .replace(/\b(one of which|including|with)\b/gi, '')
      .trim();
    remaining = remaining.replace(/\bblue\b/gi, '').trim();
  }

  return remaining;
}

function parseEquipmentPatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  const equipMatch = remaining.match(
    /\bequip(?:s)?(?: cost)?(?: for)?\s*(\d+)\b/i,
  );
  if (equipMatch) {
    const equipCost = Number(equipMatch[1]);
    if (!Number.isNaN(equipCost)) {
      const isAtMost = /\bor less\b/i.test(remaining);
      if (isAtMost) {
        ir.oracle.push(`o:/equip \\{[0-${equipCost}]\\}/`);
      } else {
        ir.oracle.push(`o:"equip {${equipCost}}"`);
      }
      remaining = remaining.replace(equipMatch[0], '').trim();
    }
  }

  return remaining;
}

function parseOraclePatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  if (/\bdraw cards?\b/i.test(remaining)) {
    if (KNOWN_OTAGS.has('draw')) {
      ir.tags.push('otag:draw');
    } else {
      ir.oracle.push('o:/draw (a|two|three|\\d+) cards?/');
    }
    remaining = remaining.replace(/\bdraw cards?\b/gi, '').trim();
  }

  if (/\bsacrifice\b/i.test(remaining) && /\blands?\b/i.test(remaining)) {
    ir.oracle.push('o:sacrifice');
    ir.oracle.push('o:land');
    ir.excludedTypes.push('land');
    ir.types = ir.types.filter((type) => type !== 'land');
    remaining = remaining.replace(/\bsacrifice\b/gi, '').trim();
    remaining = remaining.replace(/\blands?\b/gi, '').trim();
  }

  if (
    /\bactivated ability\b/i.test(remaining) &&
    /\bdoes not cost mana\b/i.test(remaining)
  ) {
    ir.oracle.push('o:":"');
    ir.oracle.push('-o:/\\{[WUBRG0-9XSC]\\}:/');
    remaining = remaining.replace(/\bactivated ability\b/gi, '').trim();
    remaining = remaining.replace(/\bdoes not cost mana\b/gi, '').trim();
  }

  return remaining;
}

function parseManaProduction(query: string, ir: SearchIR): string {
  let remaining = query;

  const producesTwoMana =
    /\b(produce|produces|produced|add|adds)\s*(?:2|two)\s+mana\b/i.test(
      remaining,
    );
  if (producesTwoMana) {
    ir.oracle.push('(o:"add {c}{c}" or o:/add \\{[WUBRGC]\\}\\{[WUBRGC]\\}/)');
    remaining = remaining
      .replace(
        /\b(produce|produces|produced|add|adds)\s*(?:2|two)\s+mana\b/gi,
        '',
      )
      .trim();
  }

  // Check if land is part of an OR group in specials (e.g., "(t:artifact or t:land)")
  const landInOrGroup = ir.specials.some(
    (s) => s.includes('t:land') && s.includes(' or '),
  );

  const hasLandIntent =
    ir.types.includes('land') || /\blands?\b/i.test(query) || landInOrGroup;

  // Only exclude lands if user explicitly wants artifacts (not lands) producing mana
  // Do NOT exclude lands if they're part of an OR group with artifacts
  if (
    producesTwoMana &&
    !hasLandIntent &&
    !landInOrGroup &&
    !ir.excludedTypes.includes('land')
  ) {
    ir.excludedTypes.push('land');
  }

  return remaining;
}

/**
 * Renders the intermediate representation to a Scryfall query string
 *
 * CRITICAL: Prevents duplicate type constraints by:
 * 1. Collecting all types mentioned in OR groups (specials)
 * 2. Only adding AND types (ir.types) if they're not already in an OR group
 * 3. Deduplicating the final output
 */
function renderIR(ir: SearchIR): string {
  const parts: string[] = [];

  if (ir.monoColor) {
    parts.push(`c=${ir.monoColor}`);
    parts.push(`ci=${ir.monoColor}`);
  } else if (ir.colorConstraint) {
    const { values, mode, operator } = ir.colorConstraint;
    const prefix = mode === 'identity' ? 'ci' : 'c';
    const joined = values.join('');

    if (operator === 'or' && values.length > 1) {
      const orParts = values.map((color) => `${prefix}=${color}`);
      parts.push(`(${orParts.join(' or ')})`);
    } else if (operator === 'within') {
      parts.push(`ci<=${joined}`);
    } else if (operator === 'exact') {
      parts.push(`${prefix}=${joined}`);
    } else if (operator === 'include') {
      parts.push(`${prefix}>=${joined}`);
    } else {
      parts.push(`${prefix}=${joined}`);
    }
  }

  // Collect types that are in OR groups to avoid duplication
  const typesInOrGroups = new Set<string>();
  for (const special of ir.specials) {
    // Match (t:artifact or t:land) patterns
    const typeMatches = special.match(/t:(\w+)/g);
    if (typeMatches) {
      typeMatches.forEach((m) => typesInOrGroups.add(m.slice(2).toLowerCase()));
    }
  }

  // Only add AND types that aren't already in OR groups
  for (const type of ir.types) {
    if (!typesInOrGroups.has(type.toLowerCase())) {
      parts.push(`t:${type}`);
    }
  }

  for (const subtype of ir.subtypes) {
    parts.push(`t:${subtype}`);
  }

  // Don't add excluded types that are in OR groups - that would be contradictory
  // e.g., "(t:artifact or t:land)" should not be followed by "-t:land"
  for (const type of ir.excludedTypes) {
    if (!typesInOrGroups.has(type.toLowerCase())) {
      parts.push(`-t:${type}`);
    }
  }

  for (const numeric of ir.numeric) {
    parts.push(`${numeric.field}${numeric.op}${numeric.value}`);
  }

  if (ir.colorCountConstraint) {
    parts.push(
      `${ir.colorCountConstraint.field}${ir.colorCountConstraint.op}${ir.colorCountConstraint.value}`,
    );
  }

  parts.push(...ir.tags);
  parts.push(...ir.artTags);
  parts.push(...ir.specials);
  parts.push(...ir.oracle);

  // Deduplicate parts while preserving order
  const seen = new Set<string>();
  const uniqueParts = parts.filter((part) => {
    const normalized = part.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return uniqueParts.join(' ').replace(/\s+/g, ' ').trim();
}

function buildIR(query: string): SearchIR {
  let remaining = normalizeQuery(query);

  const ir: SearchIR = {
    types: [],
    subtypes: [],
    excludedTypes: [],
    numeric: [],
    tags: [],
    artTags: [],
    oracle: [],
    specials: [],
    warnings: [],
    remaining: '',
  };

  // Apply all parsing functions in order
  remaining = parseCardsLike(remaining, ir); // Parse "cards like X" FIRST
  remaining = applyTagMappings(remaining, ir);
  remaining = parseTokenCreation(remaining, ir); // Parse token creation BEFORE type parsing
  remaining = parseEnablers(remaining, ir); // Parse enablers early
  remaining = parseKeywords(remaining, ir); // Parse keywords for kw: operator
  remaining = parseArchetypes(remaining, ir); // Parse archetype strategies
  remaining = parseExclusions(remaining, ir); // Parse exclusions before types
  remaining = parseCompanions(remaining, ir);
  remaining = parseSpecialPatterns(remaining, ir);
  remaining = parseOraclePatterns(remaining, ir);
  remaining = parseColors(remaining, ir);
  remaining = parseTypes(remaining, ir);

  if (
    ir.tags.some((tag) => tag === 'otag:manarock' || tag === 'otag:mana-rock')
  ) {
    ir.excludedTypes.push('land');
  }

  remaining = parseManaProduction(remaining, ir);
  remaining = parseEquipmentPatterns(remaining, ir);

  // Handle "cheap" - defaults to low CMC unless price context is present
  // "cheap" alone = mv<=3 (low mana cost)
  // "cheap under $5" or "budget $10" = price filter
  if (/\bcheap\b/i.test(remaining) && !/\$\d+/.test(remaining)) {
    // No dollar sign context, treat as low CMC
    ir.numeric.push({ field: 'mv', op: '<=', value: 3 });
    remaining = remaining.replace(/\bcheap\b/gi, '').trim();
  } else if (/\bbudget\b/i.test(remaining) && !/\$\d+/.test(remaining)) {
    // "budget" without price = low CMC
    ir.numeric.push({ field: 'mv', op: '<=', value: 3 });
    remaining = remaining.replace(/\bbudget\b/gi, '').trim();
  } else if (/\binexpensive\b/i.test(remaining) && !/\$\d+/.test(remaining)) {
    ir.numeric.push({ field: 'mv', op: '<=', value: 3 });
    remaining = remaining.replace(/\binexpensive\b/gi, '').trim();
  }

  // Handle price constraints with $ sign
  const priceMatch = remaining.match(
    /\b(?:under|below|less than)\s*\$?(\d+(?:\.\d+)?)\b/i,
  );
  if (priceMatch) {
    ir.numeric.push({ field: 'usd', op: '<', value: Number(priceMatch[1]) });
    remaining = remaining.replace(priceMatch[0], '').trim();
  }

  const costMatch = remaining.match(
    /\bcosts?\s*(\d+)\s*(?:mana|mv)?\s*(or\s+less|or\s+more)?\b/i,
  );
  if (costMatch) {
    const value = Number(costMatch[1]);
    const modifier = costMatch[2]?.toLowerCase();
    const op = modifier?.includes('less')
      ? '<='
      : modifier?.includes('more')
        ? '>='
        : '=';
    if (!Number.isNaN(value)) {
      ir.numeric.push({ field: 'mv', op, value });
      remaining = remaining.replace(costMatch[0], '').trim();
    }
  }

  const mv = parseNumericConstraint(remaining, 'mv', [
    'mv',
    'mana',
    'mana value',
    'costs',
  ]);
  if (mv.constraint) {
    ir.numeric.push(mv.constraint);
    remaining = mv.remaining;
  }

  const pow = parseNumericConstraint(remaining, 'pow', ['power']);
  if (pow.constraint) {
    ir.numeric.push(pow.constraint);
    remaining = pow.remaining;
  }

  const tou = parseNumericConstraint(remaining, 'tou', ['toughness']);
  if (tou.constraint) {
    ir.numeric.push(tou.constraint);
    remaining = tou.remaining;
  }

  const year = parseNumericConstraint(remaining, 'year', [
    'year',
    'released',
    'printed',
  ]);
  if (year.constraint) {
    ir.numeric.push(year.constraint);
    remaining = year.remaining;
  }

  const yearMatch = remaining.match(/\b(after|since)\s+(\d{4})\b/i);
  if (yearMatch) {
    const op = yearMatch[1].toLowerCase() === 'since' ? '>=' : '>';
    ir.numeric.push({ field: 'year', op, value: Number(yearMatch[2]) });
    remaining = remaining.replace(yearMatch[0], '').trim();
  }

  if (
    /\breleased\b/i.test(remaining) &&
    /\bafter\s+(\d{4})\b/i.test(remaining)
  ) {
    const match = remaining.match(/\bafter\s+(\d{4})\b/i);
    if (match) {
      ir.numeric.push({ field: 'year', op: '>', value: Number(match[1]) });
      remaining = remaining.replace(match[0], '').trim();
    }
  }

  remaining = remaining
    .replace(/\s+/g, ' ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .replace(/\b(that|which|with|the|a|an|cards?|released|printed)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  ir.remaining = remaining;

  return ir;
}

export function buildDeterministicIntent(query: string): {
  intent: ParsedIntent;
  deterministicQuery: string;
} {
  const ir = buildIR(query);
  const deterministicQuery = renderIR(ir);

  const intent: ParsedIntent = {
    colors: null,
    types: ir.types,
    subtypes: ir.subtypes,
    cmc: null,
    power: null,
    toughness: null,
    isCommander: ir.specials.includes('is:commander'),
    format: null,
    yearConstraint: null,
    priceConstraint: null,
    remainingQuery: ir.remaining,
    warnings: ir.warnings,
    oraclePatterns: ir.oracle,
    tagTokens: [...ir.tags, ...ir.artTags],
    statTotalApprox: null,
  };

  if (ir.monoColor) {
    intent.colors = {
      values: [ir.monoColor],
      isIdentity: true,
      isExact: true,
      isOr: false,
    };
  } else if (ir.colorConstraint) {
    intent.colors = {
      values: ir.colorConstraint.values,
      isIdentity: ir.colorConstraint.mode === 'identity',
      isExact: ['and', 'exact'].includes(ir.colorConstraint.operator),
      isOr: ir.colorConstraint.operator === 'or',
    };
  }

  for (const constraint of ir.numeric) {
    if (constraint.field === 'mv') {
      intent.cmc = { op: constraint.op, value: constraint.value };
    }
    if (constraint.field === 'pow') {
      intent.power = { op: constraint.op, value: constraint.value };
    }
    if (constraint.field === 'tou') {
      intent.toughness = { op: constraint.op, value: constraint.value };
    }
    if (constraint.field === 'year') {
      intent.yearConstraint = { op: constraint.op, year: constraint.value };
    }
  }

  return { intent, deterministicQuery };
}
