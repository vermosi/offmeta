/**
 * End-to-end guard tests: non-admin signed-in users must receive 403
 * from every admin edge endpoint.
 *
 * Endpoints under test:
 *   - POST /functions/v1/admin-rpc      (dispatcher for the admin_api schema)
 *   - GET  /functions/v1/admin-analytics (search analytics aggregator)
 *
 * Strategy:
 *   1. Provision a fresh non-admin user via the auth admin API (service role).
 *   2. Sign them in to obtain a real authenticated JWT.
 *   3. Hit each endpoint with that JWT and assert HTTP 403.
 *   4. Clean the user up regardless of pass/fail.
 *
 * Run: tested via Deno's built-in runner with --allow-net --allow-env.
 */
import { loadSync } from 'https://deno.land/std@0.224.0/dotenv/mod.ts';

// Load root .env without strict .env.example validation (test runner injects most vars).
try {
  loadSync({ export: true, allowEmptyValues: true, examplePath: null });
} catch {
  // Env may already be populated by the runner; ignore loader failures.
}
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL')!;
const ANON_KEY =
  Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type ProvisionedUser = { userId: string; jwt: string; email: string; password: string };

async function provisionNonAdminUser(): Promise<ProvisionedUser> {
  const email = `guard-e2e-${crypto.randomUUID()}@example.com`;
  const password = `T3st!${crypto.randomUUID()}`;

  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const createJson = await createRes.json();
  if (!createRes.ok || !createJson?.id) {
    throw new Error(`admin createUser failed: ${createRes.status} ${JSON.stringify(createJson)}`);
  }

  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenRes.ok || !tokenJson?.access_token) {
    throw new Error(`sign-in failed: ${tokenRes.status} ${JSON.stringify(tokenJson)}`);
  }

  return { userId: createJson.id, jwt: tokenJson.access_token, email, password };
}

async function deleteUser(userId: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  await res.text();
}

const ADMIN_RPC_FNS: Array<{ fn: string; args?: Record<string, unknown> }> = [
  { fn: 'get_system_status' },
  { fn: 'get_ai_usage_stats', args: { days_back: 7 } },
  { fn: 'get_conversion_funnel', args: { days_back: 7 } },
  {
    fn: 'get_search_analytics',
    args: { since_date: new Date(Date.now() - 86_400_000).toISOString() },
  },
];

Deno.test('non-admin signed-in users get 403 from every admin edge endpoint', async () => {
  const user = await provisionNonAdminUser();

  try {
    // 1. admin-rpc: every whitelisted dispatch must 403.
    for (const { fn, args } of ADMIN_RPC_FNS) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-rpc`, {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${user.jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fn, args }),
      });
      const body = await res.text();
      assertEquals(
        res.status,
        403,
        `admin-rpc:${fn} expected 403 for non-admin, got ${res.status}: ${body.slice(0, 200)}`,
      );
    }

    // 2. admin-analytics: GET must 403 for non-admin.
    const analyticsRes = await fetch(
      `${SUPABASE_URL}/functions/v1/admin-analytics?days=7`,
      {
        method: 'GET',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${user.jwt}`,
        },
      },
    );
    const analyticsBody = await analyticsRes.text();
    assertEquals(
      analyticsRes.status,
      403,
      `admin-analytics expected 403 for non-admin, got ${analyticsRes.status}: ${analyticsBody.slice(0, 200)}`,
    );
  } finally {
    await deleteUser(user.userId);
  }
});
