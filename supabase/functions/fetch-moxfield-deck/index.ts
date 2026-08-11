/**
 * Fetch Moxfield Deck Edge Function
 *
 * Resolves a public Moxfield deck URL (or bare public id) into a normalized
 * decklist that the Combo Finder can send to Commander Spellbook.
 *
 * POST { url: string } →
 *   { success, deckName, format, commanders: string[], cards: string[], colorIdentity: string[] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { validateAuth, getCorsHeaders, logAuthFailure } from '../_shared/auth.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';
import { rateLimitedResponse } from '../_shared/rateLimitTelemetry.ts';
import { withLogging } from '../_shared/logger.ts';
import { createClient } from '../_shared/supabaseAdminClient.ts';


const MOXFIELD_API = 'https://api2.moxfield.com/v3/decks/all'; // v3 public deck endpoint
const USER_AGENT = 'OffMeta/1.0 (+https://offmeta.app)';
const FETCH_TIMEOUT_MS = 15000;
const MAX_CARDS = 200;
const PUBLIC_ID_RE = /^[A-Za-z0-9_-]{5,40}$/;

interface MoxfieldCardEntry {
  quantity?: number;
  card?: { name?: string; color_identity?: string[] };
}

interface MoxfieldBoard {
  cards?: Record<string, MoxfieldCardEntry>;
}

interface MoxfieldDeck {
  name?: string;
  format?: string;
  boards?: Record<string, MoxfieldBoard>;
}

/** Extract the Moxfield public id from a full URL or a bare id. */
export function extractPublicId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 300) return null;
  if (PUBLIC_ID_RE.test(trimmed) && !trimmed.includes('.')) return trimmed;
  const match = trimmed.match(
    /^https?:\/\/(?:www\.)?moxfield\.com\/decks\/([A-Za-z0-9_-]{5,40})/i,
  );
  return match ? match[1] : null;
}

function boardNames(deck: MoxfieldDeck, board: string): string[] {
  const cards = deck.boards?.[board]?.cards ?? {};
  const names: string[] = [];
  for (const entry of Object.values(cards)) {
    const name = entry?.card?.name;
    if (typeof name === 'string' && name.trim()) names.push(name.trim());
  }
  return names;
}

function colorIdentityOf(deck: MoxfieldDeck): string[] {
  const identity = new Set<string>();
  for (const board of ['commanders', 'mainboard']) {
    const cards = deck.boards?.[board]?.cards ?? {};
    for (const entry of Object.values(cards)) {
      for (const c of entry?.card?.color_identity ?? []) identity.add(c);
    }
  }
  return ['W', 'U', 'B', 'R', 'G'].filter((c) => identity.has(c));
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function json(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

serve(withLogging('fetch-moxfield-deck', async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authResult = await validateAuth(req);
  if (!authResult.authorized) {
    await logAuthFailure(
      req,
      authResult.error || 'Unauthorized',
      'fetch-moxfield-deck',
    );
    return json({ error: authResult.error || 'Unauthorized' }, 401, corsHeaders);
  }

  maybeCleanup();
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  // Pass an explicit admin client: the shared lazy loader can fail to resolve
  // its module in the edge runtime, which would reject every request.
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const limiterClient =
    supabaseUrl && serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : undefined;
  const rateCheck = await checkRateLimit(clientIp, limiterClient, 10, 200, 60000, {
    failOpen: true,
  });

  if (!rateCheck.allowed) {
    return rateLimitedResponse(
      'fetch-moxfield-deck',
      req,
      `ip:${clientIp}`,
      rateCheck,
      corsHeaders,
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const publicId = extractPublicId(String(body?.url ?? ''));
    if (!publicId) {
      return json(
        { error: 'Enter a valid Moxfield deck URL (moxfield.com/decks/...)' },
        400,
        corsHeaders,
      );
    }

    const resp = await fetchWithTimeout(`${MOXFIELD_API}/${publicId}`);
    if (resp.status === 404) {
      return json(
        { error: 'Deck not found. Make sure the deck is public.' },
        404,
        corsHeaders,
      );
    }
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Moxfield API error ${resp.status}: ${text.slice(0, 300)}`);
      return json(
        { error: `Moxfield API error (${resp.status})`, status: resp.status },
        502,
        corsHeaders,
      );
    }

    const deck = (await resp.json()) as MoxfieldDeck;
    const commanders = boardNames(deck, 'commanders').slice(0, 5);
    const cards = [
      ...boardNames(deck, 'mainboard'),
      ...boardNames(deck, 'companions'),
    ].slice(0, MAX_CARDS);

    if (cards.length === 0 && commanders.length === 0) {
      return json({ error: 'That deck has no cards to analyze.' }, 422, corsHeaders);
    }

    return json(
      {
        success: true,
        deckName: deck.name ?? 'Moxfield deck',
        format: deck.format ?? null,
        commanders,
        cards,
        colorIdentity: colorIdentityOf(deck),
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error('fetch-moxfield-deck failed:', err);
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return json(
      { error: aborted ? 'Moxfield request timed out' : 'Failed to import deck' },
      aborted ? 504 : 500,
      corsHeaders,
    );
  }
}));
