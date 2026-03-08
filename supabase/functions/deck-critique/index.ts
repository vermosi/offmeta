import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authResult = await validateAuth(req);
  if (!authResult.authorized) {
    return new Response(
      JSON.stringify({ error: authResult.error || 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  maybeCleanup();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = await checkRateLimit(clientIp, undefined, 5, 200);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please slow down.', retryAfter }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } },
    );
  }

  try {
    const { commander, cards, color_identity, format } = await req.json();

    if (!Array.isArray(cards) || cards.length < 5) {
      return new Response(
        JSON.stringify({ error: 'At least 5 cards required for critique' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (cards.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Too many cards (max 200)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    for (const c of cards) {
      if (typeof c?.name === 'string' && c.name.length > 200) {
        return new Response(
          JSON.stringify({ error: 'Card name exceeds 200 character limit' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const colorStr = (color_identity || []).join('') || 'colorless';
    const cardList = cards
      .map((c: { name: string; category?: string; quantity?: number }) =>
        `${c.quantity && c.quantity > 1 ? c.quantity + 'x ' : ''}${c.name}${c.category ? ` [${c.category}]` : ''}`)
      .join('\n');

    const systemPrompt = `You are an expert Magic: The Gathering deck analyst and coach. Your job is to critically review a decklist and provide actionable feedback.

For each card you suggest CUTTING, explain why it underperforms or doesn't fit the strategy.
For each card you suggest ADDING, explain what gap it fills and why it's better than what's currently in the deck.

Be specific, honest, and constructive. Reference actual card interactions and strategy. Only suggest real Magic cards.
Focus on:
- Cards that don't align with the deck's strategy or commander synergy
- Suboptimal choices where strictly better options exist
- Mana curve problems
- Missing key categories (removal, ramp, draw, protection)
- Win condition density
- Color identity compliance (${colorStr})`;

    const userPrompt = `Critique this ${format || 'commander'} deck:
Commander: ${commander || 'None specified'}
Color Identity: ${colorStr}
Card count: ${cards.length}

Decklist:
${cardList}

Provide 3-5 cuts and 3-5 additions with reasoning.`;

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
        tools: [{
          type: 'function',
          function: {
            name: 'deck_critique',
            description: 'Return structured deck critique with cuts and additions',
            parameters: {
              type: 'object',
              properties: {
                summary: {
                  type: 'string',
                  description: 'Brief overall assessment of the deck (2-3 sentences)',
                },
                cuts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      card_name: { type: 'string', description: 'Exact name of the card to cut' },
                      reason: { type: 'string', description: 'Why this card should be cut (1-2 sentences)' },
                      severity: { type: 'string', enum: ['weak', 'underperforming', 'off-strategy'] },
                    },
                    required: ['card_name', 'reason', 'severity'],
                    additionalProperties: false,
                  },
                },
                additions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      card_name: { type: 'string', description: 'Exact name of the card to add' },
                      reason: { type: 'string', description: 'Why this card improves the deck (1-2 sentences)' },
                      replaces: { type: 'string', description: 'Which cut this would replace, if applicable' },
                      category: { type: 'string', description: 'Functional category: Ramp, Removal, Draw, Protection, Combo, Utility, Finisher, Recursion' },
                    },
                    required: ['card_name', 'reason', 'category'],
                    additionalProperties: false,
                  },
                },
                mana_curve_notes: {
                  type: 'string',
                  description: 'Brief note about mana curve health (1 sentence)',
                },
              },
              required: ['summary', 'cuts', 'additions'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'deck_critique' } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error('AI gateway error:', status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'AI critique failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: 'AI returned no critique' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ ...parsed, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('deck-critique error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
