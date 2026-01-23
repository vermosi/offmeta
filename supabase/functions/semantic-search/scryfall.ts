import { fetchWithRetry } from './utils.ts';

export interface ScryfallValidationResult {
  ok: boolean;
  status: number;
  totalCards?: number;
  warnings?: string[];
  error?: string;
  overlyBroad?: boolean;
  zeroResults?: boolean;
}

/**
 * Validates a Scryfall query against the Scryfall API (dry-run).
 * Checks for syntax errors and result counts.
 */
export async function validateAgainstScryfall(
  scryfallQuery: string,
  overlyBroadThreshold: number,
): Promise<ScryfallValidationResult> {
  const scryfallUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
    scryfallQuery,
  )}&extras=true`;

  try {
    const response = await fetchWithRetry(scryfallUrl);

    if (response.status === 200) {
      const data = await response.json();
      return {
        ok: true,
        status: 200,
        totalCards: data.total_cards,
        overlyBroad: data.total_cards > overlyBroadThreshold,
        zeroResults: data.total_cards === 0,
        warnings: data.warnings,
      };
    }

    if (response.status === 404) {
      return { ok: false, status: 404, totalCards: 0, zeroResults: true };
    }

    const errorData = await response.json();
    return {
      ok: false,
      status: response.status,
      error: errorData.details || 'Unknown Scryfall error',
      warnings: errorData.warnings,
    };
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

/**
 * Relaxes a query by removing speculative or restrictive clauses.
 * Used when a query returns zero results.
 */
export function relaxSpeculativeClauses(query: string): {
  relaxedQuery: string;
  removed: string[];
} {
  const speculativePatterns = [
    /\s+is:reprint\b/gi,
    /\s+is:firstprint\b/gi,
    /\s+f:\w+\b/gi,
    /\s+id[=:]\w+\b/gi,
    /\s+usd[<>]\d+\b/gi,
  ];

  let relaxedQuery = query;
  const removed: string[] = [];

  for (const pattern of speculativePatterns) {
    const match = relaxedQuery.match(pattern);
    if (match) {
      removed.push(match[0].trim());
      relaxedQuery = relaxedQuery.replace(pattern, '');
    }
  }

  return { relaxedQuery: relaxedQuery.trim(), removed };
}

/**
 * Validates and optionally relaxes a query to ensure results.
 */
export async function validateAndRelaxQuery(
  query: string,
  deterministicQuery: string | null,
  overlyBroadThreshold: number,
): Promise<{
  query: string;
  relaxedClauses: string[];
  validation: ScryfallValidationResult | null;
}> {
  let currentQuery = query;
  const relaxedClauses: string[] = [];

  // First validation
  let validation = await validateAgainstScryfall(
    currentQuery,
    overlyBroadThreshold,
  );

  // If zero results and we have more than just a name search, try relaxing
  if (validation.zeroResults && currentQuery.includes(':')) {
    const { relaxedQuery, removed } = relaxSpeculativeClauses(currentQuery);
    if (removed.length > 0) {
      currentQuery = relaxedQuery;
      relaxedClauses.push(...removed);
      validation = await validateAgainstScryfall(
        currentQuery,
        overlyBroadThreshold,
      );
    }
  }

  // If still zero results and we had a deterministic match, prefer that
  if (validation.zeroResults && deterministicQuery) {
    currentQuery = deterministicQuery;
    validation = await validateAgainstScryfall(
      currentQuery,
      overlyBroadThreshold,
    );
  }

  return { query: currentQuery, relaxedClauses, validation };
}
