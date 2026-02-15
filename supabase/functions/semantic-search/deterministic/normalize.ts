/**
 * Deterministic Translation – Query Normalization
 * @module deterministic/normalize
 */

import {
  WORD_NUMBER_MAP,
  SLANG_MAP,
} from '../shared-mappings.ts';

export function normalizeQuery(query: string): string {
  let normalized = query
    .toLowerCase()
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
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
