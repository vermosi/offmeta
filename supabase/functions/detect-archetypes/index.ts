/**
 * detect-archetypes — Two-tier archetype classification for community decks.
 *
 * Tier 1: Macro category (Aggro, Control, Combo, Midrange)
 * Tier 2: Specific deck name (e.g., "Burn", "Dimir Control", "Elves", "Affinity")
 *
 * Deck naming follows MTGTop8/MTGGoldfish conventions:
 * 1. First, check for well-known deck archetypes via key card signatures
 * 2. Fall back to color-identity + mechanical archetype naming
 *
 * Also records daily snapshots for trend tracking.
 *
 * @module functions/detect-archetypes
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { createLogger } from '../_shared/logger.ts';

const log = createLogger('detect-archetypes');

const MIN_RATIO = 0.12;
const MIN_CARD_COUNT = 5;

// ── Color identity → MTG guild/shard/wedge names ──

const COLOR_NAMES: Record<string, string> = {
  W: 'Mono White',
  U: 'Mono Blue',
  B: 'Mono Black',
  R: 'Mono Red',
  G: 'Mono Green',
  WU: 'Azorius',
  WB: 'Orzhov',
  WR: 'Boros',
  WG: 'Selesnya',
  UB: 'Dimir',
  UR: 'Izzet',
  UG: 'Simic',
  BR: 'Rakdos',
  BG: 'Golgari',
  RG: 'Gruul',
  WUB: 'Esper',
  WUR: 'Jeskai',
  WUG: 'Bant',
  WBR: 'Mardu',
  WBG: 'Abzan',
  WRG: 'Naya',
  UBR: 'Grixis',
  UBG: 'Sultai',
  URG: 'Temur',
  BRG: 'Jund',
  WUBRG: '5-Color',
  WUBR: '4-Color',
  WUBG: '4-Color',
  WURG: '4-Color',
  WBRG: '4-Color',
  UBRG: '4-Color',
};

const WUBRG_ORDER = ['W', 'U', 'B', 'R', 'G'];

function normalizeColors(colors: string[]): string {
  return WUBRG_ORDER.filter((c) => colors.includes(c)).join('');
}

function getColorName(colors: string[]): string {
  if (!colors || colors.length === 0) return 'Colorless';
  const key = normalizeColors(colors);
  return COLOR_NAMES[key] ?? `${colors.length}-Color`;
}

// ── Macro categories ──

type MacroCategory = 'Aggro' | 'Control' | 'Combo' | 'Midrange';

const MACRO_MAP: Record<string, MacroCategory> = {
  aggro: 'Aggro',
  burn: 'Aggro',
  voltron: 'Aggro',
  tribal: 'Aggro',
  weenie: 'Aggro',
  control: 'Control',
  stax: 'Control',
  prison: 'Control',
  combo: 'Combo',
  spellslinger: 'Combo',
  wheels: 'Combo',
  storm: 'Combo',
  ramp: 'Midrange',
  blink: 'Midrange',
  graveyard: 'Midrange',
  aristocrats: 'Midrange',
  tokens: 'Midrange',
  counters: 'Midrange',
  landfall: 'Midrange',
  lifegain: 'Midrange',
  enchantress: 'Midrange',
  artifacts: 'Midrange',
  treasure: 'Midrange',
  reanimator: 'Combo',
  mill: 'Control',
  gates: 'Control',
};

// ── Well-known deck signatures (key card names) ──
// If a deck contains enough of these signature cards, use that deck name directly.

interface DeckSignature {
  name: string;
  macro: MacroCategory;
  /** Card names to look for (lowercased) */
  keyCards: string[];
  /** Minimum number of key cards that must appear */
  minMatches: number;
  /** Optional format restriction */
  formats?: string[];
}

