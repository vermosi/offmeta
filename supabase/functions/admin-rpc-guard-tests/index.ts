/**
 * admin-rpc-guard-tests
 *
 * Verifies the post-refactor admin authorization path:
 *
 *   1. Direct PostgREST hits to /rest/v1/rpc/<admin_fn> 404 because the
 *      functions live in the private `admin_api` schema, not `public`.
 *   2. The `admin-rpc` edge function rejects:
 *        - anon callers          → 401 Unauthorized
 *        - authenticated non-admins → 403 Forbidden
 *
 * GET/POST /admin-rpc-guard-tests → JSON report. Non-200 if any check fails.
 */
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ADMIN_FNS: Array<{ fn: string; args?: Record<string, unknown> }> = [
  { fn: 'get_system_status' },
  { fn: 'get_ai_usage_stats', args: { days_back: 7 } },
  { fn: 'get_conversion_funnel', args: { days_back: 7 } },
  { fn: 'get_search_analytics', args: { since_date: new Date(Date.now() - 86_400_000).toISOString() } },
];

type CheckResult = {
  check: string;
  caller: 'anon' | 'authenticated_non_admin' | 'unauthenticated';
  status: number;
  blocked: boolean;
  reason: string;
  body_excerpt: string;
};

async function callPostgrest(name: string, jwt: string): Promise<CheckResult> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  const text = await res.text();
  // Expect 404 (function not found in public schema) or any non-2xx.
  return {
    check: `postgrest:${name}`,
    caller: 'unauthenticated',
    status: res.status,
    blocked: res.status >= 400,
    reason: res.status >= 400 ? 'unreachable via PostgREST (expected)' : 'reachable — schema leak!',
    body_excerpt: text.slice(0, 200),
  };
}

async function callAdminRpc(
  fn: string,
  args: Record<string, unknown> | undefined,
  jwt: string,
  caller: CheckResult['caller'],
  expectedStatus: number,
): Promise<CheckResult> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-rpc`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fn, args }),
  });
  const text = await res.text();
  return {
    check: `admin-rpc:${fn}`,
    caller,
    status: res.status,
    blocked: res.status === expectedStatus,
    reason:
      res.status === expectedStatus
        ? `blocked with ${expectedStatus} (expected)`
        : `expected ${expectedStatus} but got ${res.status}`,
    body_excerpt: text.slice(0, 200),
  };
}

async function provisionNonAdminUser(): Promise<string | null> {
  const email = `guard-test-${crypto.randomUUID()}@example.com`;
  const password = `T3st!${crypto.randomUUID()}`;

  const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!adminRes.ok) {
    console.error('admin createUser failed', adminRes.status, await adminRes.text());
    return null;
  }
  await adminRes.text();

  const pwRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const pwJson = await pwRes.json();
  return pwJson?.access_token ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const results: CheckResult[] = [];

  // 1. PostgREST direct hits should 404 (schema not exposed).
  for (const { fn } of ADMIN_FNS) {
    results.push(await callPostgrest(fn, ANON_KEY));
  }

  // 2. admin-rpc with anon key → 401
  for (const { fn, args } of ADMIN_FNS) {
    results.push(await callAdminRpc(fn, args, ANON_KEY, 'anon', 401));
  }

  // 3. admin-rpc with authenticated non-admin → 403
  const userJwt = await provisionNonAdminUser();
  if (!userJwt) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'could not provision non-admin user',
        partial_results: results,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
  for (const { fn, args } of ADMIN_FNS) {
    results.push(await callAdminRpc(fn, args, userJwt, 'authenticated_non_admin', 403));
  }

  const allBlocked = results.every((r) => r.blocked);
  return new Response(
    JSON.stringify(
      {
        ok: allBlocked,
        total: results.length,
        blocked: results.filter((r) => r.blocked).length,
        failures: results.filter((r) => !r.blocked),
        results,
      },
      null,
      2,
    ),
    {
      status: allBlocked ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
