/**
 * End-to-end tests for the Discord command flows.
 *
 * These drive the real request handler (signature verification, deferred
 * response, background follow-up) with a stubbed network so one test can cover
 * a full session: /offmeta search → Next button re-render → /go click.
 */
import {
  assertEquals,
  assertStringIncludes,
  assert,
} from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import { handleDiscordRequest, flushPendingWork } from './index.ts';

const SUPABASE_URL = 'https://stub.supabase.test';
const SERVICE_ROLE_KEY = 'test-service-role-key';

interface FollowupBody {
  embeds?: Array<Record<string, unknown>>;
  components?: Array<{
    components: Array<{ label: string; custom_id: string; disabled?: boolean }>;
  }>;
  content?: string;
}

interface AnalyticsRow {
  event_type: string;
  session_id: string | null;
  event_data: Record<string, unknown>;
}

interface Recorder {
  followups: FollowupBody[];
  analytics: AnalyticsRow[];
  scryfallUrls: string[];
  translateCount: number;
}

function scryfallCard(index: number) {
  return {
    name: `Test Card ${index}`,
    type_line: 'Creature — Human Wizard',
    mana_cost: '{1}{U}',
    oracle_text: 'Whenever this creature attacks, draw a card.',
    prices: { usd: '1.23' },
    edhrec_rank: 500 + index,
  };
}

/** Install a fetch stub that emulates semantic-search, Scryfall and Discord. */
function installNetworkStub(): { recorder: Recorder; restore: () => void } {
  const original = globalThis.fetch;
  const recorder: Recorder = {
    followups: [],
    analytics: [],
    scryfallUrls: [],
    translateCount: 0,
  };

  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();

    if (url.includes('/functions/v1/semantic-search')) {
      recorder.translateCount += 1;
      return Response.json({ scryfallQuery: 'o:treasure t:creature' });
    }

    if (url.includes('/rest/v1/analytics_events')) {
      recorder.analytics.push(JSON.parse(String(init?.body)) as AnalyticsRow);
      return new Response(null, { status: 201 });
    }

    if (url.includes('api.scryfall.com/cards/search')) {
      recorder.scryfallUrls.push(url);
      return Response.json({
        total_cards: 42,
        data: Array.from({ length: 175 }, (_, i) => scryfallCard(i)),
      });
    }

    if (url.includes('discord.com/api/v10/webhooks')) {
      recorder.followups.push(JSON.parse(String(init?.body)) as FollowupBody);
      return new Response(null, { status: 204 });
    }

    // Anything else (e.g. the alternatives lookup) resolves to "no match".
    return Response.json({ data: [] });
  }) as typeof fetch;

  return { recorder, restore: () => { globalThis.fetch = original; } };
}

/** Set the env the handler needs, returning a restore fn (env is process-wide). */
function setEnv(): () => void {
  const previous = {
    url: Deno.env.get('SUPABASE_URL'),
    key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    publicKey: Deno.env.get('DISCORD_PUBLIC_KEY'),
  };
  Deno.env.set('SUPABASE_URL', SUPABASE_URL);
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
  return () => {
    for (const [name, value] of [
      ['SUPABASE_URL', previous.url],
      ['SUPABASE_SERVICE_ROLE_KEY', previous.key],
      ['DISCORD_PUBLIC_KEY', previous.publicKey],
    ] as const) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sign an interaction body the way Discord does, and register the pubkey. */
async function makeSigner() {
  const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ])) as CryptoKeyPair;
  const publicKeyHex = bytesToHex(
    new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)),
  );
  Deno.env.set('DISCORD_PUBLIC_KEY', publicKeyHex);

  return async (interaction: unknown): Promise<Request> => {
    const body = JSON.stringify(interaction);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = bytesToHex(
      new Uint8Array(
        await crypto.subtle.sign(
          { name: 'Ed25519' },
          pair.privateKey,
          new TextEncoder().encode(timestamp + body),
        ),
      ),
    );
    return new Request('https://edge.test/discord-bot', {
      method: 'POST',
      headers: {
        'x-signature-ed25519': signature,
        'x-signature-timestamp': timestamp,
        'Content-Type': 'application/json',
      },
      body,
    });
  };
}

function paginationRow(followup: FollowupBody) {
  const row = followup.components?.[0];
  assert(row, 'expected pagination components on the follow-up');
  return row.components;
}

