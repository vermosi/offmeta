import type { FilterState } from '@/types/filters';

export const VALID_SEARCH_KEYS = new Set([
  'c', 'color', 'id', 'identity', 'ci', 'o', 'oracle', 't', 'type',
  'm', 'mana', 'cmc', 'mv', 'manavalue',
  'power', 'pow', 'toughness', 'tou', 'loyalty', 'loy',
  'e', 'set', 's', 'b', 'block', 'r', 'rarity',
  'f', 'format', 'legal', 'banned', 'restricted',
  'is', 'not', 'has',
  'usd', 'eur', 'tix',
  'a', 'artist', 'ft', 'flavor',
  'wm', 'watermark', 'border', 'frame', 'game',
  'year', 'date', 'new', 'prints', 'lang', 'in',
  'st', 'cube', 'order', 'direction', 'unique', 'prefer', 'include',
  'produces', 'devotion', 'name',
  'otag', 'oracletag', 'function',
  'art', 'atag', 'arttag'
]);

export const KNOWN_OTAGS = new Set([
  'ramp', 'mana-rock', 'mana-dork', 'mana-doubler', 'mana-sink', 'land-ramp', 'ritual',
  'draw', 'card-draw', 'cantrip', 'loot', 'looting', 'wheel', 'impulse-draw', 'scry',
  'tutor', 'land-tutor', 'creature-tutor', 'artifact-tutor', 'enchantment-tutor', 'instant-or-sorcery-tutor',
  'removal', 'spot-removal', 'creature-removal', 'artifact-removal', 'enchantment-removal', 'planeswalker-removal',
  'board-wipe', 'mass-removal', 'graveyard-hate', 'graveyard-recursion', 'reanimation',
  'token-generator', 'treasure-generator', 'food-generator', 'clue-generator', 'blood-generator',
  'lifegain', 'soul-warden-ability', 'burn', 'fog', 'combat-trick', 'pump',
  'blink', 'flicker', 'bounce', 'mass-bounce', 'copy', 'copy-permanent', 'copy-spell', 'clone',
  'stax', 'hatebear', 'pillowfort', 'theft', 'mind-control', 'threaten',
  'sacrifice-outlet', 'free-sacrifice-outlet', 'aristocrats', 'death-trigger', 'grave-pact-effect', 'blood-artist-effect',
  'synergy-sacrifice', 'synergy-lifegain', 'synergy-discard', 'synergy-equipment', 'synergy-proliferate',
  'extra-turn', 'extra-combat', 'polymorph', 'egg', 'activate-from-graveyard', 'cast-from-graveyard',
  'untapper', 'tapper', 'gives-flash', 'gives-hexproof', 'gives-haste', 'gives-flying', 'gives-trample',
  'gives-vigilance', 'gives-deathtouch', 'gives-lifelink', 'gives-first-strike', 'gives-double-strike',
  'gives-menace', 'gives-reach', 'gives-protection', 'gives-indestructible',
  'landfall', 'extra-land', 'enchantress', 'discard-outlet', 'mulch', 'lord', 'anthem',
  'self-mill', 'mill', 'graveyard-order-matters'
]);

