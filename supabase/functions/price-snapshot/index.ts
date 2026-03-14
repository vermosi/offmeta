/**
 * price-snapshot — Daily incremental price capture for user collections
 * and active price alerts only. Full-catalog price backfill is handled
 * weekly by bulk-data-sync.
 *
 * Sources (deduplicated by card name):
 *   1. collection_cards — user-owned cards (need fresh daily prices)
 *   2. price_alerts — active alert targets (must stay current)
 *
 * @module functions/price-snapshot
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const BATCH_SIZE = 75;
const SCRYFALL_DELAY_MS = 120;

const log = createLogger('price-snapshot');

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
    const uniqueCards = new Map<string, string | null>(); // card_name → scryfall_id

    // Source 1: User collection cards (need daily prices for portfolio value)
    const { data: collectionCards } = await supabase
      .from('collection_cards')
      .select('card_name, scryfall_id')
      .limit(5000);

    for (const c of collectionCards ?? []) {
      if (!uniqueCards.has(c.card_name)) {
        uniqueCards.set(c.card_name, c.scryfall_id);
      }
    }

    // Source 2: Active price alert targets (must stay current for triggers)
    const { data: alertCards } = await supabase
      .from('price_alerts')
      .select('card_name, scryfall_id')
      .eq('is_active', true);

    for (const a of alertCards ?? []) {
      if (!uniqueCards.has(a.card_name)) {
        uniqueCards.set(a.card_name, a.scryfall_id);
      }
    }

    const cardList = Array.from(uniqueCards.entries());
    log.info(`Tracking ${cardList.length} cards (${collectionCards?.length ?? 0} collection, ${alertCards?.length ?? 0} alerts)`);

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

      if (i + BATCH_SIZE < cardList.length) {
        await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
      }
    }

    // ── Insert snapshots ────────────────────────────────────────────

    if (snapshots.length > 0) {
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
          await supabase
            .from('price_alerts')
            .update({ is_active: false, triggered_at: new Date().toISOString() })
            .in('id', triggeredIds);

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
          alerts: alertCards?.length ?? 0,
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
