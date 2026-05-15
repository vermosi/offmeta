/**
 * admin-rpc-guard-tests
 *
 * Self-contained authorization test suite. Hits each admin-gated RPC as:
 *   1. anon (anon key, no JWT)
 *   2. authenticated non-admin (a freshly-created, pre-confirmed user)
 *
 * Both should be blocked — either by EXECUTE revoke (42501 permission denied)
 * or by the internal `public.has_role('admin')` guard ("admin role required").
 *
 * GET /admin-rpc-guard-tests -> JSON report. Non-200 if any check failed.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ADMIN_RPCS: Array<{ name: string; body: Record<string, unknown> }> = [
  { name: "get_system_status", body: {} },
  { name: "get_search_analytics", body: { since_date: new Date(Date.now() - 86_400_000).toISOString() } },
  { name: "get_ai_usage_stats", body: { days_back: 7 } },
  { name: "get_conversion_funnel", body: { days_back: 7 } },
];

type CheckResult = {
  rpc: string;
  caller: "anon" | "authenticated_non_admin";
  status: number;
  blocked: boolean;
  reason: string;
  body_excerpt: string;
};

async function callRpc(name: string, body: Record<string, unknown>, jwt: string): Promise<CheckResult> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const lower = text.toLowerCase();
  const isError = res.status >= 400;
  const matchesGuard =
    lower.includes("admin role required") || lower.includes("permission denied");
  return {
    rpc: name,
    caller: "anon",
    status: res.status,
    blocked: isError && matchesGuard,
    reason: !isError
      ? "non-error status — RPC executed without authorization"
      : matchesGuard
        ? "blocked"
        : `error but unexpected message: ${text.slice(0, 160)}`,
    body_excerpt: text.slice(0, 200),
  };
}

async function provisionNonAdminUser(): Promise<string | null> {
  const email = `guard-test-${crypto.randomUUID()}@example.com`;
  const password = `T3st!${crypto.randomUUID()}`;

  const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!adminRes.ok) {
    console.error("admin createUser failed", adminRes.status, await adminRes.text());
    return null;
  }
  await adminRes.text();

  const pwRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const pwJson = await pwRes.json();
  return pwJson?.access_token ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const results: CheckResult[] = [];

  // 1. anon
  for (const { name, body } of ADMIN_RPCS) {
    const r = await callRpc(name, body, ANON_KEY);
    results.push({ ...r, caller: "anon" });
  }

  // 2. authenticated non-admin
  const userJwt = await provisionNonAdminUser();
  if (!userJwt) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "could not provision non-admin user",
        anon_results: results,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  for (const { name, body } of ADMIN_RPCS) {
    const r = await callRpc(name, body, userJwt);
    results.push({ ...r, caller: "authenticated_non_admin" });
  }

  const allBlocked = results.every((r) => r.blocked);
  return new Response(
    JSON.stringify({
      ok: allBlocked,
      total: results.length,
      blocked: results.filter((r) => r.blocked).length,
      failures: results.filter((r) => !r.blocked),
      results,
    }, null, 2),
    {
      status: allBlocked ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
