/**
 * Deterministic Translation – Entry Point
 *
 * Orchestrates the full deterministic translation pipeline:
 * normalize → parse (mappings, patterns, core) → render
 *
 * @module deterministic
 */

import type { ParsedIntent, SearchIR } from './types.ts';
import { normalizeQuery } from './normalize.ts';
import {
  parseCardsLike,
  parseSlangTerms,
  applyTagMappings,
  parseTokenCreation,
  parseEnablers,
  parseKeywords,
  parseArchetypes,
} from './parse-mappings.ts';
import {
  parseExclusions,
  parseNumericConstraint,
  parseColors,
  parseTypes,
} from './parse-core.ts';
import {
  parseTargetingPatterns,
  parseCompanions,
  parseSpecialPatterns,
  parseOraclePatterns,
  parseManaProduction,
  parseEquipmentPatterns,
} from './parse-patterns.ts';
import { renderIR } from './render.ts';

// Re-export public types
export type { ParsedIntent, NumericConstraint, SearchIR } from './types.ts';

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
  remaining = parseSlangTerms(remaining, ir); // Parse slang terms EARLY
  remaining = applyTagMappings(remaining, ir);
  remaining = parseTokenCreation(remaining, ir); // Parse token creation BEFORE type parsing
  remaining = parseEnablers(remaining, ir); // Parse enablers early
  remaining = parseKeywords(remaining, ir); // Parse keywords for kw: operator
  remaining = parseArchetypes(remaining, ir); // Parse archetype strategies
  remaining = parseExclusions(remaining, ir); // Parse exclusions before types
  remaining = parseCompanions(remaining, ir);
  remaining = parseSpecialPatterns(remaining, ir);
  remaining = parseOraclePatterns(remaining, ir);
  remaining = parseTargetingPatterns(remaining, ir); // CRITICAL: Parse targeting BEFORE types!
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
  if (/\bcheap\b/i.test(remaining) && !/\$\d+/.test(remaining)) {
    ir.numeric.push({ field: 'mv', op: '<=', value: 3 });
    remaining = remaining.replace(/\bcheap\b/gi, '').trim();
  } else if (/\bbudget\b/i.test(remaining) && !/\$\d+/.test(remaining)) {
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
