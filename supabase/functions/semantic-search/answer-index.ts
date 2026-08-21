/**
 * Pure helpers for the "known answer" stage — the layer that behaves like a
 * search engine answer box: resolve a question to the specific cards that
 * answer it, then search for those cards alongside the broader query.
 *
 * Kept free of Deno/Supabase imports so it can be unit tested.
 */

const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'best',
  'but',
  'by',
  'can',
  'card',
  'cards',
  'do',
  'does',
  'for',
  'from',
  'give',
  'gives',
  'good',
  'has',
  'have',
  'how',
  'i',
  'in',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'some',
  'that',
  'the',
  'their',
  'there',
  'these',
  'they',
  'this',
  'to',
  'top',
  'want',
  'what',
  'when',
  'which',
  'who',
  'will',
  'with',
  'you',
  'your',
]);

/** Split a question into content tokens used for index matching. */
export function tokenizeQuestion(input: string): string[] {
  const tokens = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set(tokens));
}

/** Normalized question key used for exact answer-index lookups. */
export function normalizeQuestion(input: string): string {
  return input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Question-shaped queries are the ones worth answering with named cards:
 * prose describing an effect rather than a card name or Scryfall syntax.
 */
export function looksLikeAnswerableQuestion(input: string): boolean {
  const text = input.trim();
  if (text.length < 12) return false;
  if (/[:<>=]/.test(text)) return false; // raw Scryfall syntax
  const words = text.split(/\s+/);
  if (words.length < 4) return false;
  return /\b(that|which|who|what|how|gives?|grants?|makes?|lets?|allows?|prevents?|copies|copy|whenever|when|deals?|returns?|search(?:es)?|counters?|destroys?|exiles?|draws?|untaps?|doubles?|like|similar|instead|without|anthem|combo|synerg\w*)\b/i.test(
    text,
  );
}

export interface AnswerIndexRow {
  question: string;
  keywords: string[];
  card_names: string[];
  scryfall_query: string;
  confidence: number;
}

export interface AnswerMatch {
  row: AnswerIndexRow;
  score: number;
}

/**
 * Score a stored answer against the incoming question: how much of the
 * question's meaning the stored entry covers, penalised for extra concepts
 * the stored entry adds that the question never mentioned.
 */
export function scoreAnswerRow(
  questionTokens: string[],
  rowKeywords: string[],
): number {
  if (questionTokens.length === 0 || rowKeywords.length === 0) return 0;
  const rowSet = new Set(rowKeywords.map((k) => k.toLowerCase()));
  const querySet = new Set(questionTokens);
  const shared = questionTokens.filter((t) => rowSet.has(t));
  if (shared.length < 2) return 0;
  const coverage = shared.length / questionTokens.length;
  const extra = rowKeywords.filter((k) => !querySet.has(k.toLowerCase()));
  const precision = shared.length / (shared.length + extra.length);
  return coverage * 0.7 + precision * 0.3;
}

/** Pick the best stored answer for a question, or null when none is close enough. */
export function pickBestAnswer(
  question: string,
  rows: AnswerIndexRow[],
  minScore = 0.7,
): AnswerMatch | null {
  const tokens = tokenizeQuestion(question);
  let best: AnswerMatch | null = null;
  for (const row of rows) {
    const score = scoreAnswerRow(tokens, row.keywords);
    if (score >= minScore && (!best || score > best.score)) {
      best = { row, score };
    }
  }
  return best;
}

/**
 * Detect "cards like X" / "budget alternatives to X" intents and return the
 * reference card name. Those queries must never answer with X itself.
 */
export function extractSimilarityReference(input: string): string | null {
  const text = input.trim();
  const patterns = [
    /^(?:cards?|spells?|creatures?|something|anything)\s+(?:like|similar to)\s+(.+)$/i,
    /^(?:budget|cheap|cheaper|affordable|inexpensive)?\s*(?:alternatives?|replacements?|substitutes?|swaps?)\s+(?:to|for)\s+(.+)$/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const name = match[1]
      .replace(/\b(?:under|below|less than)\s+\$?\d+(?:\.\d+)?\b.*$/i, '')
      .replace(/[?."']/g, '')
      .trim();
    if (name.length >= 3 && name.split(/\s+/).length <= 6) return name;
  }
  return null;
}

/** Scryfall-safe exact-name clause for a list of card names. */
export function buildNamesClause(cardNames: string[]): string {
  const clauses = cardNames
    .map((name) => name.replace(/"/g, '').trim())
    .filter((name) => name.length > 0)
    .map((name) => `!"${name}"`);
  return clauses.length > 0 ? `(${clauses.join(' or ')})` : '';
}

/**
 * Final query: the known answer cards OR the broader interpretation, so the
 * answers surface at the top of otherwise normal results.
 */
export function buildAnswerQuery(
  cardNames: string[],
  broaderQuery: string,
  excludeCardName?: string | null,
): string {
  const exclude = excludeCardName?.replace(/"/g, '').trim();
  const kept = exclude
    ? cardNames.filter(
        (name) => name.trim().toLowerCase() !== exclude.toLowerCase(),
      )
    : cardNames;
  const names = buildNamesClause(kept);
  const broader = broaderQuery
    .replace(/\bgame:paper\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const exclusion = exclude ? ` -!"${exclude}"` : '';
  if (!names) return broader ? `${broader}${exclusion}` : '';
  if (!broader) return `${names}${exclusion} game:paper`;
  return `(${names} or (${broader}))${exclusion} game:paper`;
}
