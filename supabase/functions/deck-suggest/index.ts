import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require valid auth token
  const { authorized, error: authError } = validateAuth(req);
  if (!authorized) {
    return new Response(JSON.stringify({ error: authError || 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting: 10 AI requests per minute per IP
  maybeCleanup();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = await checkRateLimit(clientIp, undefined, 10, 200);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many AI requests. Please slow down.', retryAfter }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    });
  }

  try {
    const { commander, cards, color_identity, format } = await req.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      return new Response(JSON.stringify({ error: 'cards array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const colorStr = (color_identity || []).join('') || 'colorless';
    const cardList = cards.map((c: { name: string; category?: string }) =>
      `${c.name}${c.category ? ` [${c.category}]` : ''}`
    ).join(', ');

    const systemPrompt = `You are an expert Magic: The Gathering deck builder and strategist. Analyze a deck and suggest cards that would improve it.

For each suggestion, explain WHY it fits and what gap it fills. Focus on:
- Missing functional categories (not enough ramp, removal, draw, etc.)
- Synergy with the commander/strategy
- Mana curve gaps
- Color identity compliance

Return 5-8 suggestions, organized by what the deck needs most. Only suggest real Magic cards.
Use the provided tool to return structured suggestions.`;

    const userPrompt = `Deck Analysis:
- Commander: ${commander || 'None specified'}
- Format: ${format || 'commander'}
- Color Identity: ${colorStr}
- Current cards (${cards.length}): ${cardList}

What cards should be added to improve this deck?`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_cards',
              description: 'Return card suggestions organized by deck needs',
              parameters: {
                type: 'object',
                properties: {
                  suggestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        card_name: { type: 'string', description: 'Exact card name' },
                        reason: { type: 'string', description: 'Why this card fits (1-2 sentences)' },
                        category: { type: 'string', description: 'Functional category: Ramp, Removal, Draw, Protection, Combo, Utility, Finisher, Recursion' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                      },
                      required: ['card_name', 'reason', 'category', 'priority'],
                      additionalProperties: false,
                    },
                  },
                  analysis: {
                    type: 'string',
                    description: 'Brief overall deck analysis (1-2 sentences)',
                  },
                },
                required: ['suggestions', 'analysis'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_cards' } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error('AI gateway error:', status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'AI suggestion failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: 'AI returned no suggestions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ ...parsed, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('deck-suggest error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
