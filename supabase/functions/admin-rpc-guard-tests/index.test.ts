/**
 * Verifies that admin-gated RPCs reject non-admin callers (anon and
 * authenticated non-admin) with a Forbidden error sourced from the
 * internal `public.has_role('admin')` guard.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL =
  Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY =
  Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")
  ?? Deno.env.get("SUPABASE_ANON_KEY")
  ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const ADMIN_RPCS: Array<{ name: string; body: Record<string, unknown> }> = [
  { name: "get_system_status", body: {} },
  { name: "get_search_analytics", body: { since_date: new Date(Date.now() - 86_400_000).toISOString() } },
  { name: "get_ai_usage_stats", body: { days_back: 7 } },
  { name: "get_conversion_funnel", body: { days_back: 7 } },
];

const FORBIDDEN_MARKER = "admin role required";

async function callRpc(name: string, body: Record<string, unknown>, accessToken: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, text };
}

function assertForbidden(name: string, status: number, text: string) {
  // Either guard is acceptable:
  //  - PostgREST EXECUTE revoke -> 42501 "permission denied for function ..."
  //  - Internal has_role check  -> "Forbidden: admin role required"
  assert(
    status >= 400 && status < 600,
    `[${name}] expected error status, got ${status}. Body: ${text}`,
  );
  const lower = text.toLowerCase();
  assert(
    lower.includes(FORBIDDEN_MARKER) || lower.includes("permission denied"),
    `[${name}] expected forbidden/permission-denied response, got: ${text}`,
  );
}

Deno.test("admin RPCs reject anonymous (anon key, no JWT) callers", async () => {
  for (const { name, body } of ADMIN_RPCS) {
    const { status, text } = await callRpc(name, body, SUPABASE_ANON_KEY);
    assertForbidden(name, status, text);
  }
});

Deno.test("admin RPCs reject authenticated non-admin users", async () => {
  // Create a throwaway user. If sign-up isn't possible (confirmation required,
  // disabled, etc.) we skip — the anon-call test still covers the guard logic.
  const email = `guard-test-${crypto.randomUUID()}@example.com`;
  const password = `T3st!${crypto.randomUUID()}`;

  const SERVICE_ROLE_KEY =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SUPABASE_SECRET_KEYS");

  let accessToken: string | undefined;

  // Preferred path: service-role admin createUser (auto-confirms email).
  if (SERVICE_ROLE_KEY) {
    const adminRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    });
    await adminRes.text();

    const pwRes = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    const pwJson = await pwRes.json();
    accessToken = pwJson?.access_token;
  } else {
    // Fallback: ordinary signup (only works if email confirmation is disabled).
    const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const signUpJson = await signUpRes.json();
    accessToken = signUpJson?.access_token ?? signUpJson?.session?.access_token;
  }

  if (!accessToken) {
    console.warn(
      `[skip-auth-half] could not obtain a non-admin session. ` +
      `Anon-call test still validates the EXECUTE/has_role guard.`,
    );
    return;
  }

  // Sanity: the new user should NOT have admin role.
  const roleCheck = await fetch(
    `${SUPABASE_URL}/rest/v1/user_roles?role=eq.admin&select=user_id`,
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` },
    },
  );
  const roles = await roleCheck.json();
  assertEquals(Array.isArray(roles) && roles.length, 0, "new user must not have admin role");

  for (const { name, body } of ADMIN_RPCS) {
    const { status, text } = await callRpc(name, body, accessToken);
    assertForbidden(name, status, text);
  }
});
