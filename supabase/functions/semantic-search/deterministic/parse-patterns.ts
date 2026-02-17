/**
 * Deterministic Translation – Pattern Parsers
 * Handles targeting, oracle text, mana production,
 * equipment, special patterns, and companions.
 * @module deterministic/parse-patterns
 */

import {
  COMPANION_RESTRICTIONS,
} from '../shared-mappings.ts';
import { KNOWN_OTAGS } from '../tags.ts';
import type { SearchIR } from './types.ts';

/**
 * Parse "targeting" patterns - cards that affect/destroy/exile/counter a type
 * CRITICAL: These patterns must be parsed BEFORE parseTypes() to prevent
 * the type word from being incorrectly added as t:[type]
 */
export function parseTargetingPatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  const removalTags: Record<string, string> = {
    artifact: 'otag:artifact-removal',
    enchantment: 'otag:enchantment-removal',
    creature: 'otag:creature-removal',
    planeswalker: 'otag:planeswalker-removal',
    land: 'o:"destroy" o:"land"',
    permanent: 'otag:removal',
  };

  const targetingPatterns = [
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*destroy\s+(artifact|enchantment|creature|planeswalker|land|permanent)s?\b/gi,
      extract: 1,
      effect: 'destroy',
    },
    {
      pattern:
        /\b(artifact|enchantment|creature|planeswalker|land|permanent)\s*destruction\b/gi,
      extract: 1,
      effect: 'destroy',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*exile\s+(artifact|enchantment|creature|planeswalker|land|permanent)s?\b/gi,
      extract: 1,
      effect: 'exile',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*remove\s+(artifact|enchantment|creature|planeswalker|land|permanent)s?\b/gi,
      extract: 1,
      effect: 'remove',
    },
    {
      pattern:
        /\b(artifact|enchantment|creature|planeswalker|land|permanent)\s*removal\b/gi,
      extract: 1,
      effect: 'remove',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*counter\s+(artifact|enchantment|creature|planeswalker|land|permanent)(?:\s*spell)?s?\b/gi,
      extract: 1,
      effect: 'counter',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*kill\s+(creature)s?\b/gi,
      extract: 1,
      effect: 'kill',
    },
    {
      pattern:
        /\b(?:spells?|cards?|things?)?\s*(?:that|which|to)?\s*deal\s+damage\s+to\s+(artifact|enchantment|creature|planeswalker|permanent)s?\b/gi,
      extract: 1,
      effect: 'damage',
    },
  ];

  for (const { pattern, extract, effect } of targetingPatterns) {
    let match;
    while ((match = pattern.exec(remaining)) !== null) {
      const targetType = match[extract].toLowerCase().replace(/s$/, '');

      if (
        effect === 'destroy' ||
        effect === 'remove' ||
        effect === 'kill' ||
        effect === 'damage'
      ) {
        const tag = removalTags[targetType];
        if (tag) {
          ir.specials.push(tag);
        }
      } else if (effect === 'exile') {
        ir.oracle.push(`o:"exile" o:"${targetType}"`);
      } else if (effect === 'counter') {
        if (targetType === 'creature') {
          ir.oracle.push(`o:"counter" o:"creature spell"`);
        } else {
          ir.oracle.push(`o:"counter" o:"${targetType}"`);
        }
      }

      remaining = remaining.replace(match[0], '').trim();
    }
    pattern.lastIndex = 0;
  }

  return remaining;
}

