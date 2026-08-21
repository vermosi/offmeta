/**
 * Comprehensive Rules grounding for the translation pipeline.
 *
 * `public.rules_glossary` holds the official CR glossary (see the
 * `rules-glossary-sync` job). Two uses here:
 *
 *  1. Deterministic: a query that names a keyword ability ("deathtouch",
 *     "annihilator") gets a real Scryfall clause (`keyword:"deathtouch"`)
 *     without spending an AI call.
 *  2. Grounding: matched terms and their official definitions are folded into
 *     the AI translator's system prompt so rules jargon is disambiguated.
 *
 * The glossary is small and changes a few times a year, so it is cached in
 * memory per isolate.
 *
 * @module semantic-search/pipeline/rules-glossary
 */

declare const Deno: { env: { get(key: string): string | undefined } };

export interface GlossaryTerm {
  term: string;
  termLower: string;
  definition: string;
  category: string;
  scryfallHint: string | null;
}

export interface GlossaryMatch extends GlossaryTerm {
  /** Character offset of the match, used for stable ordering. */
  index: number;
}

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
/** Short terms produce false positives inside ordinary English. */
const MIN_TERM_LENGTH = 4;
/** Common English words that are also glossary terms — never match on these alone. */
const AMBIGUOUS_TERMS = new Set([
  'ability',
  'action',
  'active player',
  'card',
  'color',
  'control',
  'cost',
  'damage',
  'draw',
  'effect',
  'game',
  'hand',
  'life',
  'mana',
  'name',
  'number',
  'object',
  'permanent',
  'phase',
  'play',
  'player',
  'spell',
  'step',
  'target',
  'text',
  'turn',
  'value',
  'zone',
]);

let cache: { terms: GlossaryTerm[]; loadedAt: number } | null = null;
let inFlight: Promise<GlossaryTerm[]> | null = null;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Test seam: replaces the cached glossary. */
export function __setGlossaryCache(terms: GlossaryTerm[] | null): void {
  cache = terms ? { terms, loadedAt: Date.now() } : null;
  inFlight = null;
}

async function fetchGlossary(): Promise<GlossaryTerm[]> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return [];

  const endpoint =
    `${url}/rest/v1/rules_glossary` +
    `?select=term,term_lower,definition,category,scryfall_hint&limit=1200`;

  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return [];

  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows
    .map((row) => ({
      term: String(row.term ?? ''),
      termLower: String(row.term_lower ?? '').toLowerCase(),
      definition: String(row.definition ?? ''),
      category: String(row.category ?? 'general'),
      scryfallHint: (row.scryfall_hint as string | null) ?? null,
    }))
    .filter((t) => t.termLower.length >= MIN_TERM_LENGTH && !AMBIGUOUS_TERMS.has(t.termLower))
    // Longest first so "keyword ability" wins over "ability".
    .sort((a, b) => b.termLower.length - a.termLower.length);
}

/** Loads the glossary, cached per isolate. Never throws. */
export async function loadGlossary(): Promise<GlossaryTerm[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.terms;
  if (inFlight) return inFlight;

  inFlight = fetchGlossary()
    .then((terms) => {
      if (terms.length > 0) cache = { terms, loadedAt: Date.now() };
      return terms;
    })
    .catch(() => [])
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Finds glossary terms mentioned in the query, longest match wins per span. */
export function matchGlossaryTerms(
  query: string,
  terms: GlossaryTerm[],
  maxMatches = 4,
): GlossaryMatch[] {
  const text = query.toLowerCase();
  if (!text.trim()) return [];

  const matches: GlossaryMatch[] = [];
  const consumed: Array<[number, number]> = [];

  for (const term of terms) {
    if (matches.length >= maxMatches) break;
    const re = new RegExp(`\\b${escapeRegExp(term.termLower)}(?:s|es)?\\b`);
    const found = re.exec(text);
    if (!found) continue;

    const start = found.index;
    const end = start + found[0].length;
    if (consumed.some(([s, e]) => start < e && end > s)) continue;

    consumed.push([start, end]);
    matches.push({ ...term, index: start });
  }

  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Deterministic Scryfall clauses for matched keyword abilities.
 * Only keyword abilities are safe to turn into syntax directly — keyword
 * actions and general terms stay as AI grounding.
 */
export function glossaryClauses(matches: GlossaryMatch[]): string[] {
  return matches
    .filter((m) => m.category === 'keyword_ability' && m.scryfallHint)
    .map((m) => m.scryfallHint as string);
}

/** Builds the rules-grounding block appended to the translator system prompt. */
export function buildRulesGrounding(matches: GlossaryMatch[]): string {
  if (matches.length === 0) return '';

  const lines = matches.map((m) => {
    const definition = m.definition.length > 220
      ? `${m.definition.slice(0, 217)}...`
      : m.definition;
    const hint = m.scryfallHint ? ` [likely syntax: ${m.scryfallHint}]` : '';
    return `- ${m.term} (${m.category.replace(/_/g, ' ')}): ${definition}${hint}`;
  });

  return [
    'OFFICIAL RULES CONTEXT (Comprehensive Rules glossary). Use these definitions',
    'to disambiguate the query. They describe game meaning, not required syntax —',
    'only emit a clause when the query actually asks for it:',
    ...lines,
  ].join('\n');
}

/** Convenience wrapper: load + match in one call, never throws. */
export async function getRulesContext(
  query: string,
  maxMatches = 4,
): Promise<GlossaryMatch[]> {
  try {
    const terms = await loadGlossary();
    return matchGlossaryTerms(query, terms, maxMatches);
  } catch {
    return [];
  }
}