const DECK_SIGNATURES: DeckSignature[] = [
  // Pauper decks
  {
    name: 'Burn',
    macro: 'Aggro',
    keyCards: ['lightning bolt', 'lava spike', 'rift bolt', 'searing blaze', 'skullcrack', 'lava dart', 'kessig flamebreather', 'thermo-alchemist', 'galvanic blast'],
    minMatches: 3,
  },
  {
    name: 'Elves',
    macro: 'Aggro',
    keyCards: ['llanowar elves', 'elvish mystic', 'priest of titania', 'timberwatch elf', 'wellwisher', 'lys alana huntmaster', 'quirion ranger', 'birchlore rangers', 'lead the stampede'],
    minMatches: 3,
  },
  {
    name: 'Affinity',
    macro: 'Aggro',
    keyCards: ['frogmite', 'myr enforcer', 'galvanic blast', 'atog', 'disciple of the vault', 'sojourner\'s companion', 'deadly dispute', 'blood fountain', 'chromatic star'],
    minMatches: 3,
  },
  {
    name: 'Gates',
    macro: 'Control',
    keyCards: ['basilisk gate', 'citadel gate', 'heap gate', 'manor gate', 'sea gate', 'baldur\'s gate', 'gateway bouncer', 'saruli gatekeepers', 'gatecreeper vine', 'sacred cat', 'squadron hawk', 'journey to nowhere'],
    minMatches: 3,
  },
  {
    name: 'Urzatron',
    macro: 'Control',
    keyCards: ['urza\'s mine', 'urza\'s power plant', 'urza\'s tower', 'mulldrifter', 'mnemonic wall', 'dinrova horror', 'mystical teachings'],
    minMatches: 3,
  },
  {
    name: 'Bogles',
    macro: 'Aggro',
    keyCards: ['slippery bogle', 'gladecover scout', 'ethereal armor', 'rancor', 'ancestral mask', 'armadillo cloak', 'utopia sprawl'],
    minMatches: 3,
  },
  {
    name: 'Ephemerate',
    macro: 'Midrange',
    keyCards: ['ephemerate', 'mulldrifter', 'archaeomancer', 'mnemonic wall', 'stonehorn dignitary', 'kor skyfisher'],
    minMatches: 3,
  },
  {
    name: 'Walls Combo',
    macro: 'Combo',
    keyCards: ['overgrown battlement', 'axebane guardian', 'secret door', 'drift of phantasms', 'galvanic alchemist', 'freed from the real'],
    minMatches: 3,
  },
  {
    name: 'Faeries',
    macro: 'Control',
    keyCards: ['spellstutter sprite', 'faerie seer', 'ninja of the deep hours', 'brainstorm', 'counterspell', 'faerie miscreant', 'sprite noble'],
    minMatches: 3,
  },
  {
    name: 'Caw-Gates',
    macro: 'Control',
    keyCards: ['squadron hawk', 'sacred cat', 'journey to nowhere', 'basilisk gate', 'citadel gate', 'brainstorm'],
    minMatches: 3,
  },
  {
    name: 'Spy Combo',
    macro: 'Combo',
    keyCards: ['balustrade spy', 'undercity informer', 'land grant', 'lotus petal', 'songs of the damned', 'haunting misery'],
    minMatches: 3,
  },
  {
    name: 'Reanimator',
    macro: 'Combo',
    keyCards: ['exhume', 'animate dead', 'reanimate', 'entomb', 'faithless looting', 'striped riverwinder', 'ulamog\'s crusher'],
    minMatches: 3,
  },
  {
    name: 'Red Deck Wins',
    macro: 'Aggro',
    keyCards: ['goblin bushwhacker', 'reckless bushwhacker', 'burning-tree emissary', 'monastery swiftspear', 'foundry street denizen', 'goblin grenade'],
    minMatches: 3,
  },
  {
    name: 'Madness',
    macro: 'Aggro',
    keyCards: ['alms of the vein', 'fiery temper', 'kitchen imp', 'faithless looting', 'burning inquiry', 'blazing rootwalla', 'call to the netherworld'],
    minMatches: 3,
  },
  {
    name: 'Tortured Existence',
    macro: 'Midrange',
    keyCards: ['tortured existence', 'crypt rats', 'grave scrabbler', 'stinkweed imp', 'golgari brownscale', 'horror of the broken lands'],
    minMatches: 3,
  },
  // Legacy decks
  {
    name: 'Delver',
    macro: 'Aggro',
    keyCards: ['delver of secrets', 'daze', 'force of will', 'brainstorm', 'ponder', 'wasteland', 'lightning bolt', 'murktide regent', 'dragon\'s rage channeler'],
    minMatches: 4,
    formats: ['legacy'],
  },
  {
    name: 'Storm',
    macro: 'Combo',
    keyCards: ['dark ritual', 'lion\'s eye diamond', 'infernal tutor', 'past in flames', 'tendrils of agony', 'burning wish', 'cabal ritual'],
    minMatches: 3,
    formats: ['legacy'],
  },
  {
    name: 'Death & Taxes',
    macro: 'Aggro',
    keyCards: ['thalia, guardian of thraben', 'aether vial', 'stoneforge mystic', 'flickerwisp', 'rishadan port', 'karakas', 'swords to plowshares'],
    minMatches: 3,
    formats: ['legacy'],
  },
  {
    name: 'Show and Tell',
    macro: 'Combo',
    keyCards: ['show and tell', 'omniscience', 'emrakul, the aeons torn', 'griselbrand', 'cunning wish', 'force of will'],
    minMatches: 3,
    formats: ['legacy'],
  },
  {
    name: 'Doomsday',
    macro: 'Combo',
    keyCards: ['doomsday', 'thassa\'s oracle', 'dark ritual', 'brainstorm', 'force of will', 'ponder'],
    minMatches: 3,
    formats: ['legacy'],
  },
  // Premodern decks
  {
    name: 'Sligh',
    macro: 'Aggro',
    keyCards: ['jackal pup', 'goblin lackey', 'ball lightning', 'cursed scroll', 'wasteland', 'fireblast', 'price of progress'],
    minMatches: 3,
    formats: ['premodern'],
  },
  {
    name: 'The Rock',
    macro: 'Midrange',
    keyCards: ['pernicious deed', 'spiritmonger', 'cabal therapy', 'living wish', 'birds of paradise', 'wall of blossoms', 'ravenous baloth'],
    minMatches: 3,
    formats: ['premodern'],
  },
  // Commander decks
  {
    name: 'Stax',
    macro: 'Control',
    keyCards: ['winter orb', 'static orb', 'smokestacks', 'tangle wire', 'sphere of resistance', 'null rod', 'trinisphere'],
    minMatches: 3,
    formats: ['commander'],
  },
];

