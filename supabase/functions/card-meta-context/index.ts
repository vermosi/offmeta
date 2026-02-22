/**
 * card-meta-context — AI-powered "Why This Card Is Played" rationale generator.
 * Uses Lovable AI (Gemini 3 Flash Preview) with tool calling for structured output.
 * Caches responses in query_cache to avoid repeat AI calls.
 * @module functions/card-meta-context
 */

import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
};

const serve = (handler: (req: Request) => Promise<Response>) => {
  // @ts-expect-error: Deno.serve exists in Deno runtime
  Deno.serve(handler);
};

interface MetaContextRequest {
  cardName: string;
  typeLine: string;
  oracleText?: string;
  colorIdentity?: string[];
  edhrecRank?: number;
  legalities?: Record<string, string>;
}

interface MetaContextResponse {
  success: boolean;
  rationale?: string;
  archetypes?: string[];
  cached?: boolean;
  error?: string;
}

/** Simple hash for cache key */
function hashCardName(name: string): string {
  const normalized = name.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `meta_${Math.abs(hash).toString(36)}`;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers },
    );
  }

  // Auth validation
  const auth = validateAuth(req);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers },
    );
  }

  // Rate limiting
  maybeCleanup();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateCheck = await checkRateLimit(ip, undefined, 15, 500);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ success: false, error: 'Rate limited', retryAfter: rateCheck.retryAfter }),
      { status: 429, headers },
    );
  }

  try {
    const body: MetaContextRequest = await req.json();
    const { cardName, typeLine, oracleText, colorIdentity, edhrecRank, legalities } = body;

    if (!cardName || !typeLine) {
      return new Response(
        JSON.stringify({ success: false, error: 'cardName and typeLine are required' }),
        { status: 400, headers },
      );
    }

    // Check cache first
    const cacheKey = hashCardName(cardName);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && serviceRoleKey) {
      try {
        // @ts-expect-error: Deno esm.sh import
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const { data: cached } = await supabase
          .from('query_cache')
          .select('scryfall_query, explanation')
          .eq('query_hash', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cached) {
          // Update hit count
          await supabase
            .from('query_cache')
            .update({ hit_count: cached.hit_count + 1, last_hit_at: new Date().toISOString() })
            .eq('query_hash', cacheKey);

          const explanation = typeof cached.explanation === 'string'
            ? JSON.parse(cached.explanation)
            : cached.explanation;

          return new Response(
            JSON.stringify({
              success: true,
              rationale: explanation.rationale || cached.scryfall_query,
              archetypes: explanation.archetypes || [],
              cached: true,
            } satisfies MetaContextResponse),
            { status: 200, headers },
          );
        }
      } catch (e) {
        console.warn('Cache lookup failed, generating fresh:', e);
      }
    }

    // Build prompt
    const colorStr = colorIdentity?.length ? colorIdentity.join('') : 'colorless';
    const rankStr = edhrecRank ? `EDHREC rank: ${edhrecRank}` : 'No EDHREC rank available';
    const legalFormats = legalities
      ? Object.entries(legalities)
          .filter(([, v]) => v === 'legal')
          .map(([k]) => k)
          .slice(0, 8)
          .join(', ')
      : 'unknown';

    const userPrompt = `Card: ${cardName}
Type: ${typeLine}
Colors: ${colorStr}
${rankStr}
Legal in: ${legalFormats}
Oracle text: ${oracleText || 'N/A'}

Explain why this card is played in competitive and casual Magic, what archetypes or strategies it supports, and any notable synergies.`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers },
      );
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You are a Magic: The Gathering strategy expert. Given a card\'s details, explain in 2-3 concise sentences why this card is played, what archetypes or strategies it supports, and any notable synergies. Be specific and practical. Do not invent card names or rules.',
          },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'provide_meta_context',
              description: 'Provide a strategic rationale for why a Magic card is played, along with matching archetype tags.',
              parameters: {
                type: 'object',
                properties: {
                  rationale: {
                    type: 'string',
                    description: '2-3 concise sentences explaining why this card is played, its strategic role, and key synergies.',
                  },
                  archetypes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of 1-4 archetype tags this card fits (e.g., "Aristocrats", "Tokens", "Reanimator", "Control").',
                  },
                },
                required: ['rationale', 'archetypes'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'provide_meta_context' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errText = await aiResponse.text();
      console.error('AI gateway error:', status, errText);

      if (status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI rate limited, please try again later' }),
          { status: 429, headers },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits exhausted' }),
          { status: 402, headers },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'AI service unavailable' }),
        { status: 502, headers },
      );
    }

    const aiData = await aiResponse.json();

    let rationale = '';
    let archetypes: string[] = [];

    // Parse tool call response
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        rationale = args.rationale || '';
        archetypes = args.archetypes || [];
      } catch {
        console.warn('Failed to parse tool call arguments');
      }
    }

    // Fallback: parse from content
    if (!rationale && aiData.choices?.[0]?.message?.content) {
      rationale = aiData.choices[0].message.content;
    }

    if (!rationale) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not generate rationale' }),
        { status: 500, headers },
      );
    }

    // Cache the result (7 days)
    if (supabaseUrl && serviceRoleKey) {
      try {
        // @ts-expect-error: Deno esm.sh import
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('query_cache').upsert(
          {
            query_hash: cacheKey,
            normalized_query: cardName.toLowerCase().trim(),
            scryfall_query: rationale,
            explanation: { rationale, archetypes },
            confidence: 0.9,
            expires_at: expiresAt,
          },
          { onConflict: 'query_hash' },
        );
      } catch (e) {
        console.warn('Cache write failed:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        rationale,
        archetypes,
        cached: false,
      } satisfies MetaContextResponse),
      { status: 200, headers },
    );
  } catch (e) {
    console.error('card-meta-context error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers },
    );
  }
});
