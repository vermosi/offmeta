/**
 * deck-ideas — AI-powered deck concept generator.
 * @module functions/deck-ideas
 */

import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';
import { callAIWithTools, aiErrorResponse } from '../_shared/aiClient.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
};

const serve = (handler: (req: Request) => Promise<Response>) => {
  // @ts-expect-error: Deno.serve exists in Deno runtime
  Deno.serve(handler);
};

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
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers });
  }

  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers });
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
    const { query } = await req.json();

    if (!query || query.trim().length < 3) {
      return new Response(JSON.stringify({ success: false, error: 'Query too short' }), { status: 400, headers });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'AI service not configured' }), { status: 500, headers });
    }

    const args = await callAIWithTools<{
      archetype: string;
      strategy: string;
      key_cards: string[];
      synergy_pieces: string[];
      budget_options: string[];
    }>(LOVABLE_API_KEY, {
      model: 'google/gemini-2.5-flash',
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
      tools: [{
        type: 'function',
        function: {
          name: 'generate_deck_idea',
          description: 'Generate a structured deck concept.',
          parameters: {
            type: 'object',
            properties: {
              archetype: { type: 'string', description: 'Deck archetype name' },
              strategy: { type: 'string', description: '2-3 sentence strategy description' },
              key_cards: { type: 'array', items: { type: 'string' }, description: '6-8 key card names' },
              synergy_pieces: { type: 'array', items: { type: 'string' }, description: '4-6 synergy card names' },
              budget_options: { type: 'array', items: { type: 'string' }, description: '4-6 budget alternative card names' },
            },
            required: ['archetype', 'strategy', 'key_cards', 'synergy_pieces', 'budget_options'],
            additionalProperties: false,
          },
        },
      }],
      toolChoice: 'generate_deck_idea',
    });

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
    return aiErrorResponse(e, corsHeaders, 'Could not generate deck idea');
  }
});
