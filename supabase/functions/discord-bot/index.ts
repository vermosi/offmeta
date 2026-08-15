/**
 * discord-bot — Discord Interactions webhook for the `/offmeta` slash command.
 *
 * This is the ONLY publicly reachable surface of the bot, and it is useless to
 * anyone but Discord: every request must carry a valid Ed25519 signature made
 * with the app's `DISCORD_PUBLIC_KEY`. The bot talks to OffMeta's search
 * pipeline server-to-server (service-role bearer, inside the platform), so no
 * OffMeta data endpoint is exposed to third parties.
 *
 * Flow:
 *   /offmeta <plain english query>
 *     → semantic-search (internal) → Scryfall → embed with interpreted query,
 *       up to 5 cards, and a link to the full results on offmeta.app
 *
 * @module functions/discord-bot
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';

const log = createLogger('discord-bot');

const SITE_URL = 'https://offmeta.app';
const MAX_QUERY_LENGTH = 300;
const MAX_CARDS = 5;

/** Per-user sliding-window limit: searches allowed per RATE_LIMIT_WINDOW_MS. */
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
/** Hard cap on tracked users so a flood can't grow memory unbounded. */
const RATE_LIMIT_MAX_USERS = 5_000;
/** Repeat clicks on the same results link by the same actor collapse into one. */
const CLICK_DEDUPE_WINDOW_MS = 30_000;
/** Hard cap on tracked click keys so a flood can't grow memory unbounded. */
const CLICK_DEDUPE_MAX_KEYS = 5_000;

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 } as const;
const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE: 4,
  DEFERRED_CHANNEL_MESSAGE: 5,
} as const;

/** Discord message flag: only the invoking user sees the reply. */
const EPHEMERAL = 1 << 6;

interface DiscordOption {
  name: string;
  value?: unknown;
}

interface DiscordInteraction {
  type: number;
  token?: string;
  application_id?: string;
  guild_id?: string;
  user?: { id?: string };
  member?: { user?: { id?: string } };
  data?: { name?: string; options?: DiscordOption[] };
}

/** In-memory sliding window. Resets on cold start — abuse brake, not billing. */
const rateBuckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Record an attempt for `userId` and report whether it is allowed.
 * Pure aside from the module-level bucket map; `now` is injectable for tests.
 */
export function checkRateLimit(userId: string, now = Date.now()): RateLimitResult {
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateBuckets.get(userId) ?? []).filter((ts) => ts > cutoff);

  if (recent.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(userId, recent);
    const oldest = recent[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000),
      ),
    };
  }

  recent.push(now);
  rateBuckets.set(userId, recent);

  if (rateBuckets.size > RATE_LIMIT_MAX_USERS) {
    for (const [key, stamps] of rateBuckets) {
      if (stamps.every((ts) => ts <= cutoff)) rateBuckets.delete(key);
      if (rateBuckets.size <= RATE_LIMIT_MAX_USERS) break;
    }
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Discord user id for the interaction (guild member or DM user). */
export function extractUserId(interaction: DiscordInteraction): string {
  return interaction.member?.user?.id ?? interaction.user?.id ?? '';
}


function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Verify Discord's Ed25519 request signature. Fails closed. */
export async function verifyDiscordSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
  publicKeyHex: string | undefined,
): Promise<boolean> {
  if (!signature || !timestamp || !publicKeyHex) return false;
  if (!/^[0-9a-f]+$/i.test(signature) || signature.length !== 128) return false;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKeyHex),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + rawBody),
    );
  } catch {
    return false;
  }
}

/** Pull the free-text query out of the slash-command options. */
export function extractQuery(interaction: DiscordInteraction): string {
  const option = interaction.data?.options?.find(
    (opt) => opt.name === 'query' || opt.name === 'search',
  );
  const raw = typeof option?.value === 'string' ? option.value : '';
  const stripped = Array.from(raw)
    .map((char) => (char.charCodeAt(0) < 0x20 ? ' ' : char))
    .join('');
  return stripped.trim().slice(0, MAX_QUERY_LENGTH);
}

