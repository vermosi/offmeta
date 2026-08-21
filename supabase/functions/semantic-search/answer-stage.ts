/**
 * Answer stage — tiered "known answer" resolution that runs before AI query
 * translation.
 *
 * Tier A: curated/learned answer index (deterministic, ~1 DB read).
 * Tier B: grounded card-name lookup via the AI gateway, verified against
 *         Scryfall so we never invent card names, then persisted back into the
 *         index so the same question is Tier A next time.
 */

import { supabase } from './client.ts';
import { fetchWithTimeout } from './utils.ts';
import {
  type AnswerIndexRow,
  buildAnswerQuery,
  extractSimilarityReference,
  looksLikeAnswerableQuestion,
  normalizeQuestion,
  pickBestAnswer,
  tokenizeQuestion,
} from './answer-index.ts';
import {
  isScryfallCircuitOpen,
  scryfallCircuitRemainingMs,
  scryfallFetch,
} from '../_shared/scryfall-client.ts';

export interface AnswerResolution {
  scryfallQuery: string;
  cardNames: string[];
  confidence: number;
  tier: 'answer_index' | 'answer_lookup';
}

const AI_LOOKUP_TIMEOUT_MS = 3000;
const AI_LOOKUP_MIN_TIMEOUT_MS = 1600;
const SCRYFALL_VERIFY_TIMEOUT_MS = 1500;
const MAX_ANSWER_CARDS = 8;

type Logger = (event: string, payload: Record<string, unknown>) => void;

async function findIndexedAnswer(
  query: string,
): Promise<AnswerResolution | null> {
  const tokens = tokenizeQuestion(query);
  if (tokens.length < 2) return null;

  const { data, error } = await supabase
    .from('answer_index')
    .select('question, keywords, card_names, scryfall_query, confidence')
    .overlaps('keywords', tokens)
    .limit(40);

  if (error || !data?.length) return null;

  const best = pickBestAnswer(query, data as AnswerIndexRow[]);
  if (!best) return null;

  // Fire-and-forget usage stats.
  void supabase
    .from('answer_index')
    .update({ last_used_at: new Date().toISOString() })
    .eq('question', best.row.question);

  return {
    scryfallQuery: best.row.scryfall_query,
    cardNames: best.row.card_names ?? [],
    confidence: Math.min(0.95, Number(best.row.confidence) || 0.85),
    tier: 'answer_index',
  };
}

/** Keep only names Scryfall actually knows — the model never defines truth. */
async function verifyCardNames(names: string[]): Promise<string[]> {
  const identifiers = names.slice(0, MAX_ANSWER_CARDS).map((name) => ({ name }));
  if (identifiers.length === 0) return [];

  try {
    const response = await scryfallFetch(
      'https://api.scryfall.com/cards/collection',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers }),
        timeoutMs: SCRYFALL_VERIFY_TIMEOUT_MS,
        retries: 0,
      },
    );
    if (!response.ok) return [];
    const payload = await response.json();
    const cards: Array<{ name?: string }> = payload?.data ?? [];
    return cards
      .map((card) => card.name)
      .filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

