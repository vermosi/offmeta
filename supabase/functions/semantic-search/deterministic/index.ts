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
  parseSupertypes,
  parseSubtypes,
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

/**
 * Detect if the query looks like an exact card name rather than a search description.
 * Card names are typically 1-5 title-cased words, often with possessives (e.g., "Thassa's Oracle").
 */
function isLikelyCardName(query: string): boolean {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/);
  // Must be 1-6 words
  if (words.length < 1 || words.length > 6) return false;
  // Must contain a possessive or ALL words start with uppercase
  const hasPossessive = /\w's\b/.test(trimmed);
  const allCapitalized = words.every(w => /^[A-Z]/.test(w) || /^(of|the|and|to|in|for|a|an)$/i.test(w));
  // Must not contain search-like keywords
  const hasSearchKeywords = /\b(with|that|under|below|above|less|more|cheap|budget|from|legal|commander|deck|spells?|cards?|creatures?|artifacts?|enchantments?|lands?|instants?|sorcery|sorceries)\b/i.test(trimmed);
  if (hasSearchKeywords) return false;
  // Single capitalized word that looks like a proper noun (not a common MTG keyword)
  const singleWordMtgTerms = /^(flying|trample|haste|deathtouch|lifelink|vigilance|reach|menace|flash|hexproof|indestructible|ward|defender|first|double|strike|prowess|cascade|storm|affinity|convoke|delve|dredge|infect|wither|persist|undying|annihilator|protection|shroud|regenerate|morph|suspend|evoke|unearth|exalted|devour|bloodthirst|modular|sunburst|equip|ninjutsu|bushido|flanking|phasing|banding|rampage|cumulative|echo|fading|vanishing|kicker|buyback|flashback|madness|retrace|rebound|overload|bestow|dash|surge|emerge|escalate|improvise|aftermath|embalm|eternalize|explore|ascend|adapt|riot|spectacle|escape|mutate|companion|foretell|boast|learn|disturb|daybound|nightbound|cleave|training|blitz|casualty|connive|ravenous|enlist|prototype|toxic|backup|bargain|craft|discover|collect|adventure|channel|cycling|landfall|mill|scry|proliferate|populate|manifest|amass|food|treasure|blood|clue|map|powerstone|incubate|transform|meld|partner|eminence|encore|demonstrate|decayed|exploit|skulk|changeling|devoid|ingest|rally|cohort|support|investigate|fabricate|crew|revolt|improvise|afflict|exert|eternalize|surveil|undergrowth|spectacle|afterlife|jump|red|blue|green|white|black|colorless|multicolor|mono|tribal|removal|ramp|draw|tutor|counter|burn|mill|blink|bounce|copy|clone|theft|discard|sacrifice|token|anthem|lord|stax|hatebear|pillowfort|voltron|aristocrats|reanimator|control|aggro|combo|midrange|tempo|prison|taxes|storm|dredge|infect|aura|equipment)$/i;
  if (words.length === 1 && allCapitalized && !singleWordMtgTerms.test(trimmed)) return true;
  return hasPossessive || (allCapitalized && words.length >= 2);
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
  remaining = parseSlangTerms(remaining, ir); // Parse slang terms FIRST (before cards-like steals "X alternatives")
  remaining = parseCardsLike(remaining, ir); // Parse "cards like X" after slang is consumed
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
  remaining = parseSupertypes(remaining, ir);
  remaining = parseSubtypes(remaining, ir);

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

  // Handle "more than N reprints / printings" → prints>N (Scryfall uses "prints:", not "reprints:")
  const reprintsMatch = remaining.match(
    /\b(?:more\s+than|over|greater\s+than|at\s+least)\s+(\d+)\s+(?:reprints?|printings?|editions?|versions?)\b/i,
  );
  if (reprintsMatch) {
    const n = Number(reprintsMatch[1]);
    if (!Number.isNaN(n)) {
      ir.specials.push(`prints>${n}`);
      remaining = remaining.replace(reprintsMatch[0], '').trim();
    }
  }
  // Also handle "fewer than N reprints"
  const fewerReprintsMatch = remaining.match(
    /\b(?:fewer\s+than|less\s+than|under)\s+(\d+)\s+(?:reprints?|printings?)\b/i,
  );
  if (fewerReprintsMatch) {
    const n = Number(fewerReprintsMatch[1]);
    if (!Number.isNaN(n)) {
      ir.specials.push(`prints<${n}`);
      remaining = remaining.replace(fewerReprintsMatch[0], '').trim();
    }
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
    .replace(/\b(that|which|with|the|a|an|cards?|released|printed|utility|in|for|from|staples?|search|searches|tribal|payoffs?|synerg(?:y|ies)|token|tokens?|creature|creatures?|opponent|opponents?|takes?|action|when|whenever|graveyard|battlefield|abilities|ability)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  ir.remaining = remaining;

  return ir;
}

export function buildDeterministicIntent(query: string): {
  intent: ParsedIntent;
  deterministicQuery: string;
} {
  // Short-circuit: if the query looks like a card name, use name search
  if (isLikelyCardName(query)) {
    const trimmedName = query.trim();
    const wordCount = trimmedName.split(/\s+/).length;
    // Single word → partial match (name:X finds all cards containing that word)
    // Multi-word → exact match (!"Name" finds the specific card)
    const exactQuery = wordCount === 1 ? `name:${trimmedName}` : `!"${trimmedName}"`;
    const intent: ParsedIntent = {
      colors: null,
      types: [],
      subtypes: [],
      cmc: null,
      power: null,
      toughness: null,
      isCommander: false,
      format: null,
      yearConstraint: null,
      priceConstraint: null,
      remainingQuery: '',
      warnings: [],
      oraclePatterns: [],
      tagTokens: [],
      statTotalApprox: null,
    };
    return { intent, deterministicQuery: exactQuery };
  }

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
