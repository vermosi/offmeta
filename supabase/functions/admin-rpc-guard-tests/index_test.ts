/**
 * End-to-end guard test: non-admin signed-in users must receive 403 from
 * every admin edge endpoint.
 *
 * Implementation note:
 *   The guard-tests edge function (`admin-rpc-guard-tests`) provisions a
 *   throw-away non-admin user via the auth admin API (it has access to
 *   the service-role secret in the edge runtime), then exercises every
 *   admin edge endpoint with that user's JWT and reports the result.
 *
 *   This Deno test simply invokes that edge function and asserts:
 *     - HTTP 200 (every check passed)
 *     - Every `admin-rpc:*` check for the `authenticated_non_admin`
 *       caller returned exactly 403.
 *
 *   Driving the flow through the deployed edge function avoids requiring
 *   the service-role key in the local test environment while still
 *   exercising the live endpoints end-to-end.
 *
 * Run via: tested with Deno's built-in runner using --allow-net --allow-env.
 */
import { loadSync } from 'https://deno.land/std@0.224.0/dotenv/mod.ts';
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

try {
  loadSync({ export: true, allowEmptyValues: true, examplePath: null });
} catch {
  // Env may already be populated by the runner; ignore loader failures.
}

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')!;
const ANON_KEY =
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;

type CheckResult = {
  check: string;
  caller: string;
  status: number;
  blocked: boolean;
  reason: string;
};

type GuardReport = {
  ok: boolean;
  total: number;
  blocked: number;
  failures: CheckResult[];
  results: CheckResult[];
};

Deno.test(
  'non-admin signed-in users get 403 from every admin edge endpoint',
  async () => {
    assert(SUPABASE_URL, 'VITE_SUPABASE_URL must be set');
    assert(ANON_KEY, 'VITE_SUPABASE_PUBLISHABLE_KEY must be set');

    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-rpc-guard-tests`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
    const body = (await res.json()) as GuardReport;

    assertEquals(
      res.status,
      200,
      `guard-tests returned ${res.status}: ${JSON.stringify(body.failures ?? body).slice(0, 400)}`,
    );
    assertEquals(body.ok, true, `guard-tests reported failures: ${JSON.stringify(body.failures)}`);

    // Defense-in-depth: explicitly verify the authenticated_non_admin
    // checks. Every admin-rpc:* call from that caller must be 403.
    const nonAdminChecks = body.results.filter(
      (r) => r.caller === 'authenticated_non_admin' && r.check.startsWith('admin-rpc:'),
    );
    assert(
      nonAdminChecks.length > 0,
      'expected at least one authenticated_non_admin admin-rpc check in the report',
    );
    for (const c of nonAdminChecks) {
      assertEquals(
        c.status,
        403,
        `${c.check} expected 403 for non-admin caller, got ${c.status} (${c.reason})`,
      );
    }
  },
);