export function normalizeOrGroups(query: string): string {
  const tokens: string[] = [];
  let current = '';
  let depth = 0;
  let inQuote = false;
  let inRegex = false;

  for (const char of query) {
    if (char === '"') {
      inQuote = !inQuote;
    }
    if (!inQuote && char === '/' && current.at(-1) !== '\\') {
      inRegex = !inRegex;
    }
    if (!inQuote && !inRegex && char === ' ') {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }
  if (current) tokens.push(current);

  const output: string[] = [];
  let orGroup: string[] = [];
  let inOrGroup = false;

  const flushGroup = () => {
    if (inOrGroup && orGroup.length > 0) {
      output.push(`(${orGroup.join(' ')})`);
    }
    orGroup = [];
    inOrGroup = false;
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const openCount = (token.match(/\(/g) || []).length;
    const closeCount = (token.match(/\)/g) || []).length;
    const depthBefore = depth;
    depth += openCount - closeCount;

    if (depthBefore === 0 && token === 'OR') {
      if (!inOrGroup) {
        const previous = output.pop();
        if (previous) {
          orGroup.push(previous);
        }
        inOrGroup = true;
      }
      orGroup.push(token);
      continue;
    }

    if (inOrGroup && depthBefore === 0) {
      orGroup.push(token);
      const nextToken = tokens[i + 1];
      if (!nextToken || nextToken !== 'OR') {
        flushGroup();
      }
      continue;
    }

    output.push(token);
  }

  if (inOrGroup) {
    flushGroup();
  }

  return output.join(' ');
}

export function validateScryfallQuery(query: string): { valid: boolean; sanitized: string; issues: string[] } {
  const issues: string[] = [];
  let sanitized = query.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  const normalizedOr = normalizeOrGroups(sanitized);
  if (normalizedOr !== sanitized) {
    sanitized = normalizedOr;
    issues.push('Normalized OR groups with parentheses');
  }

  if (/\be:(\d{4})\b/i.test(sanitized)) {
    sanitized = sanitized.replace(/\be:(\d{4})\b/gi, 'year=$1');
    issues.push('Replaced invalid year set syntax with year=YYYY');
  }

  if (/\b(pow|power)\s*\+\s*(tou|toughness)\b/i.test(sanitized)) {
    sanitized = sanitized.replace(/\b(pow|power)\s*\+\s*(tou|toughness)\s*[<>=]+?\s*\d+\b/gi, '').trim();
    issues.push('Removed unsupported power+toughness math');
  }

  const keyPattern = /\b([a-zA-Z]+)[:=<>]/g;
  const unknownKeys: string[] = [];
  let keyMatch;
  while ((keyMatch = keyPattern.exec(sanitized)) !== null) {
    const key = keyMatch[1].toLowerCase();
    if (!VALID_SEARCH_KEYS.has(key)) {
      unknownKeys.push(key);
    }
  }
  if (unknownKeys.length > 0) {
    issues.push(`Unknown search key(s): ${unknownKeys.join(', ')}`);
    for (const key of unknownKeys) {
      sanitized = sanitized.replace(new RegExp(`\\b${key}[:=<>][^\\s]*`, 'gi'), '').trim();
    }
  }

  const otagPattern = /\botag:([a-z0-9-]+)\b/gi;
  const unknownTags: string[] = [];
  let tagMatch;
  while ((tagMatch = otagPattern.exec(sanitized)) !== null) {
    const tag = tagMatch[1].toLowerCase();
    if (!KNOWN_OTAGS.has(tag)) {
      unknownTags.push(tag);
    }
  }
  if (unknownTags.length > 0) {
    issues.push(`Unknown oracle tag(s): ${unknownTags.join(', ')}`);
    for (const tag of unknownTags) {
      sanitized = sanitized.replace(new RegExp(`\\botag:${tag}\\b`, 'gi'), '').trim();
    }
  }

  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return { valid: issues.length === 0, sanitized, issues };
}

export function buildFilterQuery(filters?: FilterState | null): string {
  if (!filters) return '';
  const parts: string[] = [];

  if (filters.colors.length > 0) {
    const colorTokens = filters.colors.map(color => color === 'C' ? 'c=c' : `c:${color.toLowerCase()}`);
    parts.push(`(${colorTokens.join(' OR ')})`);
  }

  if (filters.types.length > 0) {
    const typeTokens = filters.types.map(type => `t:${type.toLowerCase()}`);
    parts.push(`(${typeTokens.join(' OR ')})`);
  }

  const [minCmc, maxCmc] = filters.cmcRange;
  if (minCmc > 0) {
    parts.push(`mv>=${minCmc}`);
  }
  if (maxCmc < 16) {
    parts.push(`mv<=${maxCmc}`);
  }

  return parts.join(' ').trim();
}
