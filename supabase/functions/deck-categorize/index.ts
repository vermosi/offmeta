import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';


const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const SYSTEM_PROMPT = `You are a Magic: The Gathering card categorization expert. Given a list of card names, classify each into exactly ONE functional category.

Categories (use these exact names):
- Ramp: Cards that accelerate mana production (mana dorks, mana rocks, land ramp spells)
- Removal: Cards that destroy, exile, bounce, or neutralize permanents/spells
- Draw: Cards that draw cards or provide card advantage/selection
- Lands: Land cards
- Creatures: Creature cards that don't fit other functional categories
- Instants: Non-removal, non-draw instant spells
- Sorceries: Non-removal, non-draw, non-ramp sorcery spells
- Artifacts: Non-ramp artifact cards
- Enchantments: Enchantment cards that don't fit other categories
- Planeswalkers: Planeswalker cards
- Protection: Cards that protect your permanents or give hexproof/indestructible/counterspells
- Combo: Known combo pieces (e.g., Thassa's Oracle, Demonic Consultation)
- Recursion: Cards that return things from graveyard or provide recursion
- Utility: Cards that don't fit neatly elsewhere (tutors, utility creatures, etc.)
- Finisher: Win conditions, big threats, game-ending cards

Prioritize functional role over card type. For example:
- Sol Ring → Ramp (not Artifacts)
- Swords to Plowshares → Removal (not Instants)
- Rhystic Study → Draw (not Enchantments)
- Counterspell → Protection (not Instants)

Return ONLY a JSON object mapping card name to category. No explanation.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cards } = await req.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      return new Response(JSON.stringify({ error: 'cards array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (cards.length > 100) {
      return new Response(JSON.stringify({ error: 'Max 100 cards per request' }), {
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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Categorize these cards:\n${cards.join('\n')}` },
        ],
        tools: [
          {
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
          },
        ],
        tool_choice: { type: 'function', function: { name: 'categorize_cards' } },
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

      return new Response(JSON.stringify({ error: 'AI categorization failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: 'AI returned no categories' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ categories: parsed.categories, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('deck-categorize error:', e);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
