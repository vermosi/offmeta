/**
 * Durable dedupe decisions for automated jobs.
 *
 * A job lease (see `jobLock.ts`) answers "is someone running right now?".
 * This answers the different question "did we already decide to do this
 * recently?" — and it has to survive redeploys and cold starts, so the key,
 * the decision and its expiry all live in `public.job_dedupe` rather than in
 * an isolate-local Map.
 *
 * Fail-open by design: if the database is unreachable we return `claimed`,
 * because suppressing a repair on infrastructure noise is worse than doing
 * it twice.
 *
 * @module functions/_shared/dedupe
 */

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface DedupeClaim<T = Record<string, unknown>> {
  /** True when this caller owns the window and should perform the action. */
  claimed: boolean;
  /** The decision recorded by the caller that owns the window. */
  decision?: T;
  /** When the current window lapses. */
  expiresAt?: string;
  /** How many callers have been suppressed since the window opened. */
  hitCount?: number;
}

/**
 * Try to claim `key` for `ttlSeconds`.
 *
 * An expired key is re-claimed atomically, so a lapsed window never wedges
 * the pipeline.
 */
export async function claimDedupe<T = Record<string, unknown>>(
  key: string,
  ttlSeconds: number,
  decision: Record<string, unknown> = {},
): Promise<DedupeClaim<T>> {
  const result = await rpc<{
    claimed: boolean;
    decision?: T;
    expires_at?: string;
    hit_count?: number;
  }>('claim_dedupe_key', {
    p_key: key,
    p_ttl_seconds: Math.max(Math.floor(ttlSeconds), 1),
    p_decision: decision,
  });

  if (!result) return { claimed: true };

  return {
    claimed: result.claimed === true,
    decision: result.decision,
    expiresAt: result.expires_at,
    hitCount: result.hit_count,
  };
}

/**
 * Overwrite the stored decision once the action has actually finished, so a
 * later suppressed caller reads the real outcome instead of a placeholder.
 */
export async function recordDedupeDecision(
  key: string,
  decision: Record<string, unknown>,
): Promise<void> {
  await rpc('record_dedupe_decision', { p_key: key, p_decision: decision });
}
