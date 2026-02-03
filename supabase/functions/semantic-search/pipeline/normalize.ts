/**
 * Stage 1: Query Normalization
 * Lightweight deterministic text cleanup before any AI processing
 */

import {
  MULTICOLOR_MAP,
  WORD_NUMBER_MAP,
  SYNONYM_MAP,
} from '../shared-mappings.ts';

// MTG shorthand expansions
const SHORTHAND_MAP: Record<string, string> = {
  cmc: 'mana value',
  mv: 'mana value',
  etb: 'enters the battlefield',
  ltb: 'leaves the battlefield',
  gy: 'graveyard',
  edh: 'commander',
  cmdr: 'commander',
  pw: 'planeswalker',
};

// Phrases to preserve as-is (quoted phrases in input)
const PRESERVE_PHRASES_REGEX = /"([^"]+)"/g;

export interface NormalizedQuery {
  original: string;
  normalized: string;
  preservedPhrases: string[];
  colorMappings: Array<{ from: string; to: string }>;
  numberMappings: Array<{ from: string; to: number }>;
}

/**
 * Normalizes a natural language query for processing
 */
export function normalizeQuery(query: string): NormalizedQuery {
  const original = query;
  let normalized = query.toLowerCase().trim();

  // Track preserved quoted phrases
  const preservedPhrases: string[] = [];
  const phraseMatches = normalized.matchAll(PRESERVE_PHRASES_REGEX);
  for (const match of phraseMatches) {
    preservedPhrases.push(match[1]);
  }

  // Normalize unicode quotes and apostrophes
  normalized = normalized.replace(/[""]/g, '"').replace(/['']/g, "'");

  // Apply synonym normalization
  for (const [synonym, canonical] of Object.entries(SYNONYM_MAP)) {
    const regex = new RegExp(`\\b${escapeRegex(synonym)}\\b`, 'gi');
    normalized = normalized.replace(regex, canonical);
  }

  // Expand shorthand (but keep original for context)
  for (const [short, expanded] of Object.entries(SHORTHAND_MAP)) {
    const regex = new RegExp(`\\b${short}\\b`, 'gi');
    normalized = normalized.replace(regex, expanded);
  }

  // Track color mappings
  const colorMappings: Array<{ from: string; to: string }> = [];

  // Map multicolor names to codes
  for (const [name, codes] of Object.entries(MULTICOLOR_MAP)) {
    const regex = new RegExp(`\\b${name}\\b`, 'gi');
    if (regex.test(normalized)) {
      colorMappings.push({ from: name, to: codes });
    }
  }

  // Track number word conversions
  const numberMappings: Array<{ from: string; to: number }> = [];
  for (const [word, value] of Object.entries(WORD_NUMBER_MAP)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(normalized)) {
      numberMappings.push({ from: word, to: value });
      normalized = normalized.replace(regex, String(value));
    }
  }

  // Normalize common patterns
  normalized = normalized
    // Normalize "X or less" / "X or more" patterns
    .replace(/(\d+)\s+or\s+less/gi, '<=$1')
    .replace(/(\d+)\s+or\s+more/gi, '>=$1')
    .replace(/(\d+)\s+and\s+under/gi, '<=$1')
    .replace(/(\d+)\s+and\s+over/gi, '>=$1')
    .replace(/less\s+than\s+(\d+)/gi, '<$1')
    .replace(/more\s+than\s+(\d+)/gi, '>$1')
    .replace(/under\s+(\d+)/gi, '<$1')
    .replace(/over\s+(\d+)/gi, '>$1')
    .replace(/at\s+least\s+(\d+)/gi, '>=$1')
    .replace(/at\s+most\s+(\d+)/gi, '<=$1')
    // Normalize price patterns
    .replace(/\$(\d+)/g, '$1 dollars')
    .replace(/under\s+(\d+)\s*dollars?/gi, 'usd<$1')
    .replace(/over\s+(\d+)\s*dollars?/gi, 'usd>$1')
    .replace(/less\s+than\s+(\d+)\s*dollars?/gi, 'usd<$1')
    .replace(/more\s+than\s+(\d+)\s*dollars?/gi, 'usd>$1')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return {
    original,
    normalized,
    preservedPhrases,
    colorMappings,
    numberMappings,
  };
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects if the query looks like raw Scryfall syntax
 */
export function isRawScryfallSyntax(query: string): boolean {
  // Check for common Scryfall operators
  const scryfallPatterns = [
    /\b[a-z]+[:=<>]/i, // key:value, key=value, key<value, etc.
    /\(.*\bor\b.*\)/i, // (x or y) pattern
    /^-[a-z]+:/i, // negation -key:
    /\bo:"[^"]+"/, // oracle text search
    /\bt:[a-z]+/i, // type search
  ];

  return scryfallPatterns.some((pattern) => pattern.test(query));
}

/**
 * Extracts potential card names from the query
 * Returns candidates for fuzzy matching against Scryfall autocomplete
 */
export function extractCardNameCandidates(query: string): string[] {
  const candidates: string[] = [];

  // Check for quoted phrases (likely card names)
  const quotedMatches = query.matchAll(/"([^"]+)"/g);
  for (const match of quotedMatches) {
    candidates.push(match[1]);
  }

  // Check for title-cased phrases (2-4 words, likely card names)
  const titleCaseMatch = query.match(
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g,
  );
  if (titleCaseMatch) {
    candidates.push(...titleCaseMatch);
  }

  return candidates;
}