/**
 * Public results link. Carries UTM params so click-throughs from Discord are
 * attributed by the site's existing UTM/conversion tracking.
 */
export function buildResultsUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    utm_source: 'discord',
    utm_medium: 'bot',
    utm_campaign: 'offmeta_slash_command',
  });
  return `${SITE_URL}/?${params.toString()}`;
}

/**
 * HMAC signature over a tracked-click payload. Signed with a server-only
 * secret so nobody can forge click rows for an arbitrary actor.
 */
export async function signClick(
  payload: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  return Array.from(new Uint8Array(sig).slice(0, 16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Canonical payload string signed for a tracked click. */
export function clickPayload(
  query: string,
  actorHash: string,
  guildId: string,
): string {
  return `${query}|${actorHash}|${guildId}`;
}

/**
 * Click-tracked wrapper around the results link. Points at this function's
 * public GET route, which records the click and 302s to `buildResultsUrl`.
 * Falls back to the direct link when the function URL/secret is unavailable.
 */
export async function buildTrackedResultsUrl(
  query: string,
  actorHash: string,
  guildId: string,
  functionUrl?: string,
  secret?: string,
): Promise<string> {
  if (!functionUrl || !secret) return buildResultsUrl(query);
  const params = new URLSearchParams({
    q: query,
    a: actorHash,
    g: guildId,
    s: await signClick(clickPayload(query, actorHash, guildId), secret),
  });
  return `${functionUrl}?${params.toString()}`;
}

/** Pseudonymous, stable id for a Discord user — never store the raw id. */
export async function hashActor(userId: string): Promise<string> {
  if (!userId) return '';
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`discord:${userId}`),
  );
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface DiscordAnalyticsEvent {
  query: string;
  scryfallQuery: string;
  outcome: SearchOutcome;
  cardCount: number;
  totalCards: number;
  actorHash: string;
  guildId?: string;
  durationMs: number;
  rateLimited?: boolean;
}

/** Build the analytics_events row for a bot request. */
export function buildAnalyticsRow(event: DiscordAnalyticsEvent) {
  return {
    event_type: 'discord_search',
    session_id: event.actorHash ? `discord:${event.actorHash}` : null,
    event_data: {
      source: 'discord_bot',
      query: event.query.slice(0, MAX_QUERY_LENGTH),
      scryfall_query: event.scryfallQuery.slice(0, 500),
      outcome: event.outcome,
      card_count: event.cardCount,
      total_cards: event.totalCards,
      results_url: buildResultsUrl(event.query),
      guild_id: event.guildId ?? null,
      duration_ms: event.durationMs,
      rate_limited: event.rateLimited ?? false,
    },
  };
}

export interface DiscordClickEvent {
  query: string;
  actorHash: string;
  guildId: string;
}

/** Build the analytics_events row for an outbound results-link click. */
export function buildClickRow(event: DiscordClickEvent) {
  return {
    event_type: 'discord_click',
    session_id: event.actorHash ? `discord:${event.actorHash}` : null,
    event_data: {
      source: 'discord_bot',
      query: event.query.slice(0, MAX_QUERY_LENGTH),
      destination: buildResultsUrl(event.query),
      guild_id: event.guildId || null,
    },
  };
}

/** Best-effort analytics write. Never blocks or fails the interaction. */
async function insertAnalyticsRow(row: unknown): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      log.error('analytics_write_failed', { status: response.status });
    }
  } catch (error) {
    log.error('analytics_write_error', {
      message: error instanceof Error ? error.message : 'unknown',
    });
  }
}

/** Record a search interaction. */
function recordAnalytics(event: DiscordAnalyticsEvent): Promise<void> {
  return insertAnalyticsRow(buildAnalyticsRow(event));
}

/** Record an outbound results-link click, tied to the same actor hash. */
function recordClick(event: DiscordClickEvent): Promise<void> {
  return insertAnalyticsRow(buildClickRow(event));
}

