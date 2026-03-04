/**
 * card-similarity — Generates similar cards, budget alternatives, and AI synergy suggestions.
 * Uses Scryfall data for similarity matching + Lovable AI for synergy analysis.
 * @module functions/card-similarity
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

interface SimilarityRequest {
  cardName: string;
  typeLine: string;
  oracleText?: string;
  colorIdentity?: string[];
  keywords?: string[];
  cmc?: number;
  prices?: { usd?: string | null };
}

interface SynergyCard {
  name: string;
  reason: string;
}

interface SimilarityResponse {
  success: boolean;
  similarQuery?: string;
  budgetQuery?: string;
  synergyCards?: SynergyCard[];
  cached?: boolean;
  error?: string;
}

/** Extract key mechanical keywords from oracle text */
function extractMechanics(oracleText: string): string[] {
  const mechanics: string[] = [];
  const patterns: Array<[RegExp, string]> = [
    [/\bdraw\b/i, 'draw'],
    [/\bdestroy\b/i, 'destroy'],
    [/\bexile\b/i, 'exile'],
    [/\bcounter\b/i, 'counter'],
    [/\bsearch your library\b/i, 'tutor'],
    [/\breturn.*from.*graveyard\b/i, 'recursion'],
    [/\bcreate.*token/i, 'tokens'],
    [/\b\+1\/\+1 counter/i, '+1/+1 counters'],
    [/\bflying\b/i, 'flying'],
    [/\blifelink\b/i, 'lifelink'],
    [/\bdeathtouch\b/i, 'deathtouch'],
    [/\btrample\b/i, 'trample'],
    [/\bhaste\b/i, 'haste'],
    [/\bflash\b/i, 'flash'],
    [/\btap.*add\b/i, 'mana production'],
    [/\bmill\b/i, 'mill'],
    [/\bdiscard\b/i, 'discard'],
    [/\bsacrifice\b/i, 'sacrifice'],
    [/\bequip\b/i, 'equipment'],
    [/\benchant\b/i, 'enchantment'],
    [/\btransform\b/i, 'transform'],
    [/\benter(s|ed)? the battlefield\b/i, 'ETB'],
    [/\bwhen(ever)?.*dies\b/i, 'death trigger'],
    [/\bprotection from\b/i, 'protection'],
    [/\bindestructible\b/i, 'indestructible'],
    [/\bhexproof\b/i, 'hexproof'],
  ];

  for (const [regex, label] of patterns) {
    if (regex.test(oracleText)) {
      mechanics.push(label);
    }
  }
  return mechanics.slice(0, 6);
}

/** Build a Scryfall query for similar cards */
function buildSimilarQuery(card: SimilarityRequest): string {
  const parts: string[] = [];

  // Match by base type
  const baseType = card.typeLine
    .replace(/Legendary\s*/i, '')
    .replace(/—.*/i, '')
    .trim()
    .split(/\s+/)[0];
  if (baseType) {
    parts.push(`t:${baseType.toLowerCase()}`);
  }

  // Match by color identity
  if (card.colorIdentity?.length) {
    parts.push(`id<=${card.colorIdentity.join('').toUpperCase()}`);
  }

  // Match by similar mana value (±1)
  if (card.cmc !== undefined) {
    const lo = Math.max(0, card.cmc - 1);
    const hi = card.cmc + 1;
    parts.push(`mv>=${lo}`, `mv<=${hi}`);
  }

  // Exclude the card itself
  parts.push(`-!"${card.cardName}"`);

  // Keyword-based oracle text matching (pick most relevant 2)
  const mechanics = extractMechanics(card.oracleText || '');
  for (const mech of mechanics.slice(0, 2)) {
    if (mech === 'ETB') {
      parts.push('o:"enters the battlefield"');
    } else if (mech === 'death trigger') {
      parts.push('o:"when" o:"dies"');
    } else if (mech === 'tutor') {
      parts.push('o:"search your library"');
    } else {
      parts.push(`o:"${mech}"`);
    }
  }

  return parts.join(' ');
}

/** Build a Scryfall query for budget alternatives */
function buildBudgetQuery(card: SimilarityRequest): string {
  const parts: string[] = [];

  const baseType = card.typeLine
    .replace(/Legendary\s*/i, '')
    .replace(/—.*/i, '')
    .trim()
    .split(/\s+/)[0];
  if (baseType) {
    parts.push(`t:${baseType.toLowerCase()}`);
  }

  if (card.colorIdentity?.length) {
    parts.push(`id<=${card.colorIdentity.join('').toUpperCase()}`);
  }

  // Key mechanic matching
  const mechanics = extractMechanics(card.oracleText || '');
  if (mechanics.length > 0) {
    parts.push(`o:"${mechanics[0]}"`);
  }

  parts.push(`-!"${card.cardName}"`);

  // Price filter: under $2 or under half the card's price
  const cardPrice = parseFloat(card.prices?.usd || '0');
  const maxPrice = cardPrice > 0 ? Math.max(2, Math.floor(cardPrice * 0.5)) : 5;
  parts.push(`usd<${maxPrice}`);

  return parts.join(' ');
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
  const rateCheck = await checkRateLimit(ip, undefined, 15, 500);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ success: false, error: 'Rate limited', retryAfter: rateCheck.retryAfter }),
      { status: 429, headers },
    );
  }

  try {
    const body: SimilarityRequest = await req.json();
    const { cardName, typeLine } = body;

    if (!cardName || !typeLine) {
      return new Response(
        JSON.stringify({ success: false, error: 'cardName and typeLine are required' }),
        { status: 400, headers },
      );
    }

    // Build deterministic queries
    const similarQuery = buildSimilarQuery(body);
    const budgetQuery = buildBudgetQuery(body);

    // Generate synergy suggestions via AI
    let synergyCards: SynergyCard[] = [];
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch(
          'https://ai.gateway.lovable.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [
                {
                  role: 'system',
                  content: 'You are an MTG deckbuilding expert. Given a card, suggest 6 real cards that synergize well with it. Only suggest cards that actually exist in Magic: The Gathering. Focus on practical synergies for Commander/EDH format.',
                },
                {
                  role: 'user',
                  content: `Card: ${cardName}\nType: ${typeLine}\nOracle Text: ${body.oracleText || 'N/A'}\nColors: ${body.colorIdentity?.join('') || 'colorless'}\n\nSuggest 6 cards that synergize well with this card.`,
                },
              ],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'suggest_synergy_cards',
                    description: 'Suggest cards that synergize with the given card.',
                    parameters: {
                      type: 'object',
                      properties: {
                        cards: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              name: { type: 'string', description: 'Exact card name' },
                              reason: { type: 'string', description: 'One sentence explaining the synergy' },
                            },
                            required: ['name', 'reason'],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ['cards'],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: 'function', function: { name: 'suggest_synergy_cards' } },
            }),
          },
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const args = typeof toolCall.function.arguments === 'string'
              ? JSON.parse(toolCall.function.arguments)
              : toolCall.function.arguments;
            synergyCards = (args.cards || []).slice(0, 6);
          }
        } else {
          if (aiResponse.status === 429 || aiResponse.status === 402) {
            await aiResponse.text(); // consume body
          } else {
            await aiResponse.text();
          }
        }
      } catch (e) {
        console.warn('AI synergy generation failed, continuing without:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        similarQuery,
        budgetQuery,
        synergyCards,
        cached: false,
      } satisfies SimilarityResponse),
      { status: 200, headers },
    );
  } catch (e) {
    console.error('card-similarity error:', e);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers },
    );
  }
});
