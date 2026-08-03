import type { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Dispatch, SetStateAction } from 'react';

import { buildClientFallbackQuery, extractCardNameCandidate } from '@/lib/search/fallback';
import { resolveFuzzyCardName } from '@/lib/scryfall/client';

type SearchResult = {
  scryfallQuery: string;
  explanation?: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  source?: string;
  validationIssues?: string[];
  showAffiliate?: boolean;
};

type RecoveryContext = {
  originalQuery: string;
  currentResult: SearchResult | null;
  currentRequestId: string | null;
  scryfallLang: string;
  queryClient: QueryClient;
  setSearchQuery: (query: string) => void;
  setLastSearchResult: Dispatch<SetStateAction<SearchResult | null>>;
  trackEvent: (event: string, payload: Record<string, unknown>) => void;
};

type RecoveryOutcome =
  | { handled: true }
  | { handled: false };

const RECOVERY_SOURCES = new Set([
  'ai',
  'ai_recovered',
  'concept_match',
  'client_recovery',
  'deterministic',
  'cache',
]);

function buildBroadenedResult(originalQuery: string, fallbackQuery: string): SearchResult {
  return {
    scryfallQuery: fallbackQuery,
    explanation: {
      readable: `Broadened search for: ${originalQuery}`,
      assumptions: ['Original AI translation returned 0 results - using simplified search'],
      confidence: 0.6,
    },
    source: 'client_recovery',
  };
}

async function applyFuzzyRecovery(
  ctx: RecoveryContext,
  nameCandidate: string,
): Promise<RecoveryOutcome> {
  ctx.trackEvent('fuzzy_recovery_attempted', {
    query: ctx.originalQuery,
    candidate: nameCandidate,
    request_id: ctx.currentRequestId ?? undefined,
  });

  const resolved = await resolveFuzzyCardName(nameCandidate);
  if (resolved) {
    const fuzzyQuery = `!"${resolved}"`;
    if (fuzzyQuery !== ctx.currentResult?.scryfallQuery) {
      ctx.trackEvent('fuzzy_recovery_resolved', {
        query: ctx.originalQuery,
        candidate: nameCandidate,
        resolved_name: resolved,
        request_id: ctx.currentRequestId ?? undefined,
      });

      const applyFuzzy = () => {
        ctx.setSearchQuery(fuzzyQuery);
        ctx.setLastSearchResult((prev) =>
          prev
            ? {
                ...prev,
                scryfallQuery: fuzzyQuery,
                explanation: {
                  readable: `Did you mean: ${resolved}`,
                  assumptions: [`Fuzzy-matched "${nameCandidate}" to "${resolved}"`],
                  confidence: 0.85,
                },
                source: 'client_recovery',
              }
            : prev,
        );
        ctx.queryClient.invalidateQueries({
          queryKey: ['cards', fuzzyQuery, ctx.scryfallLang],
        });
      };

      toast.info(`Did you mean "${resolved}"?`, {
        description: `We couldn't find "${nameCandidate}". Switching to ${fuzzyQuery}`,
        duration: 7000,
        action: {
          label: 'Show results',
          onClick: applyFuzzy,
        },
      });
      applyFuzzy();
      return { handled: true };
    }
  }

  ctx.trackEvent('fuzzy_recovery_failed', {
    query: ctx.originalQuery,
    candidate: nameCandidate,
    request_id: ctx.currentRequestId ?? undefined,
  });

  return { handled: false };
}

export async function handleZeroResultRecovery(
  ctx: RecoveryContext,
  hasAttemptedRecovery: boolean,
): Promise<RecoveryOutcome> {
  const source = ctx.currentResult?.source || 'ai';
  if (hasAttemptedRecovery || !RECOVERY_SOURCES.has(source)) {
    return { handled: false };
  }

  const nameCandidate = extractCardNameCandidate(ctx.originalQuery);
  if (nameCandidate && source !== 'client_recovery') {
    const fuzzyOutcome = await applyFuzzyRecovery(ctx, nameCandidate);
    if (fuzzyOutcome.handled) {
      return fuzzyOutcome;
    }
  }

  const fallbackQuery = buildClientFallbackQuery(ctx.originalQuery);
  if (fallbackQuery && fallbackQuery !== ctx.currentResult?.scryfallQuery) {
    sessionStorage.setItem('offmeta_recovery_in_progress', '1');
    toast.info('Trying a broader search...', {
      description: 'The initial translation returned no results.',
      duration: 4000,
    });
    queueMicrotask(() => {
      ctx.setSearchQuery(fallbackQuery);
      ctx.setLastSearchResult((prev) =>
        prev ? { ...prev, ...buildBroadenedResult(ctx.originalQuery, fallbackQuery) } : prev,
      );
      ctx.queryClient.invalidateQueries({
        queryKey: ['cards', fallbackQuery, ctx.scryfallLang],
      });
    });
    return { handled: true };
  }

  return { handled: false };
}