/**
 * In-memory click dedupe: last recorded timestamp per actor+destination.
 * Resets on cold start — a noise brake, not an exactness guarantee.
 */
const clickDedupe = new Map<string, number>();

/** Stable dedupe key for one actor clicking one results URL. */
export function clickDedupeKey(event: DiscordClickEvent): string {
  return `${event.actorHash || 'anon'}|${buildResultsUrl(event.query)}`;
}

/**
 * Report whether this click should be recorded, marking it as seen when it is.
 * `now` is injectable for tests.
 */
export function shouldRecordClick(
  event: DiscordClickEvent,
  now = Date.now(),
): boolean {
  const key = clickDedupeKey(event);
  const cutoff = now - CLICK_DEDUPE_WINDOW_MS;
  const last = clickDedupe.get(key);

  if (last !== undefined && last > cutoff) return false;

  clickDedupe.set(key, now);

  if (clickDedupe.size > CLICK_DEDUPE_MAX_KEYS) {
    for (const [existing, ts] of clickDedupe) {
      if (ts <= cutoff) clickDedupe.delete(existing);
      if (clickDedupe.size <= CLICK_DEDUPE_MAX_KEYS) break;
    }
  }

  return true;
}


interface CardSummary {
  name: string;
  typeLine: string;
  manaCost: string;
  scryfallUri: string;
  imageUrl?: string;
}

/** Format the Discord embed payload for a completed search. */
export function buildEmbed(
  query: string,
  scryfallQuery: string,
  cards: CardSummary[],
  totalCards: number,
  outcome: SearchOutcome = cards.length > 0 ? 'ok' : 'no_results',
  /** Click-tracked link; defaults to the plain results URL. */
  resultsUrl: string = buildResultsUrl(query),
): Record<string, unknown> {
  const lines = cards.map(
    (card) =>
      `**[${card.name}](${card.scryfallUri})** ${card.manaCost}\n${card.typeLine}`,
  );
  const failed =
    outcome === 'search_unavailable' || outcome === 'card_data_unavailable';

  return {
    title: query.slice(0, 250),
    ...(failed ? {} : { url: resultsUrl }),
    description:
      lines.length > 0 ? lines.join('\n\n') : outcomeMessage(outcome, query),
    color: failed ? 0x8b2f3a : 0x1c1b22,
    ...(scryfallQuery
      ? {
          fields: [
            {
              name: 'Interpreted as',
              value: `\`${scryfallQuery.slice(0, 900)}\``,
            },
          ],
        }
      : {}),
    footer: {
      text:
        totalCards > cards.length
          ? `${totalCards} results — full list on offmeta.app`
          : 'offmeta.app',
    },
    ...(cards[0]?.imageUrl ? { thumbnail: { url: cards[0].imageUrl } } : {}),
  };
}


function summarize(card: Record<string, unknown>): CardSummary {
  const faces = card.card_faces as
    | Array<{ image_uris?: { normal?: string }; mana_cost?: string }>
    | undefined;
  const imageUris = card.image_uris as { normal?: string } | undefined;
  return {
    name: String(card.name ?? 'Unknown'),
    typeLine: String(card.type_line ?? ''),
    manaCost: String(card.mana_cost ?? faces?.[0]?.mana_cost ?? ''),
    scryfallUri: String(card.scryfall_uri ?? SITE_URL),
    imageUrl: imageUris?.normal ?? faces?.[0]?.image_uris?.normal,
  };
}

/**
 * Outcome of a search attempt. Only user-facing states — never leaks which
 * internal service failed or any endpoint/URL.
 */
export type SearchOutcome =
  | 'ok'
  | 'no_results'
  | 'not_understood'
  | 'search_unavailable'
  | 'card_data_unavailable';

export interface SearchResultPayload {
  outcome: SearchOutcome;
  scryfallQuery: string;
  cards: CardSummary[];
  totalCards: number;
}

