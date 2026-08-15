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

const InteractionType = { PING: 1, APPLICATION_COMMAND: 2 } as const;
const InteractionResponseType = {
  PONG: 1,
  DEFERRED_CHANNEL_MESSAGE: 5,
} as const;

interface DiscordOption {
  name: string;
  value?: unknown;
}

interface DiscordInteraction {
  type: number;
  token?: string;
  application_id?: string;
  data?: { name?: string; options?: DiscordOption[] };
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

export function buildResultsUrl(query: string): string {
  return `${SITE_URL}/?q=${encodeURIComponent(query)}`;
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
): Record<string, unknown> {
  const lines = cards.map(
    (card) =>
      `**[${card.name}](${card.scryfallUri})** ${card.manaCost}\n${card.typeLine}`,
  );
  const failed =
    outcome === 'search_unavailable' || outcome === 'card_data_unavailable';

  return {
    title: query.slice(0, 250),
    ...(failed ? {} : { url: buildResultsUrl(query) }),
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

serve(
  withLogging('discord-bot', async (req: Request): Promise<Response> => {
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

    const query = extractQuery(interaction);
    const applicationId = interaction.application_id ?? '';
    const token = interaction.token ?? '';

    // Discord requires a response within 3s; search takes longer, so defer.
    const deferred = Response.json({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
    });

    if (!query || !applicationId || !token) {
      return deferred;
    }

    // Fire-and-forget: the follow-up edits the deferred message.
    (async () => {
      try {
        const { scryfallQuery, cards, totalCards } = await runSearch(query);
        await sendFollowup(applicationId, token, {
          embeds: [buildEmbed(query, scryfallQuery, cards, totalCards)],
        });
      } catch (error) {
        log.error('command_failed', {
          message: error instanceof Error ? error.message : 'unknown',
        });
        await sendFollowup(applicationId, token, {
          content: 'OffMeta could not complete that search. Try again shortly.',
        }).catch(() => undefined);
      }
    })();

    return deferred;
  }),
);
