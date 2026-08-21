/**
 * Parser for the Comprehensive Rules glossary published at
 * https://yawgatog.com/resources/magic-rules/
 *
 * The glossary is plain HTML: every entry is a single `<p id=slug>` element that
 * starts with an anchor holding the term, followed by `: ` and the definition.
 * We keep the parser dependency-free and defensive — a markup change should
 * yield fewer entries, never garbage rows.
 */

export interface GlossaryEntry {
  slug: string;
  term: string;
  termLower: string;
  definition: string;
  category: GlossaryCategory;
  ruleRefs: string[];
  scryfallHint: string | null;
}

export type GlossaryCategory =
  | 'keyword_ability'
  | 'keyword_action'
  | 'ability_word'
  | 'card_type'
  | 'zone'
  | 'counter'
  | 'general';

const GLOSSARY_MARKER = 'id=R.glossary';

/** Strips tags and decodes the small set of entities the source actually uses. */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function classify(definition: string): GlossaryCategory {
  const d = definition.toLowerCase();
  if (/\bkeyword ability\b/.test(d)) return 'keyword_ability';
  if (/\bkeyword action\b/.test(d)) return 'keyword_action';
  if (/\bability word\b/.test(d)) return 'ability_word';
  if (/\bcard type\b|\btype of (?:card|permanent)\b/.test(d)) return 'card_type';
  if (/\bzone\b/.test(d) && /^a zone|is a zone/.test(d)) return 'zone';
  if (/\bkind of counter\b|\bcounter\b.*\bpermanent\b/.test(d)) return 'counter';
  return 'general';
}

/** Terms whose Scryfall meaning is not the literal word (or is too noisy to hint). */
const HINT_BLOCKLIST = new Set([
  'ability',
  'card',
  'cost',
  'counter',
  'effect',
  'object',
  'permanent',
  'player',
  'spell',
  'token',
  'zone',
]);

function buildHint(term: string, category: GlossaryCategory): string | null {
  const lower = term.toLowerCase();
  if (HINT_BLOCKLIST.has(lower)) return null;
  // Multi-word or punctuated terms are rarely valid Scryfall keywords.
  if (!/^[a-z][a-z' -]*$/.test(lower)) return null;

  if (category === 'keyword_ability') return `keyword:"${lower}"`;
  if (category === 'keyword_action' || category === 'ability_word') {
    return `oracle:"${lower}"`;
  }
  return null;
}

function extractRuleRefs(html: string): string[] {
  const refs = new Set<string>();
  for (const m of html.matchAll(/href="#R(\d+[a-z]?)"/g)) {
    // Rule anchors are digit runs; convert 70133 -> 701.33, 1021 -> 102.1.
    const raw = m[1];
    const digits = raw.replace(/[a-z]$/, '');
    const suffix = raw.slice(digits.length);
    if (digits.length < 3) continue;
    refs.add(`${digits.slice(0, 3)}${digits.length > 3 ? '.' + digits.slice(3) : ''}${suffix}`);
    if (refs.size >= 6) break;
  }
  return [...refs];
}

/**
 * Parses the glossary section of the Comprehensive Rules HTML page.
 * Returns one entry per glossary term, deduplicated by slug.
 */
export function parseGlossary(html: string): GlossaryEntry[] {
  const markerIndex = html.indexOf(GLOSSARY_MARKER);
  const section = markerIndex >= 0 ? html.slice(markerIndex) : html;

  const entries = new Map<string, GlossaryEntry>();
  const paragraphRe = /<p id=([A-Za-z0-9_]+)>([\s\S]*?)(?=<p id=|<div|<h1|$)/g;

  for (const match of section.matchAll(paragraphRe)) {
    const slug = match[1];
    const body = match[2];
    const text = stripHtml(body);
    const separator = text.indexOf(': ');
    if (separator <= 0) continue;

    const term = text.slice(0, separator).trim();
    const definition = text.slice(separator + 2).trim();
    if (!term || term.length > 80 || definition.length < 3) continue;

    const category = classify(definition);
    entries.set(slug, {
      slug,
      term,
      termLower: term.toLowerCase(),
      definition,
      category,
      ruleRefs: extractRuleRefs(body),
      scryfallHint: buildHint(term, category),
    });
  }

  return [...entries.values()];
}
