/**
 * Hook for "Find Cards Like This" feature.
 * Detects card names, fetches similarity data, and manages tab state.
 * @module hooks/useSimilarCards
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCardByName, searchCards } from '@/lib/scryfall/client';
import type { ScryfallCard, SearchResult } from '@/types/card';
import { useAnalytics } from '@/hooks/useAnalytics';
import { logger } from '@/lib/core/logger';
import {
  mergePlanCandidates,
  rankSimilarityCandidates,
  type RankedRecommendation,
} from '@/lib/recommendations/ranking';
import type { QueryPlan, RecommendationIntent } from '@/types/recommendations';
import { RECOMMENDATION_VERSION } from '@/types/recommendations';
import { getRecommendationRolloutAssignment } from '@/lib/recommendations/rollout';
import {
  recordSimilarError,
  recordSimilarNoSource,
  friendlySimilarErrorMessage,
} from '@/lib/search/diagnostics';

export interface SimilarityData {
  sourceCard: ScryfallCard;
  similarResults: SearchResult | null;
  budgetResults: SearchResult | null;
  rankedSimilar?: RankedRecommendation[];
  rankedBudget?: RankedRecommendation[];
}

/**
 * Debounce interval before a query change triggers a new fetch.
 * Long enough to swallow rapid typing, short enough to feel instant
 * once the user stops.
 */
const SIMILAR_DEBOUNCE_MS = 350;

/**
 * Module-level LRU cache so repeated strategy-hate lookups (e.g. clicking
 * the Similar tab twice in one session, or two components mounting for the
 * same query) resolve synchronously instead of re-invoking the edge
 * function. Survives react-query's per-mount gcTime and cross-component
 * unmounts. Bounded to keep memory flat across long sessions.
 */
const SIMILAR_CACHE_MAX = 50;
const POSITIVE_CACHE_TTL_MS = 10 * 60 * 1000;
const EMPTY_CACHE_TTL_MS = 60 * 1000;

interface SimilarityCacheEntry {
  value: SimilarityData | null;
  expiresAt: number;
}

const similarityCache = new Map<string, SimilarityCacheEntry>();

function cardFingerprint(card?: ScryfallCard | null): string {
  if (!card) return '';
  return JSON.stringify([
    card.id,
    card.oracle_text ?? '',
    card.cmc,
    card.color_identity ?? [],
    card.type_line,
    card.prices.usd ?? '',
  ]);
}

function cacheKey(query: string, fallbackFingerprint: string): string {
  return `${RECOMMENDATION_VERSION}::${query.trim().toLowerCase()}::${fallbackFingerprint}`;
}

function readCache(key: string): SimilarityData | null | undefined {
  if (!similarityCache.has(key)) return undefined;
  const entry = similarityCache.get(key);
  if (!entry || entry.expiresAt <= Date.now()) {
    similarityCache.delete(key);
    return undefined;
  }
  // Refresh LRU position.
  similarityCache.delete(key);
  similarityCache.set(key, entry);
  return entry.value;
}

function writeCache(key: string, value: SimilarityData | null): void {
  if (similarityCache.has(key)) similarityCache.delete(key);
  similarityCache.set(key, {
    value,
    expiresAt:
      Date.now() +
      (value === null ? EMPTY_CACHE_TTL_MS : POSITIVE_CACHE_TTL_MS),
  });
  while (similarityCache.size > SIMILAR_CACHE_MAX) {
    const oldest = similarityCache.keys().next().value;
    if (oldest === undefined) break;
    similarityCache.delete(oldest);
  }
}

function toSearchResult(cards: ScryfallCard[]): SearchResult {
  return {
    object: 'list',
    total_cards: cards.length,
    has_more: false,
    data: cards,
  };
}

function defaultIntent(
  sourceCard: ScryfallCard,
  plans: QueryPlan[],
): RecommendationIntent {
  return {
    version: RECOMMENDATION_VERSION,
    mode: 'similarity',
    sourceCardId: sourceCard.id,
    sourceCardName: sourceCard.name,
    hardConstraints: {},
    functionalSignals: plans
      .filter((plan) => plan.strategy !== 'structural')
      .map((plan) => ({ signal: plan.signal, confidence: plan.confidence })),
    structuralSignals: {
      types: [],
      manaValue: sourceCard.cmc,
      colorIdentity: sourceCard.color_identity ?? [],
    },
    exclusions: [sourceCard.name],
    confidence: Math.max(0.4, ...plans.map((plan) => plan.confidence)),
  };
}

/** Exposed for tests. */
export function __clearSimilarityCache(): void {
  similarityCache.clear();
}

/**
 * Attempts to detect if a search query is a specific card name
 * by doing an exact match lookup on Scryfall.
 */
async function detectCardName(query: string): Promise<ScryfallCard | null> {
  const trimmed = query.trim();
  // Heuristic: card names are typically 1-6 words, no operators
  if (!trimmed || trimmed.length > 100) return null;
  if (/[():!<>=]/.test(trimmed)) return null; // Contains Scryfall operators
  const words = trimmed.split(/\s+/);
  if (words.length > 7) return null;

  try {
    return await getCardByName(trimmed);
  } catch {
    return null;
  }
}

