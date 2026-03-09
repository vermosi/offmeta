/**
 * detect-archetypes — Simple archetype tagging for community decks.
 * Analyzes card names and oracle text to assign archetype labels.
 * @module functions/detect-archetypes
 */


import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('detect-archetypes');

const ARCHETYPE_PATTERNS: Array<{ archetype: string; keywords: string[] }> = [
  { archetype: 'tokens', keywords: ['create', 'token', 'populate', 'copy of'] },
  { archetype: 'aristocrats', keywords: ['sacrifice', 'when a creature dies', 'whenever a creature you control dies', 'blood artist'] },
  { archetype: 'treasure', keywords: ['treasure', 'create a treasure'] },
  { archetype: 'blink', keywords: ['exile', 'return to the battlefield', 'flicker', 'blink'] },
  { archetype: 'graveyard', keywords: ['graveyard', 'return from your graveyard', 'mill', 'dredge', 'flashback'] },
  { archetype: 'artifacts', keywords: ['artifact', 'equipment', 'metalcraft', 'affinity'] },
  { archetype: 'spellslinger', keywords: ['instant', 'sorcery', 'magecraft', 'cast an instant or sorcery', 'storm'] },
  { archetype: 'ramp', keywords: ['search your library for a', 'land', 'add {', 'mana dork'] },
  { archetype: 'aggro', keywords: ['haste', 'first strike', 'double strike', 'prowess'] },
  { archetype: 'control', keywords: ['counter target', 'destroy all', 'exile all', 'board wipe'] },
  { archetype: 'voltron', keywords: ['equipped', 'attach', 'aura', 'enchanted creature'] },
  { archetype: 'tribal', keywords: ['all', 'other', 'you control get', 'lord'] },
  { archetype: 'combo', keywords: ['infinite', 'untap', 'whenever you', 'each time'] },
  { archetype: 'stax', keywords: ["can't", "don't untap", 'each player', 'opponents can'] },
];

function detectArchetype(cardTexts: string[]): string | null {
  const combined = cardTexts.join(' ').toLowerCase();
  const scores = new Map<string, number>();

  for (const { archetype, keywords } of ARCHETYPE_PATTERNS) {
    let score = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw.toLowerCase(), 'g');
      const matches = combined.match(regex);
      if (matches) score += matches.length;
    }
    if (score > 0) scores.set(archetype, score);
  }

  if (scores.size === 0) return null;

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])[0][0];
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth guard: service role only
  const auth = requireServiceRole(req, corsHeaders);
  if (!auth.authorized) return auth.response;

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data: decks, error: deckErr } = await supabase
      .from('community_decks')
      .select('id')
      .is('archetype', null)
      .limit(200);

    if (deckErr) throw deckErr;
    if (!decks || decks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tagged: 0, message: 'All decks tagged' }),
        { status: 200, headers }
      );
    }

    let tagged = 0;

    for (const deck of decks) {
      const { data: deckCards } = await supabase
        .from('community_deck_cards')
        .select('scryfall_oracle_id')
        .eq('deck_id', deck.id)
        .not('scryfall_oracle_id', 'is', null);

      if (!deckCards || deckCards.length === 0) continue;

      const oracleIds = deckCards.map((c) => c.scryfall_oracle_id).filter(Boolean);
      const { data: cards } = await supabase
        .from('cards')
        .select('oracle_text, type_line')
        .in('oracle_id', oracleIds.slice(0, 100));

      if (!cards || cards.length === 0) continue;

      const texts = cards
        .map((c) => `${c.type_line ?? ''} ${c.oracle_text ?? ''}`)
        .filter(Boolean);

      const archetype = detectArchetype(texts);

      if (archetype) {
        await supabase
          .from('community_decks')
          .update({ archetype })
          .eq('id', deck.id);
        tagged++;
      }
    }

    log.info(`Archetype detection: tagged=${tagged} of ${decks.length}`);
    return new Response(
      JSON.stringify({ success: true, tagged, total: decks.length }),
      { status: 200, headers }
    );
  } catch (e) {
    log.error('detect-archetypes error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers }
    );
  }
});
