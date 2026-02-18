/**
 * Deterministic Translation – Mapping-Based Parsers
 * Handles slang terms, tag mappings, keywords, enablers,
 * token creation, "cards like X", and archetypes.
 * @module deterministic/parse-mappings
 */

import { KNOWN_OTAGS } from '../tags.ts';
import {
  KEYWORD_MAP,
  SPECIAL_KEYWORD_MAP,
  ENABLER_KEYWORDS,
  ARCHETYPE_MAP,
  CARDS_LIKE_MAP,
  TAG_FIRST_MAP,
  ART_TAG_MAP,
  SLANG_TO_SYNTAX_MAP,
} from '../mappings/index.ts';
import type { SearchIR } from './types.ts';

/**
 * Parse common MTG slang terms that the AI often incorrectly generates as invalid oracle tags.
 * This intercepts slang like "counterspell", "aggro", "sacrifice" and converts to valid Scryfall syntax.
 * MUST run early in the pipeline before other parsing.
 */
export function parseSlangTerms(query: string, ir: SearchIR): string {
  let remaining = query;

  for (const { pattern, syntax } of SLANG_TO_SYNTAX_MAP) {
    if (pattern.test(remaining)) {
      // Only push non-empty syntax (empty string = consume-only, no output)
      if (syntax.trim().length > 0) {
        ir.specials.push(syntax);
      }
      remaining = remaining.replace(pattern, '').trim();
    }
    // Reset regex state for global patterns
    pattern.lastIndex = 0;
  }

  return remaining;
}

export function applyTagMappings(query: string, ir: SearchIR): string {
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
 */
export function parseKeywords(query: string, ir: SearchIR): string {
  let remaining = query;
  const matchedKeywords = new Set<string>();

  for (const [keyword, scryfallSyntax] of Object.entries(KEYWORD_MAP)) {
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

  // Second pass: match standalone keywords
  for (const [keyword, scryfallSyntax] of Object.entries(KEYWORD_MAP)) {
    if (matchedKeywords.has(keyword)) continue;

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
 */
export function parseEnablers(query: string, ir: SearchIR): string {
  let remaining = query;

  for (const keyword of ENABLER_KEYWORDS) {
    const pattern = new RegExp(
      `\\b${keyword.replace('-', '[ -]?')}\\s+enablers?\\b`,
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

  // Also handle "grants X" pattern
  for (const keyword of ENABLER_KEYWORDS) {
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
 */
export function parseTokenCreation(query: string, ir: SearchIR): string {
  let remaining = query;

  const tokenPatterns = [
    /\b(?:make|makes|create|creates|generating?|produce|produces)\s+(\w+)\s+tokens?\b/gi,
    /\b(\w+)\s+token\s+(?:generator|creator|maker)s?\b/gi,
    /\b(?:cards? that )?(?:make|create)s?\s+(\w+)\s+tokens?\b/gi,
  ];

  for (const pattern of tokenPatterns) {
    let match;
    while ((match = pattern.exec(remaining)) !== null) {
      const tokenType = match[1].toLowerCase();

      if (
        ['a', 'an', 'the', 'some', 'any', 'multiple', 'many'].includes(
          tokenType,
        )
      ) {
        continue;
      }

      ir.oracle.push(`o:"create" o:"${tokenType}" o:"token"`);
      remaining = remaining.replace(match[0], '').trim();
    }
    pattern.lastIndex = 0;
  }

  return remaining;
}

/**
 * Parse "cards like X" patterns - Functional similarity search
 */
export function parseCardsLike(query: string, ir: SearchIR): string {
  let remaining = query;

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
        .replace(/^['"]|['"]$/g, '')
        .replace(/\s+/g, ' ');

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

      if (!found) {
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
 * Parse archetype/strategy patterns
 *
 * IMPORTANT: Only match archetype keywords when they stand alone as deck themes,
 * not when they're part of a verb phrase like "sacrifice lands"
 */
export function parseArchetypes(query: string, ir: SearchIR): string {
  let remaining = query;

  // Handle "[type] tribal payoffs/synergies/lords" BEFORE generic tribal archetype
  const tribalPayoffMatch = remaining.match(
    /\b(\w+)\s+tribal\s+(?:payoffs?|synerg(?:y|ies)|lords?|rewards?)\b/i,
  );
  if (tribalPayoffMatch) {
    const tribe = tribalPayoffMatch[1].toLowerCase().replace(/s$/, '');
    ir.oracle.push(`(o:"${tribe}" o:"you control" or o:"${tribe}" o:"+1/+1")`);
    ir.types.push(tribe);
    remaining = remaining.replace(tribalPayoffMatch[0], '').trim();
    // Don't fall through to generic "tribal" below
  }

  const skipSacrificeAsArchetype =
    /\bsacrifice\s+(a\s+)?(creature|land|artifact|enchantment|permanent)/i.test(
      remaining,
    );

  // Skip "graveyard" archetype when it's part of a verb phrase like "return from graveyard"
  const skipGraveyardAsArchetype =
    /\b(?:return|bring\s+back|reanimate|revive|from)\b/i.test(remaining) &&
    /\bgraveyard\b/i.test(remaining);

  for (const [archetype, scryfallSyntax] of Object.entries(ARCHETYPE_MAP)) {
    if (archetype === 'sacrifice' && skipSacrificeAsArchetype) {
      continue;
    }
    if (archetype === 'graveyard' && skipGraveyardAsArchetype) {
      continue;
    }

    const archetypeExemptFromLookahead = ['landfall'];
    const lookahead = archetypeExemptFromLookahead.includes(archetype)
      ? ''
      : `(?!\\s+(?:a|an|the|your|target|lands?|creatures?|artifacts?))`;
    const standalonPattern = new RegExp(
      `(?<!(?:to|can|let you|that|which|cards that)\\s)\\b${archetype}\\b${lookahead}`,
      'gi',
    );

    if (standalonPattern.test(remaining)) {
      ir.specials.push(scryfallSyntax);
      remaining = remaining.replace(standalonPattern, '').trim();
    }
  }

  return remaining;
}
