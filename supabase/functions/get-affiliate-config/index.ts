/**
 * Returns the affiliate base URL for TCGPlayer Impact links.
 * Reads from the NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE secret.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const affiliateBase = Deno.env.get('NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE') || '';

  return new Response(
    JSON.stringify({ tcgplayerAffiliateBase: affiliateBase }),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
});
