/**
 * price-snapshot — Nightly edge function to capture price snapshots
 * for all cards in users' collections.
 * Triggered by pg_cron or manual invocation.
 * @module functions/price-snapshot
 */

// @ts-expect-error - Deno-specific module paths not resolvable in TypeScript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const BATCH_SIZE = 75;
const SCRYFALL_DELAY_MS = 100;

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
    // Get distinct card names from all collections
    const { data: cards, error: fetchErr } = await supabase
      .from('collection_cards')
      .select('card_name, scryfall_id')
      .limit(5000);

    if (fetchErr) throw fetchErr;
    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({ success: true, snapshotCount: 0 }), { status: 200, headers });
    }

    // Deduplicate by card_name
    const uniqueCards = new Map<string, string | null>();
    for (const c of cards) {
      if (!uniqueCards.has(c.card_name)) {
        uniqueCards.set(c.card_name, c.scryfall_id);
      }
    }

    const cardList = Array.from(uniqueCards.entries());
    const snapshots: Array<{
      card_name: string;
      scryfall_id: string | null;
      price_usd: number | null;
      price_usd_foil: number | null;
    }> = [];

    // Batch fetch prices from Scryfall
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
        }
      } catch (e) {
        log.warn('Scryfall batch failed', { batch: i, error: String(e) });
      }

      if (i + BATCH_SIZE < cardList.length) {
        await new Promise((r) => setTimeout(r, SCRYFALL_DELAY_MS));
      }
    }

    // Insert snapshots
    if (snapshots.length > 0) {
      const { error: insertErr } = await supabase
        .from('price_snapshots')
        .insert(snapshots);

      if (insertErr) {
        log.error('Failed to insert snapshots', insertErr);
        throw insertErr;
      }
    }

    // Clean up snapshots older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('price_snapshots')
      .delete()
      .lt('recorded_at', ninetyDaysAgo);

    log.info(`Captured ${snapshots.length} price snapshots`);

    return new Response(
      JSON.stringify({ success: true, snapshotCount: snapshots.length }),
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
