/**
 * deck-ideas — AI-powered deck concept generator.
 * @module functions/deck-ideas
 */

import { runRequestGuard } from '../_shared/requestGuard.ts';
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
  const guard = await runRequestGuard(req, { method: 'POST', rateLimit: 10, globalLimit: 300 });
  if (!guard.ok) return guard.response;
  const { corsHeaders, headers, apiKey } = guard.ctx;

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 3) {
      return new Response(JSON.stringify({ success: false, error: 'Query too short' }), { status: 400, headers });
    }

    const args = await callAIWithTools<{
      archetype: string;
      strategy: string;
      key_cards: string[];
      synergy_pieces: string[];
      budget_options: string[];
    }>(apiKey, {
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
