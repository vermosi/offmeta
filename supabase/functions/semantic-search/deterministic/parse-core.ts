/**
 * Deterministic Translation – Core Parsers
 * Handles colors, types, exclusions, and numeric constraints.
 * @module deterministic/parse-core
 */

import {
  COLOR_MAP,
  MULTICOLOR_MAP,
  CARD_TYPES,
} from '../shared-mappings.ts';
import type { SearchIR, NumericConstraint } from './types.ts';

/**
 * Parse exclusion patterns
 * "not a creature", "non-creature", "without creatures" → -t:creature
 */
export function parseExclusions(query: string, ir: SearchIR): string {
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

export function parseNumericConstraint(
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

export function parseColors(query: string, ir: SearchIR): string {
  let remaining = query;

  // Identity context: explicit mentions OR if commander format/special was already parsed
  const hasCommanderContext = ir.specials.some(s => s === 'f:commander' || s === 'is:commander');
  const identityIntent =
    hasCommanderContext ||
    /\b(ci|color identity|commander deck|fits into|goes into|can go in|usable in|identity)\b/i.test(
      remaining,
    );
  const exactIntent = /\b(exactly|only|just|strictly|mono)\b/i.test(remaining);

  // MONO-COLOR
  const monoMatch = remaining.match(
    /\bmono[-\s]?(white|blue|black|red|green|w|u|b|r|g|colou?r(?:ed)?)\b/i,
  );
  if (monoMatch) {
    const colorInput = monoMatch[1].toLowerCase();
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

  // Shorthand like "WUB", "RG" in identity context
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
          identityIntent ? 'within' : 'exact',
      };
      remaining = remaining.replace(regex, '').trim();
      return remaining;
    }
  }

  // "X or Y" color pattern
  const orMatch = remaining.match(
    /\b(white|blue|black|red|green)\s+or\s+(white|blue|black|red|green)\b/i,
  );
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

  // "X and Y"
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

  // Hyphenated colors
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
 * - t:X t:Y = card must have BOTH types (AND)
 * - (t:X or t:Y) = card must have EITHER type (OR)
 * - -t:X = card must NOT have type
 */
export function parseTypes(query: string, ir: SearchIR): string {
  let remaining = query;
  const typesHandledAsOr = new Set<string>();

  // Handle "utility lands" → t:land -t:basic
  if (/\butility\s+lands?\b/i.test(remaining)) {
    ir.types.push('land');
    if (!ir.excludedTypes.includes('basic')) {
      ir.excludedTypes.push('basic');
    }
    remaining = remaining.replace(/\butility\s+lands?\b/gi, '').trim();
  }

  // FIRST: Check for "X or Y" type patterns
  const orPatterns = [
    /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\s+or\s+(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\b/gi,
    /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?(?:\s*,\s*(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?)*\s*,?\s*or\s+(artifact|creature|instant|sorcery|land|enchantment|planeswalker)s?\b/gi,
  ];

  for (const orPattern of orPatterns) {
    const orMatches = [...remaining.matchAll(orPattern)];
    for (const orMatch of orMatches) {
      const typesInMatch = orMatch[0].match(
        /\b(artifact|creature|instant|sorcery|land|enchantment|planeswalker)/gi,
      );
      if (typesInMatch && typesInMatch.length >= 2) {
        const uniqueTypes = [
          ...new Set(typesInMatch.map((t) => t.toLowerCase())),
        ];
        const orParts = uniqueTypes.map((t) => `t:${t}`);
        ir.specials.push(`(${orParts.join(' or ')})`);
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

  // Extract remaining individual types (AND logic)
  for (const type of CARD_TYPES) {
    if (typesHandledAsOr.has(type)) continue;

    const typePattern = new RegExp(`\\b${type}s?\\b`, 'i');
    if (typePattern.test(remaining)) {
      ir.types.push(type);
      remaining = remaining.replace(typePattern, '').trim();
    }
  }

  return remaining;
}