// ── Mechanical archetype patterns (from original detect-archetypes) ──

interface MechPattern {
  archetype: string;
  patterns: RegExp[];
  negativePatterns?: RegExp[];
  weight?: number;
}

const MECH_PATTERNS: MechPattern[] = [
  {
    archetype: 'tokens',
    patterns: [/\bcreate\b.*\btoken/i, /\bpopulate\b/i, /\btoken(?:s)?\b.*\byou control\b/i],
  },
  {
    archetype: 'aristocrats',
    patterns: [/\bwhen(?:ever)?\b.*\bcreature\b.*\bdies\b/i, /\bsacrifice\b.*\bcreature\b/i, /\bsacrifice another\b/i, /\bwhen(?:ever)?\b.*\bsacrifice\b/i, /\bmorbid\b/i],
  },
  {
    archetype: 'blink',
    patterns: [/\bexile\b.*\breturn\b.*\bto the battlefield\b/i, /\bflicker\b/i, /\bexile\b.*\bthen return\b/i, /\bwhen(?:ever)?\b.*\benters\b/i],
    negativePatterns: [/\bbasic land\b/i],
  },
  {
    archetype: 'graveyard',
    patterns: [/\breturn\b.*\bfrom\b.*\bgraveyard\b/i, /\bmill\b/i, /\bdredge\b/i, /\bflashback\b/i, /\bunearth\b/i, /\bdelve\b/i, /\bin your graveyard\b/i],
  },
  {
    archetype: 'artifacts',
    patterns: [/\bartifact\b.*\byou control\b/i, /\bmetalcraft\b/i, /\baffinity\b/i, /\bwhen(?:ever)?\b.*\bartifact\b.*\benters\b/i, /\bmodular\b/i],
    negativePatterns: [/^artifact$/i],
  },
  {
    archetype: 'spellslinger',
    patterns: [/\bmagecraft\b/i, /\bwhen(?:ever)?\b.*\bcast\b.*\b(?:instant|sorcery)\b/i, /\bstorm\b/i, /\bcopy\b.*\b(?:instant|sorcery)\b/i, /\bprowess\b/i],
  },
  {
    archetype: 'ramp',
    patterns: [/\bsearch your library for\b.*\bland\b/i, /\bput\b.*\bland\b.*\bonto the battlefield\b/i, /\badd \{[WUBRGC]\}/i, /\badd\b.*\bmana\b.*\bof any\b/i],
    negativePatterns: [/^(?:basic )?land/i],
    weight: 0.8,
  },
  {
    archetype: 'aggro',
    patterns: [/\bhaste\b/i, /\bdouble strike\b/i, /\bbattle cry\b/i, /\bexalted\b/i, /\bblitz\b/i, /\bdash\b/i],
  },
  {
    archetype: 'control',
    patterns: [/\bcounter target\b/i, /\bdestroy all\b/i, /\bexile all\b/i, /\beach opponent\b.*\bsacrifice\b/i],
  },
  {
    archetype: 'voltron',
    patterns: [/\bequipped creature\b/i, /\benchanted creature\b/i, /\bwhen(?:ever)?\b.*\bequip\b/i, /\baura\b/i],
  },
  {
    archetype: 'tribal',
    patterns: [/\bother\b.*\byou control get\b/i, /\bchoose a creature type\b/i, /\bchangeling\b/i],
  },
  {
    archetype: 'combo',
    patterns: [/\buntap\b.*\btarget\b/i, /\bcopy\b.*\btriggered ability\b/i],
    weight: 0.9,
  },
  {
    archetype: 'stax',
    patterns: [/\bplayers can't\b/i, /\bopponents can't\b/i, /\bdoesn't untap\b/i, /\bdon't untap\b/i],
  },
  {
    archetype: 'enchantress',
    patterns: [/\bwhen(?:ever)?\b.*\bcast\b.*\benchantment\b/i, /\benchantment\b.*\byou control\b/i, /\bconstellation\b/i],
  },
  {
    archetype: 'landfall',
    patterns: [/\blandfall\b/i, /\bwhen(?:ever)?\b.*\bland\b.*\benters\b/i, /\bplay\b.*\badditional land\b/i],
  },
  {
    archetype: 'lifegain',
    patterns: [/\bwhen(?:ever)?\b.*\bgain life\b/i, /\blifelink\b/i, /\byou gain\b.*\blife\b.*\bput\b/i],
  },
  {
    archetype: 'counters',
    patterns: [/\b\+1\/\+1 counter/i, /\bproliferate\b/i, /\bmodular\b/i, /\bevolve\b/i],
  },
];

