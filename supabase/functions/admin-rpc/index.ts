/**
 * admin-rpc — guarded dispatcher for the admin analytics RPCs.
 *
 * The admin dashboard calls through this function for server-verified access
 * control. The dispatcher allows either:
 *   1. a service-role bearer token, or
 *   2. an authenticated admin user.
 *
 * It then dispatches the whitelisted RPC name via the service-role client.
 * The underlying SQL currently lives behind public wrappers that re-check the
 * admin role and delegate to `admin_api`.
 *
 * Request:  POST { fn: string, args?: object }
 * Response: 200 { data: <rpc result> } | 401 | 403 | 400 | 500
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireAdminOrService } from '../_shared/auth.ts';
import { withLogging } from '../_shared/logger.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
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

Deno.serve(withLogging('admin-rpc', async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const authCheck = await requireAdminOrService(req, corsHeaders);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  // --- 2. Parse + whitelist the dispatch ---
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

  // --- 3. Service-role dispatch through public admin wrappers ---
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await adminClient.rpc(fn as never, args as never);
  if (error) {
    console.error(`[admin-rpc] ${fn} failed`, error);
    return jsonResponse(500, { error: error.message });
  }
  return jsonResponse(200, { data });
}));