async function lookupAnswerWithAi(
  query: string,
  apiKey: string,
  logWarn: Logger,
  similarityReference?: string | null,
  timeoutMs: number = AI_LOOKUP_TIMEOUT_MS,
): Promise<string[]> {
  const systemPrompt = similarityReference
    ? 'You are a Magic: The Gathering card expert. The user wants cards that play like a reference card. ' +
      `List up to ${MAX_ANSWER_CARDS} real paper Magic cards that are functionally similar to "${similarityReference}" ` +
      '(same effect, role and colors where possible), most similar first. ' +
      `Never include "${similarityReference}" itself. Respect any stated budget, colors or format. ` +
      'Use exact English card names as printed. Respond with JSON only: {"cards":["Name","Name"]}. If unsure, return {"cards":[]}.'
    : 'You are a Magic: The Gathering rules and card expert. Given a question about what a card does, ' +
      `list up to ${MAX_ANSWER_CARDS} real paper Magic cards that best answer it, most relevant first. ` +
      'Use exact English card names as printed. Respect any stated colors, color identity, format or budget. ' +
      'Respond with JSON only: {"cards":["Name","Name"]}. If you are unsure, return {"cards":[]}.';

  try {
    const response = await fetchWithTimeout(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          temperature: 0,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query },
          ],
          response_format: { type: 'json_object' },
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      logWarn('answer_lookup_gateway_error', { status: response.status });
      return [];
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return [];
    const parsed = JSON.parse(content);
    const cards = Array.isArray(parsed?.cards) ? parsed.cards : [];
    return cards
      .filter((name: unknown): name is string => typeof name === 'string')
      .slice(0, MAX_ANSWER_CARDS);
  } catch (error) {
    logWarn('answer_lookup_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

async function rememberAnswer(
  query: string,
  cardNames: string[],
  scryfallQuery: string,
): Promise<void> {
  try {
    await supabase.from('answer_index').upsert(
      {
        question: normalizeQuestion(query),
        keywords: tokenizeQuestion(query),
        card_names: cardNames,
        scryfall_query: scryfallQuery,
        confidence: 0.82,
        source: 'ai',
        last_used_at: new Date().toISOString(),
      },
      { onConflict: 'question' },
    );
  } catch {
    // Learning is best-effort — never fail a search because of it.
  }
}

/**
 * Resolve a question to answer cards. Returns null when the question isn't
 * answer-shaped, when nothing is known, or when the budget is too tight —
 * callers then continue with the normal translation pipeline.
 */
export async function resolveAnswer(args: {
  query: string;
  broaderQuery: string;
  remainingBudgetMs: number;
  apiKey: string | undefined;
  allowAiLookup: boolean;
  /** Skip tier A when the index was already checked earlier in the request. */
  skipIndex?: boolean;
  logInfo: Logger;
  logWarn: Logger;
}): Promise<AnswerResolution | null> {
  const { query, broaderQuery, remainingBudgetMs, apiKey, allowAiLookup } = args;

  if (!looksLikeAnswerableQuestion(query)) return null;

  // Tier A — curated / previously learned answers.
  if (!args.skipIndex) {
    try {
      const indexed = await findIndexedAnswer(query);
      if (indexed) {
        args.logInfo('answer_index_hit', {
          query: query.substring(0, 60),
          cards: indexed.cardNames.length,
        });
        return indexed;
      }
    } catch (error) {
      args.logWarn('answer_index_error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Tier B — grounded lookup, only with enough budget left.
  if (!allowAiLookup || !apiKey) return null;
  // Adaptive: the lookup is usually ~1s, so fit it into whatever budget is
  // left rather than skipping the stage whenever the full window is gone.
  const lookupTimeoutMs = Math.min(
    AI_LOOKUP_TIMEOUT_MS,
    remainingBudgetMs - SCRYFALL_VERIFY_TIMEOUT_MS - 200,
  );
  if (lookupTimeoutMs < AI_LOOKUP_MIN_TIMEOUT_MS) {
    args.logInfo('answer_lookup_skipped_budget', { remainingBudgetMs });
    return null;
  }

  const similarityReference = extractSimilarityReference(query);
  const suggested = await lookupAnswerWithAi(
    query,
    apiKey,
    args.logWarn,
    similarityReference,
    lookupTimeoutMs,
  );
  if (suggested.length === 0) return null;

  const verified = await verifyCardNames(suggested);
  if (verified.length < 2) {
    args.logInfo('answer_lookup_unverified', {
      suggested: suggested.length,
      verified: verified.length,
    });
    return null;
  }

  const scryfallQuery = buildAnswerQuery(
    verified,
    broaderQuery,
    similarityReference,
  );
  args.logInfo('answer_lookup_hit', {
    query: query.substring(0, 60),
    verified: verified.length,
    similarityReference: similarityReference ?? null,
  });
  void rememberAnswer(query, verified, scryfallQuery);


  return {
    scryfallQuery,
    cardNames: verified,
    confidence: 0.85,
    tier: 'answer_lookup',
  };
}
