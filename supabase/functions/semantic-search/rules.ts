import { supabase } from './client.ts';

interface StaticRule {
  pattern: string;
  scryfall_syntax: string;
  description?: string;
}

const STATIC_DYNAMIC_RULES: StaticRule[] = (() => {
  const raw = Deno.env.get('STATIC_TRANSLATION_RULES_JSON');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is StaticRule =>
          typeof item?.pattern === 'string' &&
          typeof item?.scryfall_syntax === 'string' &&
          (typeof item?.description === 'string' || item?.description == null),
      )
      .slice(0, 20);
  } catch {
    return [];
  }
})();

function formatRules(rules: StaticRule[]): string {
  if (rules.length === 0) return '';

  const rulesText = rules
    .map(
      (r) =>
        `- "${r.pattern}" → ${r.scryfall_syntax}${r.description ? ` (${r.description})` : ''}`,
    )
    .join('\n');

  return `\n\nDYNAMIC RULES (learned from user feedback - PRIORITIZE these):\n${rulesText}`;
}

const STATIC_RULES_TEXT = formatRules(STATIC_DYNAMIC_RULES);

// In-memory cache for dynamic rules
let dynamicRulesCache: { rules: string; timestamp: number } | null = null;
const DYNAMIC_RULES_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Fetches active dynamic translation rules from the database.
 * Uses in-memory caching to reduce DB calls (rules change infrequently).
 * These rules are generated from user feedback to improve translations.
 */
export async function fetchDynamicRules(): Promise<string> {
  // Prefer statically baked rules to remove DB latency from the hot path.
  if (STATIC_RULES_TEXT) {
    return STATIC_RULES_TEXT;
  }

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
      .is('archived_at', null)
      .gte('confidence', 0.6)
      .order('created_at', { ascending: false })
      .limit(50); // Increased from 20 to include more auto-generated patterns

    if (error || !rules || rules.length === 0) {
      // Cache empty result too to avoid repeated failed queries
      dynamicRulesCache = { rules: '', timestamp: Date.now() };
      return '';
    }

    const result = formatRules(rules);

    // Cache the result
    dynamicRulesCache = { rules: result, timestamp: Date.now() };

    return result;
  } catch (e) {
    console.error('Failed to fetch dynamic rules:', e);
    return dynamicRulesCache?.rules || '';
  }
}
