/**
 * price-snapshot — Daily edge function to capture price snapshots
 * for tracked cards (user collections + curated staples watchlist).
 * Triggered by pg_cron or manual invocation.
 *
 * Sources (deduplicated by card name):
 *   1. collection_cards — user-owned cards
 *   2. community_deck_cards — popular community deck cards
 *   3. STAPLES_WATCHLIST — curated list of high-interest staples
 *
 * @module functions/price-snapshot
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const BATCH_SIZE = 75;
const SCRYFALL_DELAY_MS = 120; // Scryfall asks for 50-100ms between requests

const log = createLogger('price-snapshot');

/**
 * Curated watchlist of popular Commander/Modern/Standard staples
 * that should always have price tracking, regardless of user collections.
 * Covers top value cards across formats for meaningful market trend data.
 */
const STAPLES_WATCHLIST: string[] = [
  // Commander staples — high value
  'Dockside Extortionist',
  'Mana Crypt',
  'Jeweled Lotus',
  'The One Ring',
  'Smothering Tithe',
  'Rhystic Study',
  'Cyclonic Rift',
  'Fierce Guardianship',
  'Deflecting Swat',
  "Teferi's Protection",
  'Esper Sentinel',
  'Mana Drain',
  'Force of Will',
  'Chrome Mox',
  'Mox Diamond',
  'Ancient Tomb',
  'Gaea\'s Cradle',
  'Serra\'s Sanctum',
  'Vampiric Tutor',
  'Demonic Tutor',
  'Sylvan Library',
  'Doubling Season',
  'Parallel Lives',
  'Enlightened Tutor',
  'Mystical Tutor',
  'Worldly Tutor',
  'Sensei\'s Divining Top',
  'Urza\'s Saga',
  'The Meathook Massacre',
  'Boseiju, Who Endures',

  // Modern staples
  'Ragavan, Nimble Pilferer',
  'Wrenn and Six',
  'Orcish Bowmasters',
  'Solitude',
  'Subtlety',
  'Fury',
  'Endurance',
  'Grief',
  'Aether Vial',
  'Cavern of Souls',
  'Misty Rainforest',
  'Scalding Tarn',
  'Verdant Catacombs',
  'Polluted Delta',
  'Flooded Strand',
  'Bloodstained Mire',
  'Wooded Foothills',
  'Windswept Heath',
  'Arid Mesa',
  'Marsh Flats',

  // Standard / Pioneer crossovers
  'Sheoldred, the Apocalypse',
  'Atraxa, Grand Unifier',
  'Fable of the Mirror-Breaker',
  'Ledger Shredder',
  'Raffine, Scheming Seer',
  'Omnath, Locus of Creation',
  'Wandering Emperor',
  'Wedding Announcement',

  // EDH / cEDH powerhouses
  'Ad Nauseam',
  'Thassa\'s Oracle',
  'Underworld Breach',
  'Tainted Pact',
  'Dauthi Voidwalker',
  'Opposition Agent',
  'Drannith Magistrate',
  'Grand Abolisher',
  'Collector Ouphe',
  'Null Rod',

  // Lands with price movement
  'Yavimaya, Cradle of Growth',
  'Urborg, Tomb of Yawgmoth',
  'Strip Mine',
  'Wasteland',
  'Command Tower',
  'Arcane Signet',
  'Sol Ring',
  'Lightning Greaves',
  'Swiftfoot Boots',
  'Skullclamp',
];

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // ── Gather card names from all sources ──────────────────────────

    const uniqueCards = new Map<string, string | null>(); // card_name → scryfall_id

    // Source 1: User collection cards
    const { data: collectionCards } = await supabase
      .from('collection_cards')
      .select('card_name, scryfall_id')
      .limit(5000);

    for (const c of collectionCards ?? []) {
      if (!uniqueCards.has(c.card_name)) {
        uniqueCards.set(c.card_name, c.scryfall_id);
      }
    }

    // Source 2: All unique community deck cards (MTGJSON + Spicerack imports)
    // Paginate to get all unique card names
    const communityNames = new Set<string>();
    let communityFrom = 0;
    const PAGE = 1000;
    while (communityNames.size < 5000) {
      const { data: chunk } = await supabase
        .from('community_deck_cards')
        .select('card_name')
        .range(communityFrom, communityFrom + PAGE - 1);
      if (!chunk || chunk.length === 0) break;
      for (const c of chunk) {
        communityNames.add(c.card_name);
      }
      if (chunk.length < PAGE) break;
      communityFrom += PAGE;
    }

    for (const name of communityNames) {
      if (!uniqueCards.has(name)) {
        uniqueCards.set(name, null);
      }
    }

    // Source 3: Curated watchlist (always tracked)
    for (const name of STAPLES_WATCHLIST) {
      if (!uniqueCards.has(name)) {
        uniqueCards.set(name, null);
      }
    }

    const cardList = Array.from(uniqueCards.entries());
    log.info(`Tracking ${cardList.length} unique cards (${collectionCards?.length ?? 0} collection, ${communityNames.size} community, ${STAPLES_WATCHLIST.length} watchlist)`);

    if (cardList.length === 0) {
      return new Response(JSON.stringify({ success: true, snapshotCount: 0 }), { status: 200, headers });
    }

    // ── Batch fetch prices from Scryfall ────────────────────────────

    const snapshots: Array<{
      card_name: string;
      scryfall_id: string | null;
      price_usd: number | null;
      price_usd_foil: number | null;
    }> = [];

    for (let i = 0; i < cardList.length; i += BATCH_SIZE) {
      const batch = cardList.slice(i, i + BATCH_SIZE);
      const identifiers = batch.map(([name, id]) =>
        id ? { id } : { name },
      );

      try {
        const resp = await fetch('https://api.scryfall.com/cards/collection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifiers }),
        });

        if (resp.ok) {
          const data = await resp.json();
          for (const card of data.data ?? []) {
            snapshots.push({
              card_name: card.name,
              scryfall_id: card.id,
              price_usd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
              price_usd_foil: card.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null,
            });
          }
        } else {
          const errText = await resp.text();
          log.warn(`Scryfall batch ${i} returned ${resp.status}`, { body: errText.slice(0, 200) });
        }
      } catch (e) {
        log.warn('Scryfall batch failed', { batch: i, error: String(e) });
      }

      // Rate limit: wait between batches
      if (i + BATCH_SIZE < cardList.length) {
        await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
      }
    }

    // ── Insert snapshots ────────────────────────────────────────────

    if (snapshots.length > 0) {
      // Insert in chunks of 500 to avoid payload limits
      for (let i = 0; i < snapshots.length; i += 500) {
        const chunk = snapshots.slice(i, i + 500);
        const { error: insertErr } = await supabase
          .from('price_snapshots')
          .insert(chunk);

        if (insertErr) {
          log.error(`Failed to insert snapshot chunk ${i}`, insertErr);
          throw insertErr;
        }
      }
    }

    // ── Check price alerts ────────────────────────────────────────
    let alertsTriggered = 0;
    try {
      const { data: activeAlerts } = await supabase
        .from('price_alerts')
        .select('id, user_id, card_name, target_price, direction')
        .eq('is_active', true);

      if (activeAlerts && activeAlerts.length > 0) {
        // Build a price lookup from freshly inserted snapshots
        const priceMap = new Map<string, number>();
        for (const s of snapshots) {
          if (s.price_usd) priceMap.set(s.card_name, s.price_usd);
        }

        const triggeredIds: string[] = [];
        const notifications: Array<{
          user_id: string;
          type: string;
          title: string;
          body: string;
          metadata: Record<string, unknown>;
        }> = [];

        for (const alert of activeAlerts) {
          const currentPrice = priceMap.get(alert.card_name);
          if (currentPrice === undefined) continue;

          const triggered =
            (alert.direction === 'below' && currentPrice <= alert.target_price) ||
            (alert.direction === 'above' && currentPrice >= alert.target_price);

          if (triggered) {
            triggeredIds.push(alert.id);
            notifications.push({
              user_id: alert.user_id,
              type: 'price_alert',
              title: `${alert.card_name} hit $${currentPrice.toFixed(2)}`,
              body: `Price ${alert.direction === 'below' ? 'dropped to' : 'rose to'} $${currentPrice.toFixed(2)} (target: $${alert.target_price})`,
              metadata: {
                card_name: alert.card_name,
                current_price: currentPrice,
                target_price: alert.target_price,
                direction: alert.direction,
                alert_id: alert.id,
              },
            });
          }
        }

        if (triggeredIds.length > 0) {
          // Mark alerts as triggered and inactive
          await supabase
            .from('price_alerts')
            .update({ is_active: false, triggered_at: new Date().toISOString() })
            .in('id', triggeredIds);

          // Insert notifications
          for (let i = 0; i < notifications.length; i += 100) {
            await supabase
              .from('user_notifications')
              .insert(notifications.slice(i, i + 100));
          }

          alertsTriggered = triggeredIds.length;
          log.info(`Triggered ${alertsTriggered} price alerts`);
        }
      }
    } catch (alertErr) {
      log.error('Price alert check failed (non-fatal)', alertErr);
    }

    // ── Cleanup old snapshots (>90 days) ────────────────────────────

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('price_snapshots')
      .delete()
      .lt('recorded_at', ninetyDaysAgo);

    log.info(`Captured ${snapshots.length} price snapshots`);

    return new Response(
      JSON.stringify({
        success: true,
        snapshotCount: snapshots.length,
        alertsTriggered,
        sources: {
          collection: collectionCards?.length ?? 0,
          community: communityNames.size,
          watchlist: STAPLES_WATCHLIST.length,
          uniqueTracked: cardList.length,
        },
      }),
      { status: 200, headers },
    );
  } catch (e) {
    log.error('price-snapshot error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers },
    );
  }
});
