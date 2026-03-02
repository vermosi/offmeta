/**
 * Combo Search Edge Function
 *
 * Proxies Commander Spellbook API to find combos involving specific cards
 * or combos available in a given decklist.
 *
 * Endpoints:
 *   POST { action: "card", cardName: string }           → combos for a single card
 *   POST { action: "deck", commanders: string[], cards: string[] } → find-my-combos
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { validateAuth, getCorsHeaders } from '../_shared/auth.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';

const SPELLBOOK_BASE = 'https://backend.commanderspellbook.com';
const FETCH_TIMEOUT_MS = 15000;
const MAX_CARD_COMBOS = 25;
const MAX_DECK_CARDS = 200;

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

interface ComboCard {
  name: string;
  imageUrl?: string;
  typeLine?: string;
}

interface ComboResult {
  id: string;
  cards: ComboCard[];
  description: string;
  prerequisites: string;
  produces: string[];
  identity: string;
  popularity: number;
  prices?: {
    tcgplayer?: string;
    cardmarket?: string;
    cardkingdom?: string;
  };
  legalities?: Record<string, boolean>;
}

function parseVariant(variant: Record<string, unknown>): ComboResult {
  const uses = (variant.uses as Array<Record<string, unknown>>) || [];
  const cards: ComboCard[] = uses.map((u) => {
    const card = u.card as Record<string, unknown> | undefined;
    return {
      name: (card?.name as string) || 'Unknown',
      imageUrl:
        (card?.imageUriFrontNormal as string) ||
        (card?.imageUriFrontSmall as string) ||
        undefined,
      typeLine: (card?.typeLine as string) || undefined,
    };
  });

  // Also include template requirements as placeholder cards
  const requires = (variant.requires as Array<Record<string, unknown>>) || [];
  for (const req of requires) {
    const template = req.template as Record<string, unknown> | undefined;
    if (template?.name) {
      cards.push({
        name: `[Any] ${template.name as string}`,
        typeLine: 'Template requirement',
      });
    }
  }

  const produces = (variant.produces as Array<Record<string, unknown>>) || [];
  const produceNames = produces.map(
    (p) =>
      ((p.feature as Record<string, unknown>)?.name as string) || 'Unknown',
  );

  const easyPrereqs = (variant.easyPrerequisites as string) || '';
  const notablePrereqs = (variant.notablePrerequisites as string) || '';
  const prereqParts = [easyPrereqs, notablePrereqs].filter(Boolean);

  return {
    id: variant.id as string,
    cards,
    description: (variant.description as string) || '',
    prerequisites: prereqParts.join('\n'),
    produces: produceNames,
    identity: (variant.identity as string) || '',
    popularity: (variant.popularity as number) || 0,
    prices: variant.prices as ComboResult['prices'],
    legalities: variant.legalities as Record<string, boolean>,
  };
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

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

  // Rate limiting: 20 requests per minute per IP (no AI cost, but external API)
  maybeCleanup();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = await checkRateLimit(clientIp, undefined, 20, 500);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.', retryAfter }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
    });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    // ── Card combo lookup ──
    if (action === 'card') {
      const cardName = (body.cardName as string)?.trim();
      if (!cardName || cardName.length > 200) {
        return json({ error: 'Invalid cardName' }, 400, corsHeaders);
      }

      const q = encodeURIComponent(`card:"${cardName}"`);
      const url = `${SPELLBOOK_BASE}/variants?q=${q}&limit=${MAX_CARD_COMBOS}&ordering=-popularity`;

      const resp = await fetchWithTimeout(url, {
        headers: { Accept: 'application/json' },
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`Spellbook API error ${resp.status}:`, text);
        return json(
          { error: `Commander Spellbook API error (${resp.status})` },
          502,
          corsHeaders,
        );
      }

      const data = await resp.json();
      const results = ((data.results as Array<Record<string, unknown>>) || []).map(parseVariant);

      return json({
        success: true,
        cardName,
        combos: results,
        total: data.count ?? results.length,
      }, 200, corsHeaders);
    }

    // ── Find my combos (decklist) ──
    if (action === 'deck') {
      const commanders: string[] = (body.commanders || []).slice(0, 5);
      const cards: string[] = (body.cards || []).slice(0, MAX_DECK_CARDS);

      if (cards.length === 0 && commanders.length === 0) {
        return json({ error: 'Provide at least one commander or card' }, 400, corsHeaders);
      }

      const mainList = cards.map((name) => ({ card: name, quantity: 1 }));
      const commanderList = commanders.map((name) => ({ card: name, quantity: 1 }));

      const resp = await fetchWithTimeout(
        `${SPELLBOOK_BASE}/find-my-combos`,
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            main: mainList,
            commanders: commanderList,
          }),
        },
        25000,
      );

      if (!resp.ok) {
        const text = await resp.text();
        console.error(`Spellbook find-my-combos error ${resp.status}:`, text);
        return json(
          { error: `Commander Spellbook API error (${resp.status})` },
          502,
          corsHeaders,
        );
      }

      const data = await resp.json();
      const results = data.results || data;

      const included = ((results.included || []) as Array<Record<string, unknown>>).map(parseVariant);
      const almostIncluded = ((results.almostIncluded || []) as Array<Record<string, unknown>>)
        .slice(0, 15)
        .map(parseVariant);

      return json({
        success: true,
        identity: results.identity || '',
        included,
        almostIncluded,
        totalIncluded: included.length,
        totalAlmostIncluded:
          (results.almostIncluded as unknown[])?.length ?? 0,
      }, 200, corsHeaders);
    }

    return json({ error: 'Invalid action. Use "card" or "deck".' }, 400, corsHeaders);
  } catch (e) {
    console.error('combo-search error:', e);
    if (e instanceof DOMException && e.name === 'AbortError') {
      return json({ error: 'Commander Spellbook API timed out' }, 504, corsHeaders);
    }
    return json(
      {
        error:
          e instanceof Error ? e.message : 'Internal error',
      },
      500,
      corsHeaders,
    );
  }
});
