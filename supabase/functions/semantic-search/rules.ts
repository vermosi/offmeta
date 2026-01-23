import { supabase } from './client.ts';

// In-memory cache for dynamic rules
let dynamicRulesCache: { rules: string; timestamp: number } | null = null;
const DYNAMIC_RULES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches active dynamic translation rules from the database.
 * Uses in-memory caching to reduce DB calls (rules change infrequently).
 * These rules are generated from user feedback to improve translations.
 */
export async function fetchDynamicRules(): Promise<string> {
  // Check cache first
  if (
    dynamicRulesCache &&
    Date.now() - dynamicRulesCache.timestamp < DYNAMIC_RULES_CACHE_TTL
  ) {
    return dynamicRulesCache.rules;
  }

  try {
    const { data: rules, error } = await supabase
      .from('translation_rules')
      .select('pattern, scryfall_syntax, description')
      .eq('is_active', true)
      .gte('confidence', 0.6)
      .order('created_at', { ascending: false })
      .limit(50); // Increased from 20 to include more auto-generated patterns

    if (error || !rules || rules.length === 0) {
      // Cache empty result too to avoid repeated failed queries
      dynamicRulesCache = { rules: '', timestamp: Date.now() };
      return '';
    }

    const rulesText = rules
      .map(
        (r) =>
          `- "${r.pattern}" → ${r.scryfall_syntax}${r.description ? ` (${r.description})` : ''}`,
      )
      .join('\n');

    const result = `\n\nDYNAMIC RULES (learned from user feedback - PRIORITIZE these):\n${rulesText}`;

    // Cache the result
    dynamicRulesCache = { rules: result, timestamp: Date.now() };

    return result;
  } catch (e) {
    console.error('Failed to fetch dynamic rules:', e);
    return dynamicRulesCache?.rules || '';
  }
}
