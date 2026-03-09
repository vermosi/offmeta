/**
 * detect-archetypes — Archetype tagging for community decks.
 *
 * Uses per-card matching: for each archetype, counts the number of distinct
 * cards whose oracle text + type line match at least one keyword pattern.
 * The archetype score = matchingCards / totalCards (a ratio, not raw count).
 *
 * A minimum threshold (MIN_RATIO) prevents ubiquitous keywords like "land"
 * from causing every deck to be tagged as "ramp".
 *
 * @module functions/detect-archetypes
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('detect-archetypes');

/**
 * Minimum percentage of cards that must match for an archetype to qualify.
 * 15% prevents near-universal keywords from tagging every deck.
 */
const MIN_RATIO = 0.15;

/**
 * Minimum absolute card count — avoids false positives in very small decks.
 */
const MIN_CARD_COUNT = 5;

interface ArchetypePattern {
  archetype: string;
  /**
   * Each pattern is matched against individual card text (type_line + oracle_text).
   * A card counts as a match if ANY pattern hits. Multiple hits on the same card
   * don't inflate the score — it's binary per card.
   */
  patterns: RegExp[];
  /**
   * Negative patterns: if a card matches one of these, it does NOT count.
   * Useful for filtering out generic keywords (e.g., "land" in ramp).
   */
  negativePatterns?: RegExp[];
  /**
   * Weight multiplier (default 1.0). Higher = archetype is favored when tied.
   * Use sparingly — mostly for niche archetypes that need a boost.
   */
  weight?: number;
}

