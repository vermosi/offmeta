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
import { matchSetQuery, matchSetPhrase } from '../../_shared/setMatching.ts';
import { matchArtTagQuery } from '../../_shared/artTagMatching.ts';
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
  parseFramePatterns,
  parseKeywordGrants,
  matchFrameOnlyQuery,

} from './parse-patterns.ts';
import { renderIR } from './render.ts';

const SIMILARITY_INTENT_RE =
  /\b(like|similar|alternatives?|replacements?|substitutes?|swaps?)\b/i;


// Re-export public types
export type { ParsedIntent, NumericConstraint, SearchIR } from './types.ts';

/** Guild/shard/wedge nicknames — never part of a card-name-only query. */
const COLOR_NICKNAMES =
  /\b(azorius|dimir|rakdos|gruul|selesnya|orzhov|izzet|golgari|boros|simic|esper|grixis|jund|naya|bant|abzan|jeskai|sultai|mardu|temur|colorless|mono[- ]?\w+|five[- ]color|5[- ]color)\b/i;

/**
 * Detect if the query looks like an exact card name rather than a search description.
 * Card names are typically 1-5 title-cased words, often with possessives (e.g., "Thassa's Oracle").
 */
function isLikelyCardName(query: string): boolean {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/);
  // Generic descriptor nouns mean the user is describing a category
  // ("ritual effects", "etb combos"), never naming a specific card.
  if (
    /\b(effects?|combos?|pieces?|enablers?|outlets?|generators?|engines?|options?|choices?|ideas?|things?|stuff)\s*$/i.test(
      trimmed,
    )
  ) {
    return false;
  }
  // Color nicknames describe a category ("naya commanders"), never a card name.
  if (COLOR_NICKNAMES.test(trimmed)) return false;

  // Must be 1-6 words
  if (words.length < 1 || words.length > 6) return false;

  // Must contain a possessive or ALL words start with uppercase (case-insensitive for mixed input)
  const hasPossessive = /\w's\b/.test(trimmed);
  const allCapitalized = words.every(w => /^[A-Z]/.test(w) || /^(of|the|and|to|in|for|a|an)$/i.test(w));
  // Must not contain search-like keywords
  const hasSearchKeywords = /\b(with|that|under|below|above|less|more|cheap|budget|from|legal|commanders?|deck|spells?|cards?|creatures?|artifacts?|enchantments?|lands?|instants?|sorcery|sorceries|best|good|great|top|find|payoffs?|synerg(?:y|ies)|released|after|before|since|until|mana|rocks?|wipes?|board|ramp|removal|draw|produce|generate|create|make|search|tap|theme|build|outlet|outlets|lifegain|lifeloss|free|cost|tribal|staples?|format|standard|modern|pioneer|pauper|vintage|legacy|historic|hate|graveyard|exile|protection|counter|tutor|token|sacrifice|flicker|blink|bounce|mill|scry|reanimate|reanimation|aristocrats|pillowfort|voltron|stax|burn|aggro|combo|control|midrange|tempo|frames?|borders?|borderless|textless|showcase|foils?|retro|reprints?|arts?|artwork|printings?)\b/i.test(trimmed);
  if (hasSearchKeywords) return false;
  // Single capitalized word that looks like a proper noun (not a common MTG keyword or creature subtype)
  const singleWordMtgTerms = /^(untap|untapper|untappers|flying|trample|haste|deathtouch|lifelink|vigilance|reach|menace|flash|hexproof|indestructible|ward|defender|first|double|strike|prowess|cascade|storm|affinity|convoke|delve|dredge|infect|wither|persist|undying|annihilator|protection|shroud|regenerate|morph|suspend|evoke|unearth|exalted|devour|bloodthirst|modular|sunburst|equip|ninjutsu|bushido|flanking|phasing|banding|rampage|cumulative|echo|fading|vanishing|kicker|buyback|flashback|madness|retrace|rebound|overload|bestow|dash|surge|emerge|escalate|improvise|aftermath|embalm|eternalize|explore|ascend|adapt|riot|spectacle|escape|mutate|companion|foretell|boast|learn|disturb|daybound|nightbound|cleave|training|blitz|casualty|connive|ravenous|enlist|prototype|toxic|backup|bargain|craft|discover|collect|adventure|channel|cycling|landfall|mill|scry|proliferate|populate|manifest|amass|food|treasure|blood|clue|map|powerstone|incubate|transform|meld|partner|eminence|encore|demonstrate|decayed|exploit|skulk|changeling|devoid|ingest|rally|cohort|support|investigate|fabricate|crew|revolt|improvise|afflict|exert|eternalize|surveil|undergrowth|spectacle|afterlife|jump|red|blue|green|white|black|colorless|multicolor|mono|tribal|removal|ramp|draw|tutor|counter|burn|mill|blink|bounce|copy|clone|theft|discard|sacrifice|token|anthem|lord|stax|hatebear|pillowfort|voltron|aristocrats|reanimator|control|aggro|combo|midrange|tempo|prison|taxes|storm|dredge|infect|aura|equipment|ping|reskins?|angels?|dragons?|elves?|goblins?|zombies?|vampires?|merfolk|wizards?|knights?|demons?|elementals?|beasts?|soldiers?|spirits?|rogues?|clerics?|warriors?|shamans?|druids?|dinosaurs?|pirates?|cats?|dogs?|birds?|snakes?|spiders?|hydras?|phoenixes?|sphinxes?|wurms?|drakes?|faeries?|giants?|humans?|saprolings?|slivers?|treefolk|fungi|oozes?|ninjas?|samurais?)$/i;
  if (words.length === 1 && !singleWordMtgTerms.test(trimmed)) {
    // For single lowercase words, check if they're at least 4 chars and not a common English word
    if (allCapitalized) return true;
    // Allow lowercase single words that are 4+ chars and not in a common-word blocklist
    const commonWords = /^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|way|who|boy|did|any|big|few|got|let|say|she|too|use|why|try|ask|men|run|own|put|set|end|low|high|far|long|last|next|much|take|come|make|give|look|help|turn|play|move|live|find|work|tell|call|keep|hand|pick|part|free|full|open|show|hard|fast|real|good|best|great|cool|nice|cards?|lands?|spells?|creatures?|small|power)$/i;
    if (trimmed.length >= 4 && !commonWords.test(trimmed)) return true;
  }
  if (hasPossessive || (allCapitalized && words.length >= 2)) return true;

  // For 2-3 word lowercase queries: if no word is a search keyword, MTG keyword,
  // or common filler, it's likely a card name (e.g. "lightning bolt", "sol ring")
  if (words.length >= 2 && words.length <= 3) {
    const fillerWords = /^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|way|who|any|big|few|got|let|say|she|too|use|why|try|ask|run|own|put|set|end|low|high|far|long|last|next|much|take|come|make|give|look|help|turn|play|move|live|find|work|tell|call|keep|hand|pick|part|free|full|open|show|hard|fast|real|good|best|great|cool|nice|small|power|my|your|its|some|every|each|other|most)$/i;
    const noFiller = words.every(w => !fillerWords.test(w));
    const noMtgKeyword = words.every(w => !singleWordMtgTerms.test(w));
    if (noFiller && noMtgKeyword) return true;
  }

  return false;
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
  remaining = parseKeywordGrants(remaining, ir); // "gives your creatures X" → oracle grant clause
  remaining = parseKeywords(remaining, ir); // Parse keywords for kw: operator
  remaining = parseArchetypes(remaining, ir); // Parse archetype strategies
  remaining = parseExclusions(remaining, ir); // Parse exclusions before types
  remaining = parseFramePatterns(remaining, ir); // Frame/border treatments before type parsing
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

  // Handle "under N mana" / "less than N mana" / "below N mana" → mv constraint (BEFORE price)
  const manaValueMatch = remaining.match(
    /\b(?:under|below|less\s+than)\s+(\d+)\s+(?:mana|mv|cmc|mana\s+value)\b/i,
  );
  if (manaValueMatch) {
    ir.numeric.push({ field: 'mv', op: '<', value: Number(manaValueMatch[1]) });
    remaining = remaining.replace(manaValueMatch[0], '').trim();
  }

  // Handle price constraints: require $ sign OR "dollars" to distinguish from mana
  const priceMatch = remaining.match(
    /\b(?:under|below|less\s+than)\s+\$\s*(\d+(?:\.\d+)?)\b/i,
  );
  if (priceMatch) {
    ir.numeric.push({ field: 'usd', op: '<', value: Number(priceMatch[1]) });
    remaining = remaining.replace(priceMatch[0], '').trim();
  } else {
    // "under 10 dollars" pattern (no $ sign but has "dollars")
    const priceDollarsMatch = remaining.match(
      /\b(?:under|below|less\s+than)\s+(\d+(?:\.\d+)?)\s+dollars?\b/i,
    );
    if (priceDollarsMatch) {
      ir.numeric.push({ field: 'usd', op: '<', value: Number(priceDollarsMatch[1]) });
      remaining = remaining.replace(priceDollarsMatch[0], '').trim();
    } else {
      // Bare "under 5" with no unit → price (players say "under 5" for budget;
      // mana constraints are written as "under 5 mana"/"5 mv or less")
      const bareBudgetMatch = remaining.match(
        /(?<!\b(?:power|toughness|pow|tou|mana\s+value|mv|cmc|price|cost)\s)\b(?:under|below|less\s+than)\s+(\d+(?:\.\d+)?)\b(?!\s*(?:mana|mv|cmc|power|toughness|counters?|lands?|cards?))/i,
      );

      if (bareBudgetMatch) {
        ir.numeric.push({ field: 'usd', op: '<', value: Number(bareBudgetMatch[1]) });
        remaining = remaining.replace(bareBudgetMatch[0], '').trim();
      }
    }
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
    // Subjective "obscurity" adjectives are never printed on cards — drop them
    // instead of turning them into literal oracle text searches (o:"hidden").
    .replace(
      /\b(hidden(?:\s+gems?)?|underrated|underplayed|overlooked|obscure|sleeper|off\s*-?\s*meta|niche|unknown|lesser\s+known|unpopular|spicy)\b/gi,
      '',
    )
    .replace(/\b(that|which|with|the|a|an|cards?|released|printed|utility|in|for|from|staples?|search|searches|tribal|payoffs?|synerg(?:y|ies)|token|tokens?|creature|creatures?|opponent|opponents?|takes?|action|when|whenever|graveyard|battlefield|abilities|ability|good|best|great|nice|cool|awesome|strong|powerful|useful|top|find|give|gives|gives?|make|makes|let|lets|my|your|its|some|any|also|really|very|most|all|every|each|other|new|old|more|well|would|could|should|want|need|like|help|me|you|it|do|does|get|got|go|goes|there|their|here|these|those|being|been|have|has|had|will|can|may|might|must|shall|just|only|even|still|already|are|is|be|was|were|what|how|about|into|onto|upon|over|under|through|around|between|during)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  ir.remaining = remaining;

  return ir;
}

/** Empty intent used by short-circuit paths that bypass the parser pipeline. */
function emptyIntent(): ParsedIntent {
  return {
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
}

export function buildDeterministicIntent(query: string, options?: { isKnownCardName?: boolean }): {
  intent: ParsedIntent;
  deterministicQuery: string;
} {
  // Short-circuit: the whole query names a Scryfall set ("hobbit", "bloomburrow").
  // Runs before the card-name path so upcoming sets aren't reduced to name: searches.
  const setMatch = matchSetQuery(query);
  if (setMatch) {
    return { intent: emptyIntent(), deterministicQuery: setMatch.query };
  }

  // Mixed intent: a set name plus card criteria ("the hobbit red dwarf").
  // Scope the rest of the parse to that set instead of losing either half.
  const setPhrase = matchSetPhrase(query);
  if (setPhrase) {
    const rest = buildDeterministicIntent(setPhrase.remainder, options);
    const restQuery = rest.deterministicQuery.trim();
    return {
      intent: rest.intent,
      deterministicQuery: restQuery ? `${setPhrase.query} ${restQuery}` : setPhrase.query,
    };
  }

  // Short-circuit: print treatment vocabulary ("retro frame", "レトロフレーム",
  // "sin bordes"). Must run before the card-name heuristic.
  const frameOnly = matchFrameOnlyQuery(query);
  if (frameOnly) {
    return { intent: emptyIntent(), deterministicQuery: frameOnly };
  }

  // Short-circuit: if the query is a known card name (DB lookup) OR heuristic match, use name search
  if (options?.isKnownCardName || isLikelyCardName(query)) {
    const trimmed = query.trim();
    // IMPORTANT: Do NOT run normalizeQuery — slang mappings corrupt card names
    // (e.g. "bolt" → "Lightning Bolt" turns "Lightning Bolt" into "lightning Lightning Bolt")
    const safeName = trimmed.toLowerCase().replace(/\bgrey\b/g, 'gray').replace(/\bcolour\b/g, 'color').trim();
    // Punctuation-tolerant: users type "rune scarred demon" or "marchesa the black
    // rose", while the printed names are "Rune-Scarred Demon" and "Marchesa, the
    // Black Rose". A quoted phrase misses both, so match each word independently.
    const nameTokens = safeName
      .split(/[^\p{L}\p{N}'’]+/u)
      .map((token) => token.replace(/^['’]+|['’]+$/g, ''))
      .filter((token) => token.length > 0);
    // Never emit a bare `name:` — an empty candidate means this is not a name
    // search, so fall through to the regular IR pipeline.
    if (nameTokens.length > 0) {
      const exactQuery = nameTokens.length === 1
        ? `name:${nameTokens[0]}`
        : nameTokens.map((token) => `name:${/[^\p{L}\p{N}]/u.test(token) ? `"${token}"` : token}`).join(' ');
      return { intent: emptyIntent(), deterministicQuery: exactQuery };
    }
  }


  const ir = buildIR(query);

  // Art-tag rescue: the query only produced generic qualifiers ("shirtless
  // commanders" → is:commander) while the descriptive words went unmatched.
  // Resolve those leftovers against the art-tag vocabulary before rendering.
  const hasContent =
    ir.types.length > 0 ||
    ir.subtypes.length > 0 ||
    ir.oracle.length > 0 ||
    ir.tags.length > 0 ||
    ir.artTags.length > 0 ||
    ir.numeric.length > 0;
  // "cards like X" is a similarity request, not an artwork request.
  if (
    !hasContent &&
    ir.remaining.trim() &&
    !SIMILARITY_INTENT_RE.test(query)
  ) {
    const leftoverArtMatch = matchArtTagQuery(ir.remaining);
    if (leftoverArtMatch) {
      ir.artTags.push(`atag:${leftoverArtMatch.tag}`);
      ir.remaining = '';
    }
  }


  const deterministicQuery = renderIR(ir);

  // Art-tag fallback: nothing else in the pipeline understood the query, but it
  // names a Scryfall art tag ("shirtless cards" → atag:shirtless). Runs last so
  // functional/type parsing always wins.
  if (!deterministicQuery.trim() && !SIMILARITY_INTENT_RE.test(query)) {
    const artMatch = matchArtTagQuery(query);
    if (artMatch) {
      return { intent: emptyIntent(), deterministicQuery: artMatch.query };
    }
  }


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
