import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runRequestGuard } from '../_shared/requestGuard.ts';
import { callAIWithTools, aiErrorResponse } from '../_shared/aiClient.ts';

const SYSTEM_PROMPT = `Classify each MTG card into ONE category by functional role (not card type).

Categories: Ramp, Removal, Draw, Lands, Creatures, Instants, Sorceries, Artifacts, Enchantments, Planeswalkers, Protection, Combo, Recursion, Utility, Finisher

Priority examples: Sol Ring→Ramp, Swords to Plowshares→Removal, Rhystic Study→Draw, Counterspell→Protection.

Return JSON: {cardName: category}. No explanation.`;

serve(async (req) => {
  const guard = await runRequestGuard(req, { rateLimit: 10, globalLimit: 200 });
  if (!guard.ok) return guard.response;
  const { corsHeaders, headers, apiKey } = guard.ctx;

  try {
    const { cards } = await req.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      return new Response(JSON.stringify({ error: 'cards array is required' }), { status: 400, headers });
    }
    if (cards.length > 100) {
      return new Response(JSON.stringify({ error: 'Max 100 cards per request' }), { status: 400, headers });
    }
    for (const name of cards) {
      if (typeof name === 'string' && name.length > 200) {
        return new Response(JSON.stringify({ error: 'Card name exceeds 200 character limit' }), { status: 400, headers });
      }
    }

    const parsed = await callAIWithTools<{ categories: Record<string, string> }>(
      apiKey,
      {
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Categorize these cards:\n${cards.join('\n')}` },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'categorize_cards',
            description: 'Return the category for each card',
            parameters: {
              type: 'object',
              properties: {
                categories: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                  description: 'Map of card name to category',
                },
              },
              required: ['categories'],
              additionalProperties: false,
            },
          },
        }],
        toolChoice: 'categorize_cards',
      },
    );

    return new Response(
      JSON.stringify({ categories: parsed.categories, success: true }),
      { headers },
    );
  } catch (e) {
    return aiErrorResponse(e, corsHeaders, 'AI categorization failed');
  }
});
