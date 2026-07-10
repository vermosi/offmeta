/**
 * admin-rpc — service-role dispatcher for the `admin_api` schema.
 *
 * The four admin RPCs (system_status, search_analytics, ai_usage_stats,
 * conversion_funnel) live in a private `admin_api` schema that is not
 * exposed to PostgREST. This function is the only path to invoke them.
 *
 * Auth flow:
 *   1. Validate the caller's JWT (signing-keys system, in-code).
 *   2. Confirm the caller has the 'admin' role via public.has_role.
 *   3. Dispatch the whitelisted RPC against admin_api with the service role.
 *
 * Request:  POST { fn: string, args?: object }
 * Response: 200 { data: <rpc result> } | 401 | 403 | 400 | 500
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Whitelist: function name -> allowed arg keys. Anything outside this map
// (or with extra arg keys) is rejected before we hit the database.
const ALLOWED: Record<string, readonly string[]> = {
  get_system_status: [],
  get_ai_usage_stats: ['days_back'],
  get_conversion_funnel: ['days_back'],
  get_search_analytics: ['since_date', 'max_low_confidence'],
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  // --- 1. JWT validation ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }
  const token = authHeader.slice('Bearer '.length);

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  // --- 2. Admin role check (uses auth.uid() implicitly via user JWT) ---
  const { data: isAdmin, error: roleError } = await userClient.rpc('has_role', {
    _role: 'admin',
  });
  if (roleError) {
    console.error('[admin-rpc] has_role failed', roleError);
    return jsonResponse(500, { error: 'Authorization check failed' });
  }
  if (!isAdmin) return jsonResponse(403, { error: 'Forbidden: admin role required' });

  // --- 3. Parse + whitelist the dispatch ---
  let payload: { fn?: string; args?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' });
  }
  const fn = typeof payload.fn === 'string' ? payload.fn : '';
  const args = (payload.args && typeof payload.args === 'object' ? payload.args : {}) as Record<
    string,
    unknown
  >;

  if (!(fn in ALLOWED)) {
    return jsonResponse(400, { error: `Unknown function: ${fn}` });
  }
  const allowedKeys = ALLOWED[fn];
  const extraKeys = Object.keys(args).filter((k) => !allowedKeys.includes(k));
  if (extraKeys.length > 0) {
    return jsonResponse(400, { error: `Unexpected arg keys: ${extraKeys.join(', ')}` });
  }

  // --- 4. Service-role dispatch through public admin wrappers ---
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await adminClient.rpc(fn as never, args as never);
  if (error) {
    console.error(`[admin-rpc] ${fn} failed`, error);
    return jsonResponse(500, { error: error.message });
  }
  return jsonResponse(200, { data });
});
