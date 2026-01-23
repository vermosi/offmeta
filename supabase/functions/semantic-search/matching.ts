import { SYNONYM_MAP } from './shared-mappings.ts';
import { supabase } from './client.ts';
import { type CacheEntry } from './cache.ts';

/**
 * Normalizes synonyms in a query for better cache/pattern matching.
 */
export function normalizeSynonyms(query: string): string {
  let normalized = query.toLowerCase();
  for (const [synonym, canonical] of Object.entries(SYNONYM_MAP)) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
    normalized = normalized.replace(regex, canonical);
  }
  return normalized;
}

/**
 * Normalizes a query for pattern matching (order-independent, lowercase, no punctuation)
 */
export function normalizeQueryForMatching(query: string): string {
  // Apply synonym normalization first
  const synonymNormalized = normalizeSynonyms(query);
  return synonymNormalized
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(' ')
    .sort() // Sort words for order-independent matching
    .join(' ');
}

/**
 * Checks translation_rules for an exact pattern match to bypass AI entirely.
 * Returns the cached result format if a match is found.
 */
export async function checkPatternMatch(
  query: string,
  _filters?: Record<string, unknown>,
): Promise<CacheEntry['result'] | null> {
  const normalizedQuery = normalizeQueryForMatching(query);

  try {
    // Check for exact pattern matches in translation_rules
    const { data: rules, error } = await supabase
      .from('translation_rules')
      .select('pattern, scryfall_syntax, confidence, description')
      .eq('is_active', true)
      .gte('confidence', 0.8);

    if (error || !rules || rules.length === 0) return null;

    for (const rule of rules) {
      const normalizedPattern = normalizeQueryForMatching(rule.pattern);
      if (normalizedPattern === normalizedQuery) {
        console.log(
          `Pattern match found: "${query}" → "${rule.scryfall_syntax}"`,
        );

        const result = {
          scryfallQuery: rule.scryfall_syntax,
          explanation: {
            readable: `Using predefined rule: ${rule.description || query}`,
            assumptions: [],
            confidence: rule.confidence,
          },
          showAffiliate: true, // Default for pattern matches
        };

        return result;
      }
    }
    return null;
  } catch (e) {
    console.error('Pattern match error:', e);
    return null;
  }
}
