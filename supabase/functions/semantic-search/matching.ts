import { SYNONYM_MAP } from './shared-mappings.ts';
import { supabase } from './client.ts';
import { type CacheEntry } from './cache.ts';

/**
 * Hardcoded translations for warmup/prefetch queries.
 * These MUST never hit AI - they are stable, well-known translations.
 */
const HARDCODED_TRANSLATIONS: Record<string, CacheEntry['result']> = {
  'mana rocks': {
    scryfallQuery: 't:artifact o:"add" (o:"{C}" or o:"{W}" or o:"{U}" or o:"{B}" or o:"{R}" or o:"{G}" or o:"any color" or o:"one mana")',
    explanation: {
      readable: 'Artifacts that produce mana (mana rocks)',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'board wipes': {
    scryfallQuery: 'otag:board-wipe',
    explanation: {
      readable: 'Cards that destroy or remove all creatures/permanents',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
};

/**
 * Normalizes synonyms in a query for better cache/pattern matching.
 */
export function normalizeSynonyms(query: string): string {
  let normalized = query.toLowerCase();
  for (const [synonym, canonical] of Object.entries(SYNONYM_MAP)) {
    const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
    normalized = normalized.replace(regex, canonical);
  }
  return normalized;
}

/**
 * Normalizes a query for pattern matching (order-independent, lowercase, no punctuation)
 */
export function normalizeQueryForMatching(query: string): string {
  const synonymNormalized = normalizeSynonyms(query);
  return synonymNormalized
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .sort()
    .join(' ');
}

/**
 * Checks translation_rules for an exact pattern match to bypass AI entirely.
 * Also checks hardcoded translations for warmup queries.
 * Returns the cached result format if a match is found.
 */
export async function checkPatternMatch(
  query: string,
  _filters?: Record<string, unknown>,
): Promise<CacheEntry['result'] | null> {
  // Check hardcoded translations first (zero latency)
  const normalizedLower = query.toLowerCase().trim();
  if (HARDCODED_TRANSLATIONS[normalizedLower]) {
    console.log(`Hardcoded match: "${query}"`);
    return HARDCODED_TRANSLATIONS[normalizedLower];
  }

  const normalizedQuery = normalizeQueryForMatching(query);

  try {
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

        return {
          scryfallQuery: rule.scryfall_syntax,
          explanation: {
            readable: `Using predefined rule: ${rule.description || query}`,
            assumptions: [],
            confidence: rule.confidence,
          },
          showAffiliate: true,
        };
      }
    }
    return null;
  } catch (e) {
    console.error('Pattern match error:', e);
    return null;
  }
}
