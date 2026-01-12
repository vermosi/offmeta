import { KNOWN_OTAGS } from './tags.ts';

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

const COLOR_MAP: Record<string, string> = {
  white: 'w', w: 'w',
  blue: 'u', u: 'u',
  black: 'b', b: 'b',
  red: 'r', r: 'r',
  green: 'g', g: 'g',
  colorless: 'c', c: 'c',
};

const MULTICOLOR_MAP: Record<string, string> = {
  azorius: 'wu', dimir: 'ub', rakdos: 'br', gruul: 'rg', selesnya: 'gw',
  orzhov: 'wb', izzet: 'ur', golgari: 'bg', boros: 'rw', simic: 'gu',
  bant: 'gwu', esper: 'wub', grixis: 'ubr', jund: 'brg', naya: 'rgw',
  abzan: 'wbg', jeskai: 'urw', sultai: 'bgu', mardu: 'rwb', temur: 'gur',
  'yore-tiller': 'wubr', 'glint-eye': 'ubrg', 'dune-brood': 'brgw', 'ink-treader': 'rgwu', 'witch-maw': 'gwub',
  'sans-white': 'ubrg', 'sans-blue': 'brgw', 'sans-black': 'rgwu', 'sans-red': 'gwub', 'sans-green': 'wubr',
};

const CARD_TYPES = ['creature', 'artifact', 'enchantment', 'instant', 'sorcery', 'land', 'planeswalker', 'battle', 'kindred', 'equipment'];

const WORD_NUMBER_MAP: Record<string, number> = {
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

const COMPANION_RESTRICTIONS: Record<string, string[]> = {
  jegantha: [
    '-mana:{W}{W}',
    '-mana:{U}{U}',
    '-mana:{B}{B}',
    '-mana:{R}{R}',
    '-mana:{G}{G}'
  ],
};

const TAG_FIRST_MAP: Array<{ pattern: RegExp; tag: string; fallback?: string }> = [
  { pattern: /\bmana sinks?\b/gi, tag: 'mana-sink', fallback: 'o:"{X}"' },
  { pattern: /\bmana rocks?\b/gi, tag: 'manarock', fallback: 't:artifact o:"add"' },
  { pattern: /\bmanarocks?\b/gi, tag: 'manarock', fallback: 't:artifact o:"add"' },
  { pattern: /\bgives? flash\b/gi, tag: 'gives-flash', fallback: 'o:"flash"' },
  { pattern: /\bself[ -]?mill\b/gi, tag: 'self-mill', fallback: 'o:"mill" o:"you"' },
  { pattern: /\bgraveyard order matters\b/gi, tag: 'graveyard-order-matters', fallback: 'o:"graveyard" o:"order"' },
  { pattern: /\bgraveyard order\b/gi, tag: 'graveyard-order-matters', fallback: 'o:"graveyard" o:"order"' },
  { pattern: /\bsoul sisters?\b/gi, tag: 'soul-warden-ability', fallback: 'o:"gain 1 life" o:"creature enters"' },
  { pattern: /\bshares? a name with a set\b/gi, tag: 'shares-name-with-set' },
];

const ART_TAG_MAP: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /\bcows? in (the )?art\b/gi, tag: 'cow' },
];