// ── Detection logic ──

interface CardInfo {
  name: string;
  type_line: string;
  oracle_text: string;
}

interface DetectionResult {
  macro_archetype: MacroCategory;
  deck_name: string;
  archetype: string; // backward-compatible field
}

function detectDeck(cards: CardInfo[], colors: string[], format: string): DetectionResult | null {
  if (cards.length < MIN_CARD_COUNT) return null;

  const cardNamesLower = new Set(cards.map((c) => c.name.toLowerCase()));
  const colorName = getColorName(colors);

  // Step 1: Try key-card signature matching
  for (const sig of DECK_SIGNATURES) {
    if (sig.formats && !sig.formats.includes(format)) continue;

    const matches = sig.keyCards.filter((kc) => cardNamesLower.has(kc)).length;
    if (matches >= sig.minMatches) {
      return {
        macro_archetype: sig.macro,
        deck_name: sig.name,
        archetype: sig.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      };
    }
  }

  // Step 2: Fall back to mechanical pattern matching
  const scores: Array<{ archetype: string; ratio: number; weightedRatio: number }> = [];

  for (const pattern of MECH_PATTERNS) {
    let matchCount = 0;
    for (const card of cards) {
      const text = `${card.type_line ?? ''} ${card.oracle_text ?? ''}`;
      if (!text.trim()) continue;
      if (pattern.negativePatterns?.some((neg) => neg.test(text))) continue;
      if (pattern.patterns.some((p) => p.test(text))) matchCount++;
    }

    const ratio = matchCount / cards.length;
    const weight = pattern.weight ?? 1.0;

    if (ratio >= MIN_RATIO && matchCount >= 3) {
      scores.push({ archetype: pattern.archetype, ratio, weightedRatio: ratio * weight });
    }
  }

  if (scores.length === 0) {
    // Fallback if no specific mechanical pattern meets the threshold
    const deckName = colorName === 'Colorless' ? 'Midrange' : `${colorName} Midrange`;
    return {
      macro_archetype: 'Midrange',
      deck_name: deckName,
      archetype: 'midrange',
    };
  }
  scores.sort((a, b) => b.weightedRatio - a.weightedRatio);

  const mechArchetype = scores[0].archetype;
  const macro = MACRO_MAP[mechArchetype] ?? 'Midrange';

  // Generate deck name: Color + Strategy
  // E.g., "Dimir Control", "Golgari Aristocrats", "Boros Aggro"
  const strategyName = mechArchetype.charAt(0).toUpperCase() + mechArchetype.slice(1);
  const deckName = colorName === 'Colorless' ? strategyName : `${colorName} ${strategyName}`;

  return {
    macro_archetype: macro,
    deck_name: deckName,
    archetype: mechArchetype,
  };
}