/** Human-readable message for every non-success outcome. */
export function outcomeMessage(outcome: SearchOutcome, query: string): string {
  switch (outcome) {
    case 'no_results':
      return `No paper cards matched **${query.slice(0, 120)}**. Try fewer constraints or different wording — e.g. drop a colour or a price limit.`;
    case 'not_understood':
      return `OffMeta could not turn **${query.slice(0, 120)}** into a card search. Try describing what the card *does*, like "creatures that make treasure".`;
    case 'search_unavailable':
      return 'OffMeta search is temporarily unavailable. Please try again in a minute.';
    case 'card_data_unavailable':
      return 'Card data is temporarily unavailable. Please try again in a minute.';
    default:
      return '';
  }
}

/** Translate + execute the search using OffMeta's internal pipeline. */
async function runSearch(query: string): Promise<SearchResultPayload> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const empty = { scryfallQuery: '', cards: [], totalCards: 0 };
  if (!supabaseUrl || !serviceRoleKey) {
    log.error('not_configured', {});
    return { outcome: 'search_unavailable', ...empty };
  }

  let translated: { scryfallQuery?: string } = {};
  try {
    const translateResponse = await fetch(
      `${supabaseUrl}/functions/v1/semantic-search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, useCache: true }),
      },
    );
    if (!translateResponse.ok) {
      log.error('translate_failed', { status: translateResponse.status });
      return { outcome: 'search_unavailable', ...empty };
    }
    translated = (await translateResponse.json()) as { scryfallQuery?: string };
  } catch (error) {
    log.error('translate_error', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return { outcome: 'search_unavailable', ...empty };
  }

  const scryfallQuery = translated.scryfallQuery?.trim() ?? '';
  if (!scryfallQuery) return { outcome: 'not_understood', ...empty };

  let scryfallResponse: Response;
  try {
    scryfallResponse = await fetch(
      `https://api.scryfall.com/cards/search?q=${encodeURIComponent(
        `${scryfallQuery} game:paper`,
      )}&unique=cards`,
      {
        headers: {
          'User-Agent': 'OffMetaDiscordBot/1.0',
          Accept: 'application/json',
        },
      },
    );
  } catch (error) {
    log.error('scryfall_error', {
      message: error instanceof Error ? error.message : 'unknown',
    });
    return { outcome: 'card_data_unavailable', scryfallQuery, cards: [], totalCards: 0 };
  }

  if (!scryfallResponse.ok) {
    // 404 from Scryfall means "valid query, zero matches".
    const outcome: SearchOutcome =
      scryfallResponse.status === 404 ? 'no_results' : 'card_data_unavailable';
    if (outcome !== 'no_results') {
      log.error('scryfall_status', { status: scryfallResponse.status });
    }
    return { outcome, scryfallQuery, cards: [], totalCards: 0 };
  }

  const payload = (await scryfallResponse.json()) as {
    data?: Array<Record<string, unknown>>;
    total_cards?: number;
  };
  const data = payload.data ?? [];
  return {
    outcome: data.length > 0 ? 'ok' : 'no_results',
    scryfallQuery,
    cards: data.slice(0, MAX_CARDS).map(summarize),
    totalCards: payload.total_cards ?? data.length,
  };
}


/** Edit the deferred interaction response once the search resolves. */
async function sendFollowup(
  applicationId: string,
  token: string,
  body: Record<string, unknown>,
): Promise<void> {
  await fetch(
    `https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

/**
 * Signed click redirect: records the outbound click against the same
 * pseudonymous actor, then forwards to the public results page. Only ever
 * redirects to `buildResultsUrl`, so it can't be used as an open redirect.
 */
async function handleClickRedirect(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const query = (url.searchParams.get('q') ?? '').slice(0, MAX_QUERY_LENGTH);
  const actorHash = url.searchParams.get('a') ?? '';
  const guildId = url.searchParams.get('g') ?? '';
  const signature = url.searchParams.get('s') ?? '';
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!query || !signature || !secret) {
    return new Response('Not Found', { status: 404 });
  }

  const expected = await signClick(
    clickPayload(query, actorHash, guildId),
    secret,
  );
  if (expected !== signature) {
    return new Response('Not Found', { status: 404 });
  }

  await recordClick({ query, actorHash, guildId }).catch(() => undefined);

  return new Response(null, {
    status: 302,
    headers: {
      Location: buildResultsUrl(query),
      'Cache-Control': 'no-store',
    },
  });
}

