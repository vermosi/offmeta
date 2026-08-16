/**
 * Cache Warmup Edge Function
 *
 * Pre-populates the query_cache with common MTG search patterns.
 * Run this after deployment or on a schedule to boost cache hit rate.
 * Requires admin role.
 *
 * Endpoint: POST /functions/v1/warmup-cache
 * Optional body: { "queries": ["custom query 1", "custom query 2"] }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { applyJobRateLimit, requirePipelineOrAdminJob } from '../_shared/jobGuards.ts';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const logger = createLogger('warmup-cache');

// Fallback natural-language queries (used only when logs are unavailable)
const FALLBACK_NATURAL_LANGUAGE_QUERIES = [
  'Sol Ring',
  'Lightning Bolt',
  'Counterspell',
  'Swords to Plowshares',
  'Brainstorm',
  'Path to Exile',
  'Ponder',
  'Preordain',
  'Demonic Tutor',
  'Birds of Paradise',
  'Dark Ritual',
  'Duress',
  'Faithless Looting',
  'Farseek',
  'Gitaxian Probe',
  'Inquisition of Kozilek',
  'Mana Crypt',
  "Nature's Lore",
  'Opt',
  'Serum Visions',
  'Skullclamp',
  'Swords to Plowshares',
  'Toxic Deluge',
  'Vampiric Tutor',
  'Wrath of God',
  'Ancient Tomb',
  'Arid Mesa',
  'Bloodstained Mire',
  'Command Tower',
  'Flooded Strand',
  'Marsh Flats',
  'Misty Rainforest',
  'Polluted Delta',
  'Scalding Tarn',
  'Verdant Catacombs',
  'Wasteland',
  'Wooded Foothills',
  'Strip Mine',
  "Thespian's Stage",
  'Crop Rotation',
  'Exploration',
  'Life from the Loam',
  'Sylvan Library',
  'Carpet of Flowers',
  'Rhystic Study',
  'Mystical Tutor',
  'Enlightened Tutor',
  'Worldly Tutor',
  'Chord of Calling',
  "Green Sun's Zenith",
  'Imperial Seal',
  'Wheel of Fortune',
  'Windfall',
  'Treasure Cruise',
  'Dig Through Time',
  'Fact or Fiction',
  'Pact of Negation',
  'Force of Will',
  'Force of Negation',
  'Mana Drain',
  'Cyclonic Rift',
  "Teferi's Protection",
  'Smothering Tithe',
  'Dockside Extortionist',
  'Esper Sentinel',
  'Mystic Remora',
  'Aura Shards',
  'Beast Within',
  'Generous Gift',
  "Assassin's Trophy",
  'Anguished Unmaking',
  'Vandalblast',
  'Austere Command',
  'Farewell',
  'Damn',
  'Deflecting Swat',
  'Grand Abolisher',
  'Seedborn Muse',
  'Consecrated Sphinx',
  'Sheoldred, the Apocalypse',
  'Ragavan, Nimble Pilferer',
  'Drannith Magistrate',
  'Opposition Agent',
  'Collector Ouphe',
  'Stranglehold',
  'Rule of Law',
  "Grafdigger's Cage",
  'Rest in Peace',
  'Torpor Orb',
  'Cursed Totem',
  'Winter Orb',
  'Armageddon',
  'Ravages of War',
  'Muldrotha, the Gravetide',
  'The Gitrog Monster',
  "Yuriko, the Tiger's Shadow",
  'Korvold, Fae-Cursed King',
  'Chulane, Teller of Tales',
  'Kenrith, the Returned King',
  'Urza, Lord High Artificer',
  'Golos, Tireless Pilgrim',
  "Atraxa, Praetors' Voice",
  'Breya, Etherium Shaper',
  'Najeela, the Blade-Blossom',
  'Tayam, Luminous Enigma',
  'Winota, Joiner of Forces',
  'Feather, the Redeemed',
  'Krenko, Mob Boss',
  'Queen Marchesa',
  'Kaalia of the Vast',
  'Edgar Markov',
  'The Ur-Dragon',
  'Inalla, Archmage Ritualist',
  'Meren of Clan Nel Toth',
  'Mikaeus, the Unhallowed',
  'Tasigur, the Golden Fang',
  'Narset, Enlightened Master',
  'Derevi, Empyrial Tactician',
  'Roon of the Hidden Realm',
  'Derevi, Empyrial Tactician',
  'Roon of the Hidden Realm',
  'Animar, Soul of Elements',
  'Prossh, Skyraider of Kher',
  'Jhoira of the Ghitu',
  'Grand Arbiter Augustin IV',
  'Elesh Norn, Grand Cenobite',
  'Iona, Shield of Emeria',
  'Vorinclex, Voice of Hunger',
  'Jin-Gitaxias, Core Augur',
  'Sheoldred, Whispering One',
  'Urabrask the Hidden',
  'Boseiju, Who Shelters All',
  'Otawara, Soaring City',
  'Sokenzan, Crucible of Defiance',
  'Eiganjo, Seat of the Empire',
  "Minamo, School at Water's Edge",
  'Yargle and Multani',
  'Rocco, Cabaretti Caterer',
  'Jetmir, Nexus of Revels',
  "Jinnie Fay, Jetmir's Second",
  'Henzie "Toolbox" Torre',
  'Prosper, Tome-Bound',
  'Sefris of the Hidden Ways',
  'Wilhelt, the Rotcleaver',
  'Millicent, Restless Revenant',
  'Anje Falkenrath',
  'Gisa and Geralf',
  'The Scarab God',
  'Lord Windgrace',
  'Atla Palani, Nest Tender',
  'Neyith of the Dire Hunt',
  'Aesi, Tyrant of Gyre Strait',
  'Maelstrom Wanderer',
  'Ur-Dragon',
  'Ramos, Dragon Engine',
  'Tiamat',
  'Miirym, Sentinel Wyrm',
  'Scion of the Ur-Dragon',
  'Korlessa, Scale Singer',
  "Kykar, Wind's Fury",
  'Niv-Mizzet, Parun',
  'The Locust God',
  'Brudiclad, Telchor Engineer',
  'Arjun, the Shifting Flame',
  'Mizzix of the Izmagnus',
  'Feather, the Redeemed',
  'Zada, Hedron Grinder',
  'Torbran, Thane of Red Fell',
  'Purphoros, God of the Forge',
  'Emmara, Soul of the Accord',
  "Trostani, Selesnya's Voice",
  'Karametra, God of Harvests',
  'Qausali Ambusher',
  'Ramp & Mana',
  'green ramp',
  'mana dorks',
  'mana rocks',
  'land ramp',
  'artifact ramp',
  'cheap mana rocks',
  'mana rocks under $5',
  'two mana rocks',
  'sol ring alternatives',
  // Card Draw
  'blue card draw',
  'black card draw',
  'green card draw',
  'card draw engines',
  'cantrips',
  'wheel effects',
  // Removal
  'white removal',
  'black removal',
  'creature removal',
  'artifact removal',
  'enchantment removal',
  'board wipes',
  'cheap board wipes',
  'single target removal',
  // Counterspells
  'blue counterspells',
  'cheap counterspells',
  'two mana counterspells',
  'free counterspells',
  // Tutors
  'black tutors',
  'green tutors',
  'creature tutors',
  'land tutors',
  'artifact tutors',
  'enchantment tutors',
  // Tribal
  'elf tribal',
  'goblin tribal',
  'zombie tribal',
  'vampire tribal',
  'dragon tribal',
  'angel tribal',
  'merfolk tribal',
  'human tribal',
  'sliver tribal',
  'elf lords',
  'goblin lords',
  'zombie lords',
  // Sacrifice
  'sacrifice outlets',
  'free sacrifice outlets',
  'aristocrats',
  'blood artist effects',
  'death triggers',
  'grave pact effects',
  // Graveyard
  'reanimation spells',
  'self mill',
  'graveyard recursion',
  'graveyard hate',
  'flashback spells',
  // Tokens
  'token generators',
  'treasure token makers',
  'token doublers',
  'populate effects',
  // Combat
  'haste enablers',
  'extra combat steps',
  'double strike',
  'unblockable creatures',
  'trample enablers',
  // Control
  'stax pieces',
  'hatebears',
  'pillowfort',
  'protection spells',
  // Blink
  'blink effects',
  'flicker effects',
  'etb creatures',
  // Commander Specific
  'partner commanders',
  'mono red commanders',
  'mono green commanders',
  'mono blue commanders',
  'mono black commanders',
  'mono white commanders',
  'simic commanders',
  'rakdos commanders',
  'orzhov commanders',
  // Color Combinations
  'rakdos sacrifice',
  'simic ramp',
  'orzhov lifegain',
  'gruul creatures',
  'azorius control',
  'dimir mill',
  'golgari graveyard',
  'boros aggro',
  'izzet spellslinger',
  'selesnya tokens',
  // Budget
  'cheap green creatures',
  'budget removal',
  'affordable tutors',
  'budget mana rocks',
  // Lands
  'fetch lands',
  'shock lands',
  'dual lands',
  'pain lands',
  'tri lands',
  'modal lands',
  'creature lands',
  // Special Effects
  'extra turn spells',
  'copy effects',
  'theft effects',
  'mind control',
  'clone effects',
  'polymorph effects',
  // Recent/Popular
  'new commanders',
  'popular commander cards',
  'staple cards',
];

serve(withLogging('warmup-cache', async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const adminCheck = await requirePipelineOrAdminJob(req);
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  const rateLimit = await applyJobRateLimit(req, corsHeaders, {
    bucketSize: 1,
    globalLimit: 10,
    label: 'Cache warmup job',
  });
  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  const startTime = Date.now();

  try {
    // Parse optional custom queries from request body
    let customQueries: string[] = [];
    try {
      const body = await req.json();
      if (body?.queries && Array.isArray(body.queries)) {
        customQueries = body.queries.filter(
          (q: unknown) => typeof q === 'string' && q.length > 0,
        );
      }
    } catch {
      // No body or invalid JSON - use defaults only
    }

    const popularQueryLimit = 50;
    const { data: popularLogs } = await supabase
      .from('translation_logs')
      .select('natural_language_query')
      .gte('confidence_score', 0.7)
      .order('created_at', { ascending: false })
      .limit(5000);

    const frequency = new Map<string, number>();
    for (const row of popularLogs ?? []) {
      const query = (row.natural_language_query || '').trim().toLowerCase();
      if (!query || query.length < 3) continue;
      frequency.set(query, (frequency.get(query) ?? 0) + 1);
    }

    const popularQueries = [...frequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, popularQueryLimit)
      .map(([query]) => query);

    const candidateQueries =
      customQueries.length > 0
        ? customQueries
        : popularQueries.length > 0
          ? popularQueries
          : FALLBACK_NATURAL_LANGUAGE_QUERIES.slice(0, popularQueryLimit);

    // Queries already sitting in a live cache row need no work. Skipping them
    // keeps the run well under semantic-search's 30 req/min bucket.
    const normalize = (q: string) => q.toLowerCase().trim().replace(/\s+/g, ' ');
    const { data: liveCacheRows } = await supabase
      .from('query_cache')
      .select('normalized_query')
      .in('normalized_query', candidateQueries.map(normalize))
      .gte('expires_at', new Date().toISOString());

    const alreadyCached = new Set(
      (liveCacheRows ?? []).map((row) => row.normalized_query as string),
    );

    // Hard cap per run: the shared rate limit is 30 requests/minute.
    const MAX_WARM_PER_RUN = 25;
    const queriesToWarm = candidateQueries
      .filter((q) => !alreadyCached.has(normalize(q)))
      .slice(0, MAX_WARM_PER_RUN);

    logger.info('warmup_started', {
      candidateCount: candidateQueries.length,
      queryCount: queriesToWarm.length,
      alreadyCached: alreadyCached.size,
      custom: customQueries.length > 0,
    });

    const results = {
      total: candidateQueries.length,
      successful: 0,
      failed: 0,
      skipped: candidateQueries.length - queriesToWarm.length,
      errors: [] as string[],
    };

    // Serial-ish pacing keeps the internal caller inside semantic-search's
    // per-principal rate limit instead of burning the whole bucket at once.
    const BATCH_SIZE = 2;
    const DELAY_BETWEEN_BATCHES = 2500;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    let rateLimited = false;

    /**
     * Calls semantic-search directly so the HTTP status and body are visible;
     * supabase-js collapses every failure into "non-2xx status code".
     */
    async function warmQuery(
      query: string,
    ): Promise<{ status: number; body: string; retryAfterMs: number | null }> {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/semantic-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceKey || SUPABASE_ANON_KEY,
          Authorization: `Bearer ${serviceKey || SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ query, useCache: true, locale: 'en' }),
      });

      const retryAfterHeader = res.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader
        ? Number(retryAfterHeader)
        : NaN;

      return {
        status: res.status,
        body: (await res.text()).slice(0, 300),
        retryAfterMs: Number.isFinite(retryAfterSeconds)
          ? retryAfterSeconds * 1000
          : null,
      };
    }

    // Transient statuses worth retrying: rate limits, gateway/runtime blips.
    const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
    const MAX_ATTEMPTS = 3;
    const BASE_BACKOFF_MS = 2000;
    const MAX_BACKOFF_MS = 15000;

    // Circuit breaker: after repeated non-2xx responses, stop hammering
    // semantic-search so the shared rate-limit bucket can recover.
    const BREAKER_FAILURE_THRESHOLD = 4;
    const BREAKER_COOLDOWN_MS = 20000;
    const BREAKER_MAX_TRIPS = 2;
    const breaker = {
      consecutiveFailures: 0,
      openUntil: 0,
      trips: 0,
    };

    class BreakerOpenError extends Error {
      constructor() {
        super('circuit breaker open');
        this.name = 'BreakerOpenError';
      }
    }

    const breakerIsOpen = () => Date.now() < breaker.openUntil;

    const recordBreakerOutcome = (ok: boolean, context: Record<string, unknown>) => {
      if (ok) {
        // Successful probe closes the breaker.
        breaker.consecutiveFailures = 0;
        breaker.openUntil = 0;
        return;
      }

      breaker.consecutiveFailures++;
      if (
        breaker.consecutiveFailures >= BREAKER_FAILURE_THRESHOLD &&
        !breakerIsOpen()
      ) {
        breaker.trips++;
        breaker.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
        logger.warn('warmup_breaker_open', {
          ...context,
          consecutiveFailures: breaker.consecutiveFailures,
          cooldownMs: BREAKER_COOLDOWN_MS,
          trips: breaker.trips,
        });
      }
    };

    const backoffDelayMs = (attempt: number, retryAfterMs: number | null) => {
      const exponential = Math.min(
        BASE_BACKOFF_MS * 2 ** (attempt - 1),
        MAX_BACKOFF_MS,
      );
      // Jitter avoids the parallel batch members retrying in lockstep.
      const jittered = exponential * (0.5 + Math.random() * 0.5);
      return Math.min(Math.max(retryAfterMs ?? 0, jittered), MAX_BACKOFF_MS);
    };

    /** Runs warmQuery with exponential backoff on transient failures. */
    async function warmQueryWithRetry(query: string) {
      let last: Awaited<ReturnType<typeof warmQuery>> | null = null;
      let lastError: unknown = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (breakerIsOpen()) throw new BreakerOpenError();

        try {
          last = await warmQuery(query);
          lastError = null;
          const ok = last.status >= 200 && last.status < 300;
          recordBreakerOutcome(ok, { query: query.substring(0, 50), status: last.status });
          if (!RETRYABLE_STATUSES.has(last.status)) return last;
        } catch (err) {
          // Network-level failures are transient too.
          lastError = err;
          last = null;
          recordBreakerOutcome(false, { query: query.substring(0, 50), status: null });
        }

        if (attempt < MAX_ATTEMPTS) {
          const delay = backoffDelayMs(attempt, last?.retryAfterMs ?? null);
          logger.warn('warmup_query_retry', {
            query: query.substring(0, 50),
            attempt,
            status: last?.status ?? null,
            delayMs: Math.round(delay),
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (!last) throw lastError ?? new Error('warmup request failed');
      return last;
    }

    for (let i = 0; i < queriesToWarm.length; i += BATCH_SIZE) {
      if (rateLimited) {
        results.skipped += queriesToWarm.length - i;
        break;
      }

      if (breakerIsOpen()) {
        if (breaker.trips >= BREAKER_MAX_TRIPS) {
          // Repeated trips mean the downstream is genuinely unhealthy: stop.
          const remaining = queriesToWarm.length - i;
          results.skipped += remaining;
          results.errors.push(
            `circuit breaker open after ${breaker.trips} trips: skipped ${remaining} queries`,
          );
          logger.error('warmup_breaker_abort', {
            remaining,
            trips: breaker.trips,
          });
          break;
        }

        // Single cooldown wait, then let the next batch act as a half-open probe.
        const waitMs = Math.max(0, breaker.openUntil - Date.now());
        logger.warn('warmup_breaker_cooldown', { waitMs });
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        breaker.consecutiveFailures = 0;
        breaker.openUntil = 0;
      }

      const batch = queriesToWarm.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (query) => {
        try {
          const { status, body } = await warmQueryWithRetry(query);

          if (status === 429) {
            rateLimited = true;
            results.failed++;
            results.errors.push(`${query}: rate limited (429)`);
            logger.warn('warmup_rate_limited', { query });
            return;
          }


          if (status < 200 || status >= 300) {
            results.failed++;
            results.errors.push(`${query}: HTTP ${status} ${body}`);
            logger.error('warmup_query_failed', { query, status, body });
            return;
          }

          const data = JSON.parse(body || '{}');
          if (data?.success) {
            results.successful++;
            logger.info('query_warmed', {
              query: query.substring(0, 50),
              cached: Boolean(data.cached),
              confidence: data.explanation?.confidence,
            });
          } else {
            results.failed++;
            results.errors.push(`${query}: ${data?.error ?? 'unknown error'}`);
          }
        } catch (err) {
          if (err instanceof BreakerOpenError) {
            results.skipped++;
            logger.warn('warmup_query_skipped_breaker', {
              query: query.substring(0, 50),
            });
            return;
          }
          logger.error('warmup_query_exception', {
            query,
            error: err instanceof Error ? err.message : String(err),
          });
          results.failed++;
          results.errors.push(`${query}: ${String(err)}`);
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches (except for last batch)
      if (i + BATCH_SIZE < queriesToWarm.length) {
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_BATCHES),
        );
      }
    }



    const duration = Date.now() - startTime;

    logger.info('warmup_complete', {
      ...results,
      durationMs: duration,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cache warmup complete`,
        results: {
          total: results.total,
          newlyCached: results.successful,
          alreadyCached: results.skipped,
          failed: results.failed,
        },
        durationMs: duration,
        ...(results.errors.length > 0 && results.errors.length <= 10
          ? { errors: results.errors }
          : results.errors.length > 10
            ? {
                errors: results.errors.slice(0, 10),
                moreErrors: results.errors.length - 10,
              }
            : {}),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    logger.error('warmup_error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Cache warmup failed',
        durationMs: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
}));
