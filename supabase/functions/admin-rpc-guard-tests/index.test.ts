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
  // PostgREST surfaces RAISE EXCEPTION as 4xx/5xx with the message in the body.
  assert(
    status >= 400 && status < 600,
    `[${name}] expected error status, got ${status}. Body: ${text}`,
  );
  assert(
    text.toLowerCase().includes(FORBIDDEN_MARKER),
    `[${name}] expected body to mention "${FORBIDDEN_MARKER}", got: ${text}`,
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

  const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const signUpJson = await signUpRes.json();

  const accessToken: string | undefined = signUpJson?.access_token
    ?? signUpJson?.session?.access_token;

  if (!accessToken) {
    console.warn(
      `[skip] could not obtain non-admin session (status ${signUpRes.status}, body: ${JSON.stringify(signUpJson)}). ` +
      `Anon-call test still validates the has_role() guard.`,
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