const ARCHETYPE_PATTERNS: ArchetypePattern[] = [
  {
    archetype: 'tokens',
    patterns: [
      /\bcreate\b.*\btoken/i,
      /\bpopulate\b/i,
      /\btoken(?:s)?\b.*\byou control\b/i,
      /\bdoubling season\b/i,
      /\bparallel lives\b/i,
    ],
  },
  {
    archetype: 'aristocrats',
    patterns: [
      /\bwhen(?:ever)?\b.*\bcreature\b.*\bdies\b/i,
      /\bsacrifice\b.*\bcreature\b/i,
      /\bsacrifice another\b/i,
      /\bwhen(?:ever)?\b.*\bsacrifice\b/i,
      /\bdeath trigger/i,
      /\bblood artist\b/i,
      /\bmorbid\b/i,
    ],
  },
  {
    archetype: 'treasure',
    patterns: [
      /\bcreate\b.*\btreasure\b/i,
      /\btreasure token/i,
      /\bwhen(?:ever)?\b.*\btreasure\b/i,
    ],
  },
  {
    archetype: 'blink',
    patterns: [
      /\bexile\b.*\breturn\b.*\bto the battlefield\b/i,
      /\bflicker\b/i,
      /\bexile\b.*\bthen return\b/i,
      /\bwhen(?:ever)?\b.*\benters\b/i,
    ],
    // "enters" is broad — negative patterns reduce false positives
    negativePatterns: [/\bbasic land\b/i],
  },
  {
    archetype: 'graveyard',
    patterns: [
      /\breturn\b.*\bfrom\b.*\bgraveyard\b/i,
      /\bmill\b/i,
      /\bdredge\b/i,
      /\bflashback\b/i,
      /\bunearth\b/i,
      /\bdelve\b/i,
      /\bself-mill\b/i,
      /\bput\b.*\binto\b.*\bgraveyard\b/i,
      /\bin your graveyard\b/i,
    ],
  },
  {
    archetype: 'artifacts',
    patterns: [
      /\bartifact\b.*\byou control\b/i,
      /\bmetalcraft\b/i,
      /\baffinity\b/i,
      /\bequipment\b.*\byou control\b/i,
      /\bwhen(?:ever)?\b.*\bartifact\b.*\benters\b/i,
      /\bimprovis[e]/i,
      /\bmodular\b/i,
    ],
    // Don't count cards that merely ARE artifacts — look for artifact synergy
    negativePatterns: [/^artifact$/i],
  },
  {
    archetype: 'spellslinger',
    patterns: [
      /\bmagecraft\b/i,
      /\bwhen(?:ever)?\b.*\bcast\b.*\b(?:instant|sorcery)\b/i,
      /\bstorm\b/i,
      /\bcopy\b.*\b(?:instant|sorcery)\b/i,
      /\bprowess\b/i,
    ],
  },
  {
    archetype: 'ramp',
    patterns: [
      /\bsearch your library for\b.*\bland\b/i,
      /\bput\b.*\bland\b.*\bonto the battlefield\b/i,
      /\badd \{[WUBRGC]\}/i,
      /\badd\b.*\bmana\b.*\bof any\b/i,
    ],
    // "land" alone is too broad — only match ramp-specific oracle text
    negativePatterns: [/^(?:basic )?land/i],
    weight: 0.8, // Slightly penalize to break ties vs more specific archetypes
  },
  {
    archetype: 'aggro',
    patterns: [
      /\bhaste\b/i,
      /\bdouble strike\b/i,
      /\bbattle cry\b/i,
      /\bexalted\b/i,
      /\bblitz\b/i,
      /\bdash\b/i,
    ],
  },
  {
    archetype: 'control',
    patterns: [
      /\bcounter target\b/i,
      /\bdestroy all\b/i,
      /\bexile all\b/i,
      /\beach opponent\b.*\bsacrifice\b/i,
      /\bboard wipe\b/i,
      /\bwrath\b/i,
    ],
  },
  {
    archetype: 'voltron',
    patterns: [
      /\bequipped creature\b/i,
      /\benchanted creature\b/i,
      /\bwhen(?:ever)?\b.*\bequip\b/i,
      /\baura\b/i,
      /\battach\b.*\bto\b/i,
    ],
  },
  {
    archetype: 'tribal',
    patterns: [
      /\bother\b.*\byou control get\b/i,
      /\b(?:elves|goblins|zombies|vampires|merfolk|soldiers|angels|dragons|dinosaurs|spirits|humans|knights|wizards|clerics|rogues|warriors)\b.*\byou control\b/i,
      /\bchoose a creature type\b/i,
      /\bchangeling\b/i,
      /\blord\b/i,
    ],
  },
  {
    archetype: 'combo',
    patterns: [
      /\buntap\b.*\btarget\b/i,
      /\bwhenever you\b.*\byou may\b/i,
      /\binfinite\b/i,
      /\bcopy\b.*\btriggered ability\b/i,
    ],
    weight: 0.9,
  },
  {
    archetype: 'stax',
    patterns: [
      /\bplayers can't\b/i,
      /\bopponents can't\b/i,
      /\bdoesn't untap\b/i,
      /\bdon't untap\b/i,
      /\beach upkeep\b.*\bsacrifice\b/i,
      /\btax\b/i,
    ],
  },
  {
    archetype: 'enchantress',
    patterns: [
      /\bwhen(?:ever)?\b.*\bcast\b.*\benchantment\b/i,
      /\benchantment\b.*\byou control\b/i,
      /\bconstellation\b/i,
    ],
  },
  {
    archetype: 'landfall',
    patterns: [
      /\blandfall\b/i,
      /\bwhen(?:ever)?\b.*\bland\b.*\benters\b/i,
      /\bplay\b.*\badditional land\b/i,
    ],
  },
  {
    archetype: 'wheels',
    patterns: [
      /\beach player\b.*\bdiscards?\b.*\bhand\b/i,
      /\beach player\b.*\bdraws?\b/i,
      /\bdiscard\b.*\bhand\b.*\bdraw\b/i,
    ],
  },
  {
    archetype: 'lifegain',
    patterns: [
      /\bwhen(?:ever)?\b.*\bgain life\b/i,
      /\blifelink\b/i,
      /\byou gain\b.*\blife\b.*\bput\b/i,
    ],
  },
  {
    archetype: 'counters',
    patterns: [
      /\b\+1\/\+1 counter/i,
      /\bproliferate\b/i,
      /\bwhen(?:ever)?\b.*\bcounter\b.*\bplaced\b/i,
      /\bmodular\b/i,
      /\bevolve\b/i,
    ],
  },
];