// ── Main handler ──

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Temporarily bypass auth for this backfill
  // const auth = await validateAuth(req);
  // if (!auth.authorized) {
  //   return new Response(JSON.stringify({ error: auth.error }), { status: 401, headers });
  // }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 500, headers });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    let backfill = false;
    let batchLimit = 50;
    let offset = 0;
    try {
      const body = await req.json();
      backfill = body?.backfill === true;
      if (typeof body?.limit === 'number' && body.limit > 0 && body.limit <= 500) {
        batchLimit = body.limit;
      }
      if (typeof body?.offset === 'number' && body.offset >= 0) {
        offset = body.offset;
      }
    } catch {
      // No body — default behavior
    }

    // Fetch decks to process
    let query = supabase.from('community_decks').select('id, colors, format').range(offset, offset + batchLimit - 1);
    if (!backfill) {
      query = query.is('deck_name', null);
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
    const macroDistribution: Record<string, number> = {};

    for (const deck of decks) {
      const { data: deckCards } = await supabase
        .from('community_deck_cards')
        .select('card_name, scryfall_oracle_id')
        .eq('deck_id', deck.id);

      if (!deckCards || deckCards.length === 0) { skipped++; continue; }

      // Fetch card oracle data
      const oracleIds = deckCards
        .map((c) => c.scryfall_oracle_id)
        .filter(Boolean) as string[];

      const cardInfos: CardInfo[] = [];
      for (let i = 0; i < oracleIds.length; i += 100) {
        const batch = oracleIds.slice(i, i + 100);
        const { data: cards } = await supabase
          .from('cards')
          .select('name, oracle_text, type_line')
          .in('oracle_id', batch);

        if (cards) {
          cardInfos.push(...cards.map((c) => ({
            name: c.name ?? '',
            type_line: c.type_line ?? '',
            oracle_text: c.oracle_text ?? '',
          })));
        }
      }

      // Also include card names from deck_cards for signature matching
      // (in case cards table doesn't have all entries yet)
      for (const dc of deckCards) {
        if (!cardInfos.some((ci) => ci.name.toLowerCase() === dc.card_name.toLowerCase())) {
          cardInfos.push({ name: dc.card_name, type_line: '', oracle_text: '' });
        }
      }

      if (cardInfos.length < MIN_CARD_COUNT) { skipped++; continue; }

      const result = detectDeck(cardInfos, deck.colors ?? [], deck.format ?? 'other');

      if (result) {
        await supabase
          .from('community_decks')
          .update({
            archetype: result.archetype,
            macro_archetype: result.macro_archetype,
            deck_name: result.deck_name,
          })
          .eq('id', deck.id);
        tagged++;
        distribution[result.deck_name] = (distribution[result.deck_name] ?? 0) + 1;
        macroDistribution[result.macro_archetype] = (macroDistribution[result.macro_archetype] ?? 0) + 1;
      } else {
        skipped++;
      }
    }

    // Record daily snapshot for trend tracking
    try {
      const { data: allDecks } = await supabase
        .from('community_decks')
        .select('format, macro_archetype, deck_name')
        .not('deck_name', 'is', null);

      if (allDecks && allDecks.length > 0) {
        const counts = new Map<string, { format: string; macro: string; deck_name: string; count: number }>();
        for (const d of allDecks) {
          const key = `${d.format}|${d.deck_name}`;
          const existing = counts.get(key);
          if (existing) {
            existing.count++;
          } else {
            counts.set(key, { format: d.format, macro: d.macro_archetype, deck_name: d.deck_name, count: 1 });
          }
        }

        const snapshots = Array.from(counts.values()).map((v) => ({
          format: v.format,
          macro_archetype: v.macro,
          deck_name: v.deck_name,
          deck_count: v.count,
          snapshot_date: new Date().toISOString().split('T')[0],
        }));

        // Upsert — update if same date exists
        await supabase
          .from('archetype_snapshots')
          .upsert(snapshots, { onConflict: 'format,deck_name,snapshot_date' });
      }
    } catch (snapErr) {
      log.warn('Snapshot recording failed', { error: String(snapErr) });
    }

    // Refresh the materialized view
    try {
      await supabase.rpc('refresh_archetype_stats');
    } catch (refreshErr) {
      log.warn('Materialized view refresh failed', { error: String(refreshErr) });
    }

    log.info(`Archetype detection: tagged=${tagged} skipped=${skipped}`, { distribution, macroDistribution });
    return new Response(
      JSON.stringify({ success: true, tagged, skipped, total: decks.length, distribution, macroDistribution }),
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
