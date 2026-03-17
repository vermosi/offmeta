/**
 * deck-ideas — AI-powered deck concept generator.
 * Generates archetype, strategy, key cards, and budget options from natural language.
 * @module functions/deck-ideas
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

interface DeckIdeaRequest {
  query: string;
}

interface DeckIdeaResponse {
  success: boolean;
  archetype?: string;
  strategy?: string;
  keyCards?: string[];
  synergyPieces?: string[];
  budgetOptions?: string[];
  error?: string;
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

  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers },
    );
  }

  maybeCleanup();
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateCheck = await checkRateLimit(ip, undefined, 10, 300);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ success: false, error: 'Rate limited', retryAfter: rateCheck.retryAfter }),
      { status: 429, headers },
    );
  }

  try {
    const body: DeckIdeaRequest = await req.json();
    const { query } = body;

    if (!query || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query too short' }),
        { status: 400, headers },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers },
      );
    }

    const aiResponse = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
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
              content: 'Expert MTG deckbuilder. Generate structured deck ideas with archetype, strategy, 6-8 key cards, 4-6 synergy pieces, 4-6 budget alternatives. Real cards only. Default to Commander/EDH.',
            },
            {
              role: 'user',
              content: `Deck concept: ${query.trim().slice(0, 500)}`,
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'generate_deck_idea',
                description: 'Generate a structured deck concept.',
                parameters: {
                  type: 'object',
                  properties: {
                    archetype: { type: 'string', description: 'Deck archetype name (e.g., "Simic Landfall", "Orzhov Aristocrats")' },
                    strategy: { type: 'string', description: '2-3 sentence strategy description' },
                    key_cards: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '6-8 key card names for the deck',
                    },
                    synergy_pieces: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '4-6 synergy/support card names',
                    },
                    budget_options: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '4-6 budget-friendly alternative card names',
                    },
                  },
                  required: ['archetype', 'strategy', 'key_cards', 'synergy_pieces', 'budget_options'],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'generate_deck_idea' } },
        }),
      },
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      await aiResponse.text();

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
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not generate deck idea' }),
        { status: 500, headers },
      );
    }

    const args = typeof toolCall.function.arguments === 'string'
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    return new Response(
      JSON.stringify({
        success: true,
        archetype: args.archetype || '',
        strategy: args.strategy || '',
        keyCards: (args.key_cards || []).slice(0, 8),
        synergyPieces: (args.synergy_pieces || []).slice(0, 6),
        budgetOptions: (args.budget_options || []).slice(0, 6),
      } satisfies DeckIdeaResponse),
      { status: 200, headers },
    );
  } catch (e) {
    console.error('deck-ideas error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers },
    );
  }
});