serve(
  withLogging('discord-bot', async (req: Request): Promise<Response> => {
    if (req.method === 'GET' && new URL(req.url).searchParams.has('s')) {
      return handleClickRedirect(req);
    }

    if (req.method !== 'POST') {
      return new Response('Not Found', { status: 404 });
    }

    const rawBody = await req.text();
    const valid = await verifyDiscordSignature(
      rawBody,
      req.headers.get('x-signature-ed25519'),
      req.headers.get('x-signature-timestamp'),
      Deno.env.get('DISCORD_PUBLIC_KEY'),
    );
    if (!valid) {
      return new Response('invalid request signature', { status: 401 });
    }

    let interaction: DiscordInteraction;
    try {
      interaction = JSON.parse(rawBody) as DiscordInteraction;
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    if (interaction.type === InteractionType.PING) {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type !== InteractionType.APPLICATION_COMMAND) {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.data?.name !== 'offmeta') {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    const userId = extractUserId(interaction);
    const guildId = interaction.guild_id;
    const query = extractQuery(interaction);
    if (userId) {
      const { allowed, retryAfterSeconds } = checkRateLimit(userId);
      if (!allowed) {
        // Immediate ephemeral reply — no search work is started.
        hashActor(userId)
          .then((actorHash) =>
            recordAnalytics({
              query,
              scryfallQuery: '',
              outcome: 'search_unavailable',
              cardCount: 0,
              totalCards: 0,
              actorHash,
              guildId,
              durationMs: 0,
              rateLimited: true,
            }),
          )
          .catch(() => undefined);
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE,
          data: {
            flags: EPHEMERAL,
            content: `You're searching a bit fast — up to ${RATE_LIMIT_MAX} searches per minute. Try again in ${retryAfterSeconds}s.`,
          },
        });
      }
    }

    const applicationId = interaction.application_id ?? '';
    const token = interaction.token ?? '';

    // Discord requires a response within 3s; search takes longer, so defer.
    const deferred = Response.json({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
    });

    if (!applicationId || !token) return deferred;

    if (!query) {
      sendFollowup(applicationId, token, {
        content:
          'Give me something to search — e.g. `/offmeta query: creatures that make treasure`.',
      }).catch(() => undefined);
      return deferred;
    }

    // Fire-and-forget: the follow-up edits the deferred message.
    (async () => {
      const startedAt = Date.now();
      const actorHash = await hashActor(userId);
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      const resultsUrl = await buildTrackedResultsUrl(
        query,
        actorHash,
        guildId ?? '',
        supabaseUrl ? `${supabaseUrl}/functions/v1/discord-bot` : undefined,
        serviceRoleKey,
      );
      try {
        const { outcome, scryfallQuery, cards, totalCards } =
          await runSearch(query);
        await sendFollowup(applicationId, token, {
          embeds: [
            buildEmbed(
              query,
              scryfallQuery,
              cards,
              totalCards,
              outcome,
              resultsUrl,
            ),
          ],
        });
        await recordAnalytics({
          query,
          scryfallQuery,
          outcome,
          cardCount: cards.length,
          totalCards,
          actorHash,
          guildId,
          durationMs: Date.now() - startedAt,
        });
      } catch (error) {
        log.error('command_failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
        await sendFollowup(applicationId, token, {
          content: outcomeMessage('search_unavailable', query),
        }).catch(() => undefined);
        await recordAnalytics({
          query,
          scryfallQuery: '',
          outcome: 'search_unavailable',
          cardCount: 0,
          totalCards: 0,
          actorHash: await hashActor(userId),
          guildId,
          durationMs: Date.now() - startedAt,
        }).catch(() => undefined);
      }
    })();


    return deferred;
  }),
);