export function parseCompanions(query: string, ir: SearchIR): string {
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

export function parseSpecialPatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  const commanderFormatPattern =
    /\bcommander(?:-|\s)?(deck|format|legal)\b|\blegal in commander\b|\bfor\s+commander\b|\bin\s+commander\b|\bcommander\s+(staples?|cards?|playable|options?|picks?|pieces?|essentials?|must[- ]haves?)\b/gi;
  if (commanderFormatPattern.test(remaining)) {
    ir.specials.push('f:commander');
    commanderFormatPattern.lastIndex = 0;
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

  // Format parsing: "from modern", "in pioneer", "legal in standard", etc.
  const FORMAT_NAMES = ['standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper', 'historic', 'timeless', 'oathbreaker', 'penny', 'alchemy', 'brawl', 'gladiator'];
  const formatPattern = new RegExp(
    `\\b(?:from|in|for|legal in|legal for)\\s+(${FORMAT_NAMES.join('|')})\\b`,
    'gi',
  );
  const formatMatch = formatPattern.exec(remaining);
  if (formatMatch) {
    const format = formatMatch[1].toLowerCase();
    if (!ir.specials.some(s => s === `f:${format}`)) {
      ir.specials.push(`f:${format}`);
    }
    remaining = remaining.replace(formatMatch[0], '').trim();
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

  // "phyrexian mana" / "cards with phyrexian mana" → m:/P/
  if (/\bphyrexian\s+mana\b/i.test(remaining)) {
    ir.specials.push('m:/P/');
    remaining = remaining.replace(/\bphyrexian\s+mana\b/gi, '').trim();
  }

  return remaining;
}

export function parseEquipmentPatterns(query: string, ir: SearchIR): string {
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

export function parseOraclePatterns(query: string, ir: SearchIR): string {
  let remaining = query;

  if (/\b(?:draw cards?|card\s+draw)\b/i.test(remaining)) {
    if (KNOWN_OTAGS.has('draw')) {
      ir.tags.push('otag:draw');
    } else {
      ir.oracle.push('o:/draw (a|two|three|\\d+) cards?/');
    }
    remaining = remaining.replace(/\b(?:draw cards?|card\s+draw)\b/gi, '').trim();
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

  // "search for lands" / "searches your library for a land"
  if (/\bsearch(?:es?)?\s+(?:for\s+|your\s+library\s+for\s+)?(?:a\s+)?lands?\b/i.test(remaining)) {
    ir.oracle.push('o:"search your library"');
    ir.oracle.push('o:"land"');
    remaining = remaining
      .replace(/\bsearch(?:es?)?\s+(?:for\s+|your\s+library\s+for\s+)?(?:a\s+)?lands?\b/gi, '')
      .trim();
  }

  // "tribal payoffs" / "tribal synergies" for a specific creature type
  const tribalPayoffMatch = remaining.match(
    /\b(\w+)\s+tribal\s+(?:payoffs?|synerg(?:y|ies)|lords?|rewards?)\b/i,
  );
  if (tribalPayoffMatch) {
    const tribe = tribalPayoffMatch[1].toLowerCase().replace(/s$/, '');
    ir.oracle.push(`(o:"${tribe}" o:"you control" or o:"${tribe}" o:"+1/+1")`);
    ir.types.push(tribe);
    remaining = remaining.replace(tribalPayoffMatch[0], '').trim();
  }

  // "when an opponent [action]" + token creation context
  if (
    /\bwhen(?:ever)?\s+(?:an?\s+)?opponents?\s+(?:takes?\s+an\s+action|does\s+something|casts?|attacks?|plays?)\b/i.test(remaining)
  ) {
    ir.oracle.push('o:"whenever"');
    ir.oracle.push('o:"opponent"');
    remaining = remaining
      .replace(/\bwhen(?:ever)?\s+(?:an?\s+)?opponents?\s+(?:takes?\s+an\s+action|does\s+something|casts?|attacks?|plays?)\b/gi, '')
      .trim();
  }

  // "make/create token creatures" or "that make tokens"
  if (/\b(?:make|create|generates?)\s+tokens?\s*(?:creatures?)?\b/i.test(remaining)) {
    ir.oracle.push('o:"create"');
    ir.oracle.push('o:"token"');
    remaining = remaining
      .replace(/\b(?:make|create|generates?)\s+tokens?\s*(?:creatures?)?\b/gi, '')
      .trim();
  }

  // "return creatures from graveyard" / "bring back from graveyard" / "return from graveyard to battlefield"
  if (
    /\b(?:return|bring\s+back|reanimate|revive)\b/i.test(remaining) &&
    /\bgraveyard\b/i.test(remaining)
  ) {
    ir.oracle.push('o:"return" o:"graveyard" o:"battlefield"');
    remaining = remaining
      .replace(/\b(?:return|bring\s+back|reanimate|revive)\s+(?:\w+\s+)*?(?:from\s+)?(?:the\s+)?graveyard(?:\s+to\s+(?:the\s+)?battlefield)?\b/gi, '')
      .replace(/\bgraveyard\b/gi, '')
      .trim();
  }

  // "copy spells" / "that copy" patterns
  if (/\bcopy\s+(?:instant|sorcery|spells?)\b/i.test(remaining)) {
    ir.oracle.push('o:"copy" (o:"instant" or o:"sorcery" or o:"spell")');
    remaining = remaining.replace(/\bcopy\s+(?:instant|sorcery|spells?)\b/gi, '').trim();
  }

  // "reduce spell costs" / "cost reduction"
  if (/\b(?:reduce|lower)\s+(?:spell\s+)?costs?\b/i.test(remaining) || /\bcost\s+reduct(?:ion|er)s?\b/i.test(remaining)) {
    ir.oracle.push('o:"costs" o:"less"');
    remaining = remaining
      .replace(/\b(?:reduce|lower)\s+(?:spell\s+)?costs?\b/gi, '')
      .replace(/\bcost\s+reduct(?:ion|er)s?\b/gi, '')
      .trim();
  }

  // "prevent attacks" / "tax attackers"
  if (/\bprevent\s+attacks?\b/i.test(remaining) || /\btax\s+attackers?\b/i.test(remaining)) {
    ir.oracle.push('(o:"can\'t attack" or o:"costs" o:"more to attack")');
    remaining = remaining
      .replace(/\bprevent\s+attacks?\b/gi, '')
      .replace(/\btax\s+attackers?\b/gi, '')
      .trim();
  }

  return remaining;
}

export function parseManaProduction(query: string, ir: SearchIR): string {
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

  const landInOrGroup = ir.specials.some(
    (s) => s.includes('t:land') && s.includes(' or '),
  );

  const hasLandIntent =
    ir.types.includes('land') || /\blands?\b/i.test(remaining) || landInOrGroup;

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
