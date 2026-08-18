/**
 * card-recommendations — Returns cards commonly played alongside a given card.
 * Powered by the card_cooccurrence table.
 * Public endpoint with rate-limit-friendly design.
 * @module functions/card-recommendations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('card-recommendations');

serve(
  withLogging(
    'card-recommendations',
    async (req: Request): Promise<Response> => {
      const corsHeaders = getCorsHeaders(req);
      const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // Public but requires at least anon auth
      const authResult = await validateAuth(req);
      if (!authResult.authorized) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers,
        });
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      if (!supabaseUrl || !serviceRoleKey) {
        return new Response(JSON.stringify({ error: 'Not configured' }), {
          status: 500,
          headers,
        });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey);

      try {
        const body = await req.json().catch(() => ({}));
        const oracleId = body.oracle_id;
        const format = body.format ?? 'all';
        const limit = Math.min(body.limit ?? 20, 50);
        const relationshipType =
          typeof body.relationship_type === 'string'
            ? body.relationship_type
            : null;

        if (!oracleId || typeof oracleId !== 'string') {
          return new Response(
            JSON.stringify({ error: 'oracle_id is required' }),
            { status: 400, headers },
          );
        }

        // The RPC has no relationship_type parameter — it returns the column,
        // so over-fetch and filter here when a type is requested.
        const { data, error } = await supabase.rpc('get_card_recommendations', {
          target_oracle_id: oracleId,
          result_limit: relationshipType ? Math.min(limit * 3, 150) : limit,
          target_format: format,
        });

        if (error) {
          log.error('Recommendation RPC failed', error);
          throw error;
        }

        type Recommendation = { relationship_type: string | null };
        const rows = (data ?? []) as Recommendation[];
        const recommendations = relationshipType
          ? rows
              .filter((row) => row.relationship_type === relationshipType)
              .slice(0, limit)
          : rows;


        return new Response(
          JSON.stringify({
            success: true,
            oracle_id: oracleId,
            format,
            recommendations: data ?? [],
          }),
          { status: 200, headers },
        );
      } catch (e) {
        log.error('card-recommendations error', e);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
          status: 500,
          headers,
        });
      }
    },
  ),
);
