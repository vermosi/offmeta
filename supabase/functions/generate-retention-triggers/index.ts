import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { validateEnv } from '../_shared/env.ts';
import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await validateAuth(req);
  if (!auth.authorized || (auth.role !== 'service' && auth.role !== 'api')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase.rpc('run_retention_trigger_jobs');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
