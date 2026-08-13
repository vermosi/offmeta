/**
 * Job leases for scheduled edge functions.
 *
 * Cron, the ops watchdog and manual admin triggers can all fire the same job
 * at once. A lease makes each run idempotent at the job level: the first
 * caller wins, later callers exit immediately, and a crashed run's lease
 * expires on its own so nothing stays wedged.
 *
 * @module functions/_shared/jobLock
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

export interface JobLease {
  /** True when this caller owns the lease and may proceed. */
  acquired: boolean;
  holder: string;
  release: () => Promise<void>;
}

/**
 * Try to take the lease for `jobName`.
 *
 * @param ttlSeconds How long the lease survives without an explicit release.
 *   Set it above the job's worst-case runtime so a slow run isn't lapped.
 */
export async function acquireJobLock(
  jobName: string,
  ttlSeconds = 300,
): Promise<JobLease> {
  const holder = crypto.randomUUID();
  const acquired = await rpc<boolean>('try_acquire_job_lock', {
    p_job: jobName,
    p_holder: holder,
    p_ttl_seconds: ttlSeconds,
  });

  return {
    acquired: acquired === true,
    holder,
    release: async () => {
      if (acquired !== true) return;
      await rpc('release_job_lock', { p_job: jobName, p_holder: holder });
    },
  };
}

/**
 * 409 response for a run that lost the race. Not an error: the work is
 * already being done by the holder of the lease.
 */
export function lockBusyResponse(
  jobName: string,
  headers: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ skipped: true, reason: 'already_running', job: jobName }),
    { status: 409, headers },
  );
}