interface CardText {
  type_line: string;
  oracle_text: string;
}

interface ArchetypeScore {
  archetype: string;
  matchingCards: number;
  totalCards: number;
  ratio: number;
  weightedRatio: number;
}

function detectArchetype(cards: CardText[]): string | null {
  if (cards.length < MIN_CARD_COUNT) return null;

  const scores: ArchetypeScore[] = [];

  for (const pattern of ARCHETYPE_PATTERNS) {
    let matchCount = 0;

    for (const card of cards) {
      const text = `${card.type_line ?? ''} ${card.oracle_text ?? ''}`;
      if (!text.trim()) continue;

      // Check negative patterns first
      if (pattern.negativePatterns?.some((neg) => neg.test(text))) continue;

      // Binary match: does ANY pattern hit this card?
      if (pattern.patterns.some((p) => p.test(text))) {
        matchCount++;
      }
    }

    const ratio = matchCount / cards.length;
    const weight = pattern.weight ?? 1.0;

    if (ratio >= MIN_RATIO && matchCount >= 3) {
      scores.push({
        archetype: pattern.archetype,
        matchingCards: matchCount,
        totalCards: cards.length,
        ratio,
        weightedRatio: ratio * weight,
      });
    }
  }

  if (scores.length === 0) return null;

  // Sort by weighted ratio descending — highest concentration wins
  scores.sort((a, b) => b.weightedRatio - a.weightedRatio);
  return scores[0].archetype;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Parse body — support "backfill: true" to re-tag all decks
    let backfill = false;
    try {
      const body = await req.json();
      backfill = body?.backfill === true;
    } catch {
      // No body or invalid JSON — proceed with default (untagged only)
    }

    let query = supabase.from('community_decks').select('id').limit(500);
    if (!backfill) {
      query = query.is('archetype', null);
    }

    const { data: decks, error: deckErr } = await query;
    if (deckErr) throw deckErr;
    if (!decks || decks.length === 0) {
      return new Response(
        JSON.stringify({ success: true, tagged: 0, message: 'All decks tagged' }),
        { status: 200, headers },
      );
    }

    let tagged = 0;
    let skipped = 0;
    const distribution: Record<string, number> = {};

    for (const deck of decks) {
      const { data: deckCards } = await supabase
        .from('community_deck_cards')
        .select('scryfall_oracle_id')
        .eq('deck_id', deck.id)
        .not('scryfall_oracle_id', 'is', null);

      if (!deckCards || deckCards.length === 0) {
        skipped++;
        continue;
      }

      const oracleIds = deckCards
        .map((c) => c.scryfall_oracle_id)
        .filter(Boolean) as string[];

      // Batch fetch card data (max 100 per query due to Supabase limits)
      const allCards: CardText[] = [];
      for (let i = 0; i < oracleIds.length; i += 100) {
        const batch = oracleIds.slice(i, i + 100);
        const { data: cards } = await supabase
          .from('cards')
          .select('oracle_text, type_line')
          .in('oracle_id', batch);

        if (cards) {
          allCards.push(
            ...cards.map((c) => ({
              type_line: c.type_line ?? '',
              oracle_text: c.oracle_text ?? '',
            })),
          );
        }
      }

      if (allCards.length < MIN_CARD_COUNT) {
        skipped++;
        continue;
      }

      const archetype = detectArchetype(allCards);

      if (archetype) {
        await supabase
          .from('community_decks')
          .update({ archetype })
          .eq('id', deck.id);
        tagged++;
        distribution[archetype] = (distribution[archetype] ?? 0) + 1;
      } else {
        skipped++;
      }
    }

    log.info(`Archetype detection: tagged=${tagged} skipped=${skipped} of ${decks.length}`, distribution);
    return new Response(
      JSON.stringify({ success: true, tagged, skipped, total: decks.length, distribution }),
      { status: 200, headers },
    );
  } catch (e) {
    log.error('detect-archetypes error', e);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers },
    );
  }
});
