// admin-rpc — guarded dispatcher for the admin analytics RPCs.
// POST { fn, args? } -> 200 { data } | 400 | 401/403 | 500
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { requireAdminOrService } from '../_shared/auth.ts';
import { withLogging } from '../_shared/logger.ts';

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(withLogging('admin-rpc', async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const authCheck = await requireAdminOrService(req, corsHeaders);
  if (!authCheck.authorized) return authCheck.response;

  let payload: { fn?: string; args?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }
  const fn = typeof payload.fn === 'string' ? payload.fn : '';
  const args = (payload.args && typeof payload.args === 'object' ? payload.args : {}) as Record<string, unknown>;

  // Whitelist: fn -> allowed arg keys. Anything else is rejected before the DB.
  let allowedKeys: readonly string[];
  switch (fn) {
    case 'get_system_status':
      allowedKeys = [];
      break;
    case 'get_conversion_funnel':
      allowedKeys = ['days_back'];
      break;
    case 'get_search_analytics':
      allowedKeys = ['since_date', 'max_low_confidence'];
      break;
    default:
      return json(400, { error: `Unknown function: ${fn}` });
  }
  const extraKeys = Object.keys(args).filter((k) => !allowedKeys.includes(k));
  if (extraKeys.length > 0) {
    return json(400, { error: `Unexpected arg keys: ${extraKeys.join(', ')}` });
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await adminClient.rpc(fn as never, args as never);
  if (error) {
    console.error(`[admin-rpc] ${fn} failed`, error);
    return json(500, { error: error.message });
  }
  return json(200, { data });
}));