function normalizeQuery(query: string): string {
  let normalized = query
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();

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
        ir.warnings.push(`Oracle tag unavailable for ${tag}; using oracle fallback.`);
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

function parseNumericConstraint(query: string, field: string, aliases: string[]): { constraint: NumericConstraint | null; remaining: string } {
  let remaining = query;
  const aliasGroup = aliases.map(alias => alias.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');

  const patterns: Array<{ regex: RegExp; op: string }> = [
    { regex: new RegExp(`\\b(?:at least|min(?:imum)?|>=?)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`, 'i'), op: '>=' },
    { regex: new RegExp(`\\b(\\d+)\\s*(?:${aliasGroup})?\\s*\\+\\b`, 'i'), op: '>=' },
    { regex: new RegExp(`\\b(\\d+)\\s*(?:${aliasGroup})\\s+or\\s+more\\b`, 'i'), op: '>=' },
    { regex: new RegExp(`\\b(?:${aliasGroup})\\s*(\\d+)\\s+or\\s+more\\b`, 'i'), op: '>=' },
    { regex: new RegExp(`\\b(?:at most|max(?:imum)?|<=?)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`, 'i'), op: '<=' },
    { regex: new RegExp(`\\b(\\d+)\\s*(?:${aliasGroup})\\s+or\\s+less\\b`, 'i'), op: '<=' },
    { regex: new RegExp(`\\b(?:${aliasGroup})\\s*(\\d+)\\s+or\\s+less\\b`, 'i'), op: '<=' },
    { regex: new RegExp(`\\b(?:under|less than|below)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`, 'i'), op: '<' },
    { regex: new RegExp(`\\b(?:over|more than|above)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`, 'i'), op: '>' },
    { regex: new RegExp(`\\b(?:exactly|equals?)\\s*(\\d+)\\s*(?:${aliasGroup})\\b`, 'i'), op: '=' },
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

  const identityIntent = /\b(ci|color identity|commander deck|fits into|goes into|can go in|usable in)\b/i.test(remaining);
  const exactIntent = /\b(exactly|only|just|strictly)\b/i.test(remaining);

  const monoMatch = remaining.match(/\bmono[-\s]?(white|blue|black|red|green|w|u|b|r|g)\b/i);
  if (monoMatch) {
    const colorCode = COLOR_MAP[monoMatch[1].toLowerCase()];
    ir.monoColor = colorCode;
    remaining = remaining.replace(monoMatch[0], '').trim();
    return remaining;
  }

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

  for (const [name, codes] of Object.entries(MULTICOLOR_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(remaining)) {
      ir.colorConstraint = {
        values: codes.split(''),
        mode: identityIntent ? 'identity' : 'color',
        operator: identityIntent && /\b(commander deck|fits into|goes into|can go in|usable in)\b/i.test(remaining) ? 'within' : 'exact',
      };
      remaining = remaining.replace(regex, '').trim();
      return remaining;
    }
  }

  const orMatch = remaining.match(/\b(white|blue|black|red|green)\s+or\s+(white|blue|black|red|green)\b/i);
  if (orMatch) {
    const color1 = COLOR_MAP[orMatch[1].toLowerCase()];
    const color2 = COLOR_MAP[orMatch[2].toLowerCase()];
    ir.colorConstraint = {
      values: [color1, color2],
      mode: identityIntent ? 'identity' : 'color',
      operator: 'or',
    };
    remaining = remaining.replace(orMatch[0], '').trim();
    return remaining;
  }

  const andMatch = remaining.match(/\b(white|blue|black|red|green)\s+and\s+(white|blue|black|red|green)\b/i);
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

  const hyphenMatch = remaining.match(/\b(white|blue|black|red|green)[-/\s]+(white|blue|black|red|green)\b/i);
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

  const colorMatches = remaining.match(/\b(white|blue|black|red|green)\b/gi);
  if (colorMatches && colorMatches.length > 0) {
    const uniqueColors = [...new Set(colorMatches.map(color => COLOR_MAP[color.toLowerCase()]))];
    ir.colorConstraint = {
      values: uniqueColors,
      mode: identityIntent ? 'identity' : 'color',
      operator: uniqueColors.length > 1 && /\bor\b/i.test(remaining) ? 'or' : (identityIntent ? (exactIntent ? 'exact' : 'within') : 'and'),
    };
    for (const match of colorMatches) {
      remaining = remaining.replace(new RegExp(`\\b${match}\\b`, 'i'), '').trim();
    }
  }

  return remaining;
}

function parseTypes(query: string, ir: SearchIR): string {
  let remaining = query;
  for (const type of CARD_TYPES) {
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

  const commanderFormatPattern = /\bcommander(?:-|\s)?(deck|format|legal)\b|\blegal in commander\b/gi;
  if (commanderFormatPattern.test(remaining)) {
    ir.specials.push('f:commander');
    remaining = remaining.replace(commanderFormatPattern, '').trim();
  }

  if (/\bcommander\b|\bis:commander\b|\bas commander\b|\bcommanders\b/i.test(remaining)) {
    ir.specials.push('is:commander');
    remaining = remaining.replace(/\b(?:as )?commander\b/gi, '').trim();
  }

  if (/\bmore than (?:one|1) color\b|\bmulticolor\b|\b(at least|two or more) colors?\b/i.test(remaining)) {
    ir.colorCountConstraint = { field: 'id', op: '>', value: 1 };
    remaining = remaining.replace(/\bmore than (?:one|1) color\b|\bmulticolor\b|\b(at least|two or more) colors?\b/gi, '').trim();
  }

  if (/\bblue\b/i.test(remaining) && /\b(one of which|including|with)\b/i.test(remaining)) {
    ir.specials.push('ci>=u');
    remaining = remaining.replace(/\b(one of which|including|with)\b/gi, '').trim();
    remaining = remaining.replace(/\bblue\b/gi, '').trim();
  }

  return remaining;
}

function parseEquipmentPatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  const equipMatch = remaining.match(/\bequip(?:s)?(?: cost)?(?: for)?\s*(\d+)\b/i);
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
    ir.types = ir.types.filter(type => type !== 'land');
    remaining = remaining.replace(/\bsacrifice\b/gi, '').trim();
    remaining = remaining.replace(/\blands?\b/gi, '').trim();
  }

  if (/\bactivated ability\b/i.test(remaining) && /\bdoes not cost mana\b/i.test(remaining)) {
    ir.oracle.push('o:":"');
    ir.oracle.push('-o:/\\{[WUBRG0-9XSC]\\}:/');
    remaining = remaining.replace(/\bactivated ability\b/gi, '').trim();
    remaining = remaining.replace(/\bdoes not cost mana\b/gi, '').trim();
  }

  return remaining;
}

function parseManaProduction(query: string, ir: SearchIR): string {
  let remaining = query;

  const producesTwoMana = /\b(produce|produces|produced|add|adds)\s*(?:2|two)\s+mana\b/i.test(remaining);
  if (producesTwoMana) {
    ir.oracle.push('(o:"add {c}{c}" or o:/add \\{[WUBRGC]\\}\\{[WUBRGC]\\}/)');
    remaining = remaining.replace(/\b(produce|produces|produced|add|adds)\s*(?:2|two)\s+mana\b/gi, '').trim();
  }

  const isArtifactIntent = ir.types.includes('artifact') || /\bmana rock\b/i.test(query) || /\bartifact\b/i.test(query) || /\bmanarock\b/i.test(query);
  const hasLandIntent = ir.types.includes('land') || /\blands?\b/i.test(query);
  if (producesTwoMana && !hasLandIntent && !ir.excludedTypes.includes('land')) {
    ir.excludedTypes.push('land');
  } else if (isArtifactIntent && producesTwoMana && !ir.excludedTypes.includes('land')) {
    ir.excludedTypes.push('land');
  }

  return remaining;
}

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
      const orParts = values.map(color => `${prefix}=${color}`);
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

  for (const type of ir.types) {
    parts.push(`t:${type}`);
  }
  for (const subtype of ir.subtypes) {
    parts.push(`t:${subtype}`);
  }
  for (const type of ir.excludedTypes) {
    parts.push(`-t:${type}`);
  }

  for (const numeric of ir.numeric) {
    parts.push(`${numeric.field}${numeric.op}${numeric.value}`);
  }

  if (ir.colorCountConstraint) {
    parts.push(`${ir.colorCountConstraint.field}${ir.colorCountConstraint.op}${ir.colorCountConstraint.value}`);
  }

  parts.push(...ir.tags);
  parts.push(...ir.artTags);
  parts.push(...ir.specials);
  parts.push(...ir.oracle);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
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

  remaining = applyTagMappings(remaining, ir);
  remaining = parseCompanions(remaining, ir);
  remaining = parseSpecialPatterns(remaining, ir);
  remaining = parseOraclePatterns(remaining, ir);
  remaining = parseColors(remaining, ir);
  remaining = parseTypes(remaining, ir);

  if (ir.tags.some(tag => tag === 'otag:manarock' || tag === 'otag:mana-rock')) {
    ir.excludedTypes.push('land');
  }

  remaining = parseManaProduction(remaining, ir);
  remaining = parseEquipmentPatterns(remaining, ir);

  const costMatch = remaining.match(/\bcosts?\s*(\d+)\s*(?:mana|mv)?\s*(or\s+less|or\s+more)?\b/i);
  if (costMatch) {
    const value = Number(costMatch[1]);
    const modifier = costMatch[2]?.toLowerCase();
    const op = modifier?.includes('less') ? '<=' : modifier?.includes('more') ? '>=' : '=';
    if (!Number.isNaN(value)) {
      ir.numeric.push({ field: 'mv', op, value });
      remaining = remaining.replace(costMatch[0], '').trim();
    }
  }

  const mv = parseNumericConstraint(remaining, 'mv', ['mv', 'mana', 'mana value', 'costs']);
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

  const year = parseNumericConstraint(remaining, 'year', ['year', 'released', 'printed']);
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

  if (/\breleased\b/i.test(remaining) && /\bafter\s+(\d{4})\b/i.test(remaining)) {
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

export function buildDeterministicIntent(query: string): { intent: ParsedIntent; deterministicQuery: string } {
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