export function useSimilarCards(
  query: string,
  fallbackCard?: ScryfallCard | null,
  options?: { trackActivation?: boolean },
) {
  const { trackEvent } = useAnalytics();
  const [enabled, setEnabled] = useState(false);
  const trackActivation = options?.trackActivation ?? true;

  // Debounce the query so rapid typing (or upstream state churn) doesn't
  // spawn a series of edge-function calls that all get thrown away.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const trimmed = query.trim();
    // Keep the debounce path uniform so we don't set state synchronously in
    // the effect body and trigger an avoidable render cascade.
    const delay = trimmed ? SIMILAR_DEBOUNCE_MS : 0;
    const timer = setTimeout(() => setDebouncedQuery(query), delay);
    return () => clearTimeout(timer);
  }, [query]);

  const fallbackId = fallbackCard?.id ?? null;
  const fallbackFingerprint = cardFingerprint(fallbackCard);
  const key = cacheKey(debouncedQuery, fallbackFingerprint);

  const {
    data: similarityData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['similar-cards', debouncedQuery, fallbackFingerprint],
    queryFn: async (): Promise<SimilarityData | null> => {
      const assignment = await getRecommendationRolloutAssignment();
      const rolloutKey = `${key}::${assignment.stage}:${assignment.serveVersion}`;
      const cached = readCache(rolloutKey);
      if (cached !== undefined) return cached;

      const sourceCard =
        (await detectCardName(debouncedQuery)) ?? fallbackCard ?? null;
      if (!sourceCard) {
        recordSimilarNoSource(debouncedQuery);
        writeCache(rolloutKey, null);
        return null;
      }

      // Call edge function for deterministic similarity queries.
      const { data, error: fnError } = await supabase.functions.invoke(
        'card-similarity',
        {
          body: {
            cardName: sourceCard.name,
            cardId: sourceCard.id,
            typeLine: sourceCard.type_line,
            oracleText: sourceCard.oracle_text,
            colorIdentity: sourceCard.color_identity,
            keywords:
              (sourceCard as unknown as { keywords?: string[] }).keywords ?? [],
            cmc: sourceCard.cmc,
            prices: sourceCard.prices,
          },
        },
      );

      if (fnError || !data?.success) {
        const reason =
          fnError?.message ||
          (typeof data?.error === 'string' ? data.error : null) ||
          'Similarity edge function returned an error';
        logger.warn('Card similarity fetch failed', fnError || data?.error);
        recordSimilarError(
          debouncedQuery,
          fallbackId,
          reason,
          fnError || data?.error,
        );
        // Throw so react-query surfaces `error` to the UI. We deliberately
        // don't cache transient failures — retry on next activation.
        throw new Error(reason);
      }

      let result: SimilarityData;
      const queryPlans = Array.isArray(data.queryPlans)
        ? (data.queryPlans as QueryPlan[]).slice(0, 4)
        : [];
      const fetchBaseline = () =>
        Promise.all([
          data.similarQuery
            ? searchCards(data.similarQuery, 1)
            : Promise.resolve(null),
          data.budgetQuery
            ? searchCards(data.budgetQuery, 1)
            : Promise.resolve(null),
        ]);
      const baselinePromise =
        assignment.serveVersion === 'baseline' || assignment.runShadow
          ? fetchBaseline()
          : null;
      if (
        queryPlans.length > 0 &&
        (assignment.serveVersion === 'v2' || assignment.runShadow)
      ) {
        const planResults = await Promise.all(
          queryPlans.map((plan) => searchCards(plan.query, 1)),
        );
        let activePlans = queryPlans;
        let candidates = mergePlanCandidates(
          activePlans,
          planResults.map((planResult) => planResult.data),
        );
        const intent =
          data.intent && data.intent.version === RECOMMENDATION_VERSION
            ? (data.intent as RecommendationIntent)
            : defaultIntent(sourceCard, activePlans);
        let ranked = rankSimilarityCandidates(
          sourceCard,
          candidates,
          activePlans,
          intent,
        );
        const needsRecovery =
          candidates.length < 20 ||
          (ranked.similar[0]?.breakdown.confidence ?? 0) < 0.5;
        if (needsRecovery && data.recoveryPlan) {
          const recoveryPlan = data.recoveryPlan as QueryPlan;
          const recoveryResult = await searchCards(recoveryPlan.query, 1);
          activePlans = [...activePlans, recoveryPlan];
          candidates = mergePlanCandidates(
            activePlans,
            [...planResults, recoveryResult].map(
              (planResult) => planResult.data,
            ),
          );
          ranked = rankSimilarityCandidates(
            sourceCard,
            candidates,
            activePlans,
            intent,
          );
        }
        result = {
          sourceCard,
          similarResults: toSearchResult(
            ranked.similar.map((entry) => entry.card),
          ),
          budgetResults:
            ranked.budget.length > 0
              ? toSearchResult(ranked.budget.map((entry) => entry.card))
              : null,
          rankedSimilar: ranked.similar,
          rankedBudget: ranked.budget,
        };
        if (assignment.serveVersion === 'baseline' && baselinePromise) {
          const [similarResults, budgetResults] = await baselinePromise;
          result = { sourceCard, similarResults, budgetResults };
        }
      } else {
        // Compatibility path for an older deployed edge function.
        const [similarResults, budgetResults] = await (baselinePromise ??
          fetchBaseline());
        result = { sourceCard, similarResults, budgetResults };
      }
      writeCache(rolloutKey, result);
      return result;
    },
    enabled: enabled && (!!debouncedQuery.trim() || !!fallbackCard),
    staleTime: 10 * 60 * 1000, // 10 min
    gcTime: 30 * 60 * 1000,
    retry: false,
  });

  const activate = useCallback(() => {
    setEnabled(true);
    if (trackActivation) {
      trackEvent('card_click', {
        card_id: 'similarity_tab',
        card_name: query,
        set_code: '',
        rarity: '',
      });
    }
  }, [query, trackActivation, trackEvent]);

  const errorMessage = error
    ? friendlySimilarErrorMessage(
        error instanceof Error ? error.message : String(error),
      )
    : null;

  return {
    similarityData: error ? null : similarityData,
    isLoading,
    error,
    errorMessage,
    activate,
    isDetected: similarityData?.sourceCard != null,
  };
}