Deno.test({
  name: 'e2e: /offmeta → Next button re-render → /go click share one session',
  // Background follow-up work is awaited via flushPendingWork.
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const restoreEnv = setEnv();
    const { recorder, restore } = installNetworkStub();
    const sign = await makeSigner();
    // Unique per run so the per-user rate limiter never leaks across tests.
    const userId = `e2e-user-${crypto.randomUUID()}`;
    const guildId = '1396995018337550346';

    try {
      // ── 1. Slash command ────────────────────────────────────────────────
      const commandRes = await handleDiscordRequest(
        await sign({
          type: 2,
          application_id: 'app-1',
          token: 'token-1',
          guild_id: guildId,
          member: { user: { id: userId } },
          data: {
            name: 'offmeta',
            options: [
              {
                name: 'search',
                type: 1,
                options: [{ name: 'query', value: 'cards that make treasure' }],
              },
            ],
          },
        }),
      );
      // Type 5 = deferred channel message, sent inside Discord's 3s budget.
      assertEquals((await commandRes.json()).type, 5);

      await flushPendingWork();
      assertEquals(recorder.followups.length, 1);
      assertEquals(recorder.translateCount, 1);

      const firstEmbed = recorder.followups[0].embeds?.[0] as {
        title: string;
        url: string;
        fields: Array<{ name: string; value: string }>;
        footer: { text: string };
      };
      assertEquals(firstEmbed.title, 'cards that make treasure');
      assertEquals(firstEmbed.fields[0].value, '`o:treasure t:creature`');
      assertStringIncludes(firstEmbed.footer.text, '1–5 of 42');

      const firstRow = paginationRow(recorder.followups[0]);
      assertEquals(firstRow[0].disabled, true); // Prev disabled on page 1
      assertEquals(firstRow[1].label, 'Page 1 / 9');
      assertEquals(firstRow[2].custom_id, 'offmeta_page:1');
      assertEquals(firstRow[2].disabled, false);
      assertEquals(
        new Set(firstRow.map((component) => component.custom_id)).size,
        firstRow.length,
      );

      // ── 2. Next button re-renders the same message ──────────────────────
      const buttonRes = await handleDiscordRequest(
        await sign({
          type: 3,
          application_id: 'app-1',
          token: 'token-1',
          guild_id: guildId,
          member: { user: { id: userId } },
          data: { custom_id: firstRow[2].custom_id },
          message: { embeds: [firstEmbed] },
        }),
      );
      // Type 6 = deferred update message, so Discord keeps the existing embed.
      assertEquals((await buttonRes.json()).type, 6);

      await flushPendingWork();
      assertEquals(recorder.followups.length, 2);
      // Pagination reuses the translated query — no second translation call.
      assertEquals(recorder.translateCount, 1);
      assertStringIncludes(recorder.scryfallUrls[1], 'page=1');

      const secondEmbed = recorder.followups[1].embeds?.[0] as {
        title: string;
        footer: { text: string };
        fields: Array<{ value: string }>;
      };
      assertEquals(secondEmbed.title, 'cards that make treasure');
      assertEquals(secondEmbed.fields[0].value, '`o:treasure t:creature`');
      assertStringIncludes(secondEmbed.footer.text, '6–10 of 42');

      const secondRow = paginationRow(recorder.followups[1]);
      assertEquals(secondRow[0].custom_id, 'offmeta_page:0');
      assertEquals(secondRow[0].disabled, false); // Prev now usable
      assertEquals(secondRow[1].label, 'Page 2 / 9');
      assertEquals(secondRow[2].custom_id, 'offmeta_page:2');
      assertEquals(secondRow[2].disabled, false);
      assertEquals(
        new Set(secondRow.map((component) => component.custom_id)).size,
        secondRow.length,
      );

      // ── 3. /go click on the tracked link from the embed ─────────────────
      const trackedUrl = new URL(firstEmbed.url);
      assertEquals(trackedUrl.origin + trackedUrl.pathname, 'https://offmeta.app/go');
      const clickUrl = new URL('https://edge.test/discord-bot');
      for (const [key, value] of trackedUrl.searchParams) {
        clickUrl.searchParams.set(key, value);
      }
      const clickRes = await handleDiscordRequest(
        new Request(clickUrl, { headers: { Accept: 'application/json' } }),
      );
      const clickData = await clickRes.json();
      assertEquals(clickRes.status, 200);
      assertEquals(clickData.ok, true);
      assertStringIncludes(clickData.redirectUrl, 'utm_source=discord');

      // ── 4. Analytics: search, pagination and click share the actor ──────
      const searches = recorder.analytics.filter(
        (row) => row.event_type !== 'discord_click',
      );
      const clicks = recorder.analytics.filter(
        (row) => row.event_type === 'discord_click',
      );
      assertEquals(searches.length, 2); // command + pagination
      assertEquals(clicks.length, 1);
      assertEquals(clicks[0].event_data.outcome, 'success');
      assertEquals(clicks[0].event_data.guild_id, guildId);
      assertEquals(clicks[0].event_data.query, 'cards that make treasure');

      // Same pseudonymous session across the whole flow.
      assert(searches[0].session_id);
      assertEquals(searches[1].session_id, searches[0].session_id);
      assertEquals(clicks[0].session_id, searches[0].session_id);
    } finally {
      restore();
      restoreEnv();
    }
  },
});

Deno.test({
  name: 'e2e: a tampered pagination click is ignored, and a forged /go link is rejected',
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const restoreEnv = setEnv();
    const { recorder, restore } = installNetworkStub();
    const sign = await makeSigner();

    try {
      // Button press with no embed context: acknowledged, but no work done.
      const res = await handleDiscordRequest(
        await sign({
          type: 3,
          application_id: 'app-1',
          token: 'token-2',
          member: { user: { id: `e2e-user-${crypto.randomUUID()}` } },
          data: { custom_id: 'offmeta_page:3' },
          message: { embeds: [] },
        }),
      );
      assertEquals((await res.json()).type, 6);
      await flushPendingWork();
      assertEquals(recorder.followups.length, 0);
      assertEquals(recorder.scryfallUrls.length, 0);

      // Forged click link: no redirect, and the failure is still recorded.
      const forged = new URL('https://edge.test/discord-bot');
      forged.searchParams.set('q', 'cards that make treasure');
      forged.searchParams.set('a', 'deadbeef');
      forged.searchParams.set('g', '1');
      forged.searchParams.set('s', 'not-a-real-signature');
      const clickRes = await handleDiscordRequest(
        new Request(forged, { headers: { Accept: 'application/json' } }),
      );
      const clickData = await clickRes.json();
      assertEquals(clickRes.status, 400);
      assertEquals(clickData.ok, false);
      assertEquals(clickData.outcome, 'invalid_signature');
      assertEquals(
        recorder.analytics.some(
          (row) =>
            row.event_type === 'discord_click' &&
            row.event_data.outcome === 'invalid_signature' &&
            row.event_data.destination === null,
        ),
        true,
      );
    } finally {
      restore();
      restoreEnv();
    }
  },
});
