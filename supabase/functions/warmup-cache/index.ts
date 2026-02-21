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
import { requireAdmin, getCorsHeaders } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { checkRateLimit, maybeCleanup } from '../_shared/rateLimit.ts';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Common MTG queries that should be pre-cached
const COMMON_QUERIES = [
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
  'Nature\'s Lore',
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
  'Thespian\'s Stage',
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
  'Green Sun\'s Zenith',
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
  'Teferi\'s Protection',
  'Smothering Tithe',
  'Dockside Extortionist',
  'Esper Sentinel',
  'Mystic Remora',
  'Aura Shards',
  'Beast Within',
  'Generous Gift',
  'Assassin\'s Trophy',
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
  'Grafdigger\'s Cage',
  'Rest in Peace',
  'Torpor Orb',
  'Cursed Totem',
  'Winter Orb',
  'Armageddon',
  'Ravages of War',
  'Muldrotha, the Gravetide',
  'The Gitrog Monster',
  'Yuriko, the Tiger\'s Shadow',
  'Korvold, Fae-Cursed King',
  'Chulane, Teller of Tales',
  'Kenrith, the Returned King',
  'Urza, Lord High Artificer',
  'Golos, Tireless Pilgrim',
  'Atraxa, Praetors\' Voice',
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
  'Minamo, School at Water\'s Edge',
  'Yargle and Multani',
  'Rocco, Cabaretti Caterer',
  'Jetmir, Nexus of Revels',
  'Jinnie Fay, Jetmir\'s Second',
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
  'Kykar, Wind\'s Fury',
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
  'Trostani, Selesnya\'s Voice',
  'Karametra, God of Harvests',
  'Qausali Ambusher',
  'Ramp & Mana',
  'green ramp', 'mana dorks', 'mana rocks', 'land ramp', 'artifact ramp',
  'cheap mana rocks', 'mana rocks under $5', 'two mana rocks', 'sol ring alternatives',
  // Card Draw
  'blue card draw', 'black card draw', 'green card draw', 'card draw engines',
  'cantrips', 'wheel effects',
  // Removal
  'white removal', 'black removal', 'creature removal', 'artifact removal',
  'enchantment removal', 'board wipes', 'cheap board wipes', 'single target removal',
  // Counterspells
  'blue counterspells', 'cheap counterspells', 'two mana counterspells', 'free counterspells',
  // Tutors
  'black tutors', 'green tutors', 'creature tutors', 'land tutors',
  'artifact tutors', 'enchantment tutors',
  // Tribal
  'elf tribal', 'goblin tribal', 'zombie tribal', 'vampire tribal',
  'dragon tribal', 'angel tribal', 'merfolk tribal', 'human tribal',
  'sliver tribal', 'elf lords', 'goblin lords', 'zombie lords',
  // Sacrifice
  'sacrifice outlets', 'free sacrifice outlets', 'aristocrats',
  'blood artist effects', 'death triggers', 'grave pact effects',
  // Graveyard
  'reanimation spells', 'self mill', 'graveyard recursion',
  'graveyard hate', 'flashback spells',
  // Tokens
  'token generators', 'treasure token makers', 'token doublers', 'populate effects',
  // Combat
  'haste enablers', 'extra combat steps', 'double strike',
  'unblockable creatures', 'trample enablers',
  // Control
  'stax pieces', 'hatebears', 'pillowfort', 'protection spells',
  // Blink
  'blink effects', 'flicker effects', 'etb creatures',
  // Commander Specific
  'partner commanders', 'mono red commanders', 'mono green commanders',
  'mono blue commanders', 'mono black commanders', 'mono white commanders',
  'simic commanders', 'rakdos commanders', 'orzhov commanders',
  // Color Combinations
  'rakdos sacrifice', 'simic ramp', 'orzhov lifegain', 'gruul creatures',
  'azorius control', 'dimir mill', 'golgari graveyard', 'boros aggro',
  'izzet spellslinger', 'selesnya tokens',
  // Budget
  'cheap green creatures', 'budget removal', 'affordable tutors', 'budget mana rocks',
  // Lands
  'fetch lands', 'shock lands', 'dual lands', 'pain lands',
  'tri lands', 'modal lands', 'creature lands',
  // Special Effects
  'extra turn spells', 'copy effects', 'theft effects',
  'mind control', 'clone effects', 'polymorph effects',
  // Recent/Popular
  'new commanders', 'popular commander cards', 'staple cards',
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require admin role
  const adminCheck = await requireAdmin(req, corsHeaders);
  if (!adminCheck.authorized) {
    return adminCheck.response;
  }

  // Rate limiting: 1 req/min (batch job)
  maybeCleanup();
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = await checkRateLimit(clientIp, undefined, 1, 10);
  if (!allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', success: false }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } },
    );
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

    const queriesToWarm =
      customQueries.length > 0 ? customQueries : COMMON_QUERIES;

    console.log(
      JSON.stringify({
        event: 'warmup_started',
        queryCount: queriesToWarm.length,
        custom: customQueries.length > 0,
      }),
    );

    const results = {
      total: queriesToWarm.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Process queries in batches to avoid overwhelming the system
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second

    for (let i = 0; i < queriesToWarm.length; i += BATCH_SIZE) {
      const batch = queriesToWarm.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (query) => {
        try {
          const { data, error } = await supabase.functions.invoke(
            'semantic-search',
            {
              body: { query },
            },
          );

          if (error) {
            console.error(`Warmup failed for "${query}":`, error.message);
            results.failed++;
            results.errors.push(`${query}: ${error.message}`);
          } else if (data?.cached) {
            results.skipped++;
          } else if (data?.success) {
            results.successful++;
            console.log(
              JSON.stringify({
                event: 'query_warmed',
                query: query.substring(0, 50),
                confidence: data.explanation?.confidence,
              }),
            );
          } else {
            results.failed++;
            results.errors.push(`${query}: Unknown error`);
          }
        } catch (err) {
          console.error(`Warmup exception for "${query}":`, err);
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

    console.log(
      JSON.stringify({
        event: 'warmup_complete',
        ...results,
        durationMs: duration,
      }),
    );

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
      {\
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Warmup error:', error);
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
});
