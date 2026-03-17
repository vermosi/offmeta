import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runRequestGuard } from '../_shared/requestGuard.ts';
import { callAIWithTools, aiErrorResponse } from '../_shared/aiClient.ts';

serve(async (req) => {
  const guard = await runRequestGuard(req, { rateLimit: 5, globalLimit: 200 });
  if (!guard.ok) return guard.response;
  const { corsHeaders, headers, apiKey } = guard.ctx;

  try {
    const { commander, cards, color_identity, format } = await req.json();

    if (!Array.isArray(cards) || cards.length < 5) {
      return new Response(JSON.stringify({ error: 'At least 5 cards required for critique' }), { status: 400, headers });
    }
    if (cards.length > 200) {
      return new Response(JSON.stringify({ error: 'Too many cards (max 200)' }), { status: 400, headers });
    }
    for (const c of cards) {
      if (typeof c?.name === 'string' && c.name.length > 200) {
        return new Response(JSON.stringify({ error: 'Card name exceeds 200 character limit' }), { status: 400, headers });
      }
    }

    const colorStr = (color_identity || []).join('') || 'colorless';
    const cardList = cards
      .map((c: { name: string; category?: string; quantity?: number }) =>
        `${c.quantity && c.quantity > 1 ? c.quantity + 'x ' : ''}${c.name}${c.category ? ` [${c.category}]` : ''}`)
      .join('\n');

    const parsed = await callAIWithTools(apiKey, {
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Expert MTG deck analyst. Critically review decklists with actionable cut/add suggestions. Reference real card interactions. Focus on: strategy alignment, strictly-better swaps, mana curve, missing categories (removal/ramp/draw/protection), win conditions. Color identity: ${colorStr}. Real cards only.`,
        },
        {
          role: 'user',
          content: `Critique this ${format || 'commander'} deck:\nCommander: ${commander || 'None specified'}\nColor Identity: ${colorStr}\nCard count: ${cards.length}\n\nDecklist:\n${cardList}\n\nProvide 3-5 cuts and 3-5 additions with reasoning.`,
        },
      ],
      tools: [{
        type: 'function',
        function: {
          name: 'deck_critique',
          description: 'Return structured deck critique with cuts and additions',
          parameters: {
            type: 'object',
            properties: {
              summary: { type: 'string', description: 'Brief overall assessment (2-3 sentences)' },
              cuts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    card_name: { type: 'string' },
                    reason: { type: 'string' },
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
                    card_name: { type: 'string' },
                    reason: { type: 'string' },
                    replaces: { type: 'string' },
                    category: { type: 'string' },
                  },
                  required: ['card_name', 'reason', 'category'],
                  additionalProperties: false,
                },
              },
              mana_curve_notes: { type: 'string' },
              confidence: { type: 'number' },
            },
            required: ['summary', 'cuts', 'additions', 'confidence'],
            additionalProperties: false,
          },
        },
      }],
      toolChoice: 'deck_critique',
    });

    return new Response(JSON.stringify({ ...parsed, success: true }), { headers });
  } catch (e) {
    return aiErrorResponse(e, corsHeaders, 'AI critique failed');
  }
});
