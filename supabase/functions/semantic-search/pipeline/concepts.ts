/**
 * Stage 4: Concept Matching
 * Uses vector similarity and alias matching to find relevant concepts
 */

import type { ConceptMatch } from './types.ts';
import { supabase } from '../client.ts';

// Hardcoded concept library for immediate use
// These are the core concepts that don't require vector embeddings
const CONCEPT_LIBRARY: Record<
  string,
  {
    aliases: string[];
    templates: string[];
    negativeTemplates: string[];
    description: string;
    category: string;
    priority: number;
  }
> = {
  // === RAMP & MANA ===
  ramp: {
    aliases: ['ramp', 'mana acceleration', 'accelerate mana', 'mana ramp'],
    templates: ['otag:ramp'],
    negativeTemplates: [],
    description: 'Cards that accelerate mana production',
    category: 'ramp',
    priority: 90,
  },
  mana_rock: {
    aliases: ['mana rock', 'mana rocks', 'rocks', 'manarock', 'artifact ramp'],
    templates: [
      'otag:mana-rock',
      't:artifact (produces:w or produces:u or produces:b or produces:r or produces:g or produces:c) -t:creature',
    ],
    negativeTemplates: ['-t:land'],
    description: 'Artifacts that produce mana',
    category: 'ramp',
    priority: 85,
  },
  mana_dork: {
    aliases: [
      'mana dork',
      'mana dorks',
      'dorks',
      'mana creature',
      'creature that taps for mana',
    ],
    templates: [
      'otag:mana-dork',
      't:creature (produces:w or produces:u or produces:b or produces:r or produces:g)',
    ],
    negativeTemplates: [],
    description: 'Creatures that produce mana',
    category: 'ramp',
    priority: 85,
  },
  land_ramp: {
    aliases: [
      'land ramp',
      'fetch lands from deck',
      'search for lands',
      'land acceleration',
    ],
    templates: ['otag:land-ramp', 'o:"search your library" o:"land"'],
    negativeTemplates: [],
    description: 'Cards that put lands onto the battlefield',
    category: 'ramp',
    priority: 80,
  },
  ritual: {
    aliases: ['ritual', 'rituals', 'fast mana', 'burst mana', 'one-shot mana'],
    templates: ['otag:ritual'],
    negativeTemplates: [],
    description: 'Spells that provide temporary mana burst',
    category: 'ramp',
    priority: 75,
  },
  sol_ring_alternative: {
    aliases: [
      'sol ring alternative',
      'sol ring alternatives',
      'adds 2 colorless',
      'adds cc',
      'produces 2 mana',
    ],
    templates: [
      't:artifact o:"{C}{C}" o:"add"',
      't:artifact (o:"add {c}{c}" or o:/add \\{[WUBRGC]\\}\\{[WUBRGC]\\}/)',
    ],
    negativeTemplates: ['-t:land'],
    description: 'Artifacts that add 2+ mana like Sol Ring',
    category: 'ramp',
    priority: 90,
  },

  // === CARD DRAW ===
  card_draw: {
    aliases: ['card draw', 'draw cards', 'draw engine', 'card advantage'],
    templates: ['otag:card-draw'],
    negativeTemplates: [],
    description: 'Cards that draw cards',
    category: 'draw',
    priority: 90,
  },
  cantrip: {
    aliases: ['cantrip', 'cantrips', 'replaces itself'],
    templates: ['otag:cantrip'],
    negativeTemplates: [],
    description: 'Cheap spells that replace themselves',
    category: 'draw',
    priority: 80,
  },
  wheel: {
    aliases: [
      'wheel',
      'wheels',
      'wheel effect',
      'discard and draw 7',
      'wheel of fortune',
    ],
    templates: ['otag:wheel'],
    negativeTemplates: [],
    description: 'Cards that make players discard and draw 7',
    category: 'draw',
    priority: 85,
  },
  looting: {
    aliases: ['looting', 'loot', 'loot effect', 'draw then discard'],
    templates: ['otag:looting'],
    negativeTemplates: [],
    description: 'Draw then discard effects',
    category: 'draw',
    priority: 75,
  },

  // === REMOVAL ===
  board_wipe: {
    aliases: [
      'board wipe',
      'wrath',
      'sweeper',
      'mass removal',
      'destroy all creatures',
      'wrath effect',
    ],
    templates: ['otag:board-wipe'],
    negativeTemplates: [],
    description: 'Cards that destroy all creatures',
    category: 'removal',
    priority: 90,
  },
  spot_removal: {
    aliases: [
      'spot removal',
      'single target removal',
      'targeted removal',
      'destroy target',
    ],
    templates: ['otag:spot-removal', 'otag:removal -otag:board-wipe'],
    negativeTemplates: [],
    description: 'Single-target removal spells',
    category: 'removal',
    priority: 80,
  },
  counterspell: {
    aliases: [
      'counterspell',
      'counter',
      'counterspells',
      'counter magic',
      'counter spell',
      'negate',
    ],
    templates: ['otag:counterspell'],
    negativeTemplates: [],
    description: 'Cards that counter spells',
    category: 'removal',
    priority: 90,
  },
  creature_removal: {
    aliases: [
      'creature removal',
      'kill spell',
      'creature kill',
      'destroy creature',
    ],
    templates: ['otag:creature-removal'],
    negativeTemplates: [],
    description: 'Spells that remove creatures',
    category: 'removal',
    priority: 80,
  },
  graveyard_hate: {
    aliases: [
      'graveyard hate',
      'gy hate',
      'graveyard removal',
      'exile graveyard',
    ],
    templates: ['otag:graveyard-hate'],
    negativeTemplates: [],
    description: 'Cards that interact negatively with graveyards',
    category: 'removal',
    priority: 75,
  },

  // === TUTORS ===
  tutor: {
    aliases: ['tutor', 'tutors', 'search library', 'find any card'],
    templates: ['otag:tutor'],
    negativeTemplates: [],
    description: 'Cards that search your library',
    category: 'tutor',
    priority: 90,
  },
  land_tutor: {
    aliases: ['land tutor', 'fetch land', 'land search'],
    templates: ['otag:land-tutor'],
    negativeTemplates: [],
    description: 'Cards that search for lands',
    category: 'tutor',
    priority: 80,
  },
  creature_tutor: {
    aliases: ['creature tutor', 'find creature', 'creature search'],
    templates: ['otag:creature-tutor'],
    negativeTemplates: [],
    description: 'Cards that search for creatures',
    category: 'tutor',
    priority: 80,
  },

  // === GRAVEYARD ===
  reanimation: {
    aliases: [
      'reanimation',
      'reanimate',
      'raise dead',
      'return from graveyard',
      'graveyard to battlefield',
    ],
    templates: ['otag:reanimation'],
    negativeTemplates: [],
    description: 'Cards that return creatures from graveyard to battlefield',
    category: 'graveyard',
    priority: 85,
  },
  self_mill: {
    aliases: ['self mill', 'mill yourself', 'self-mill', 'mill myself'],
    templates: ['otag:self-mill'],
    negativeTemplates: [],
    description: 'Cards that mill your own library',
    category: 'graveyard',
    priority: 80,
  },
  graveyard_recursion: {
    aliases: [
      'recursion',
      'graveyard recursion',
      'return from graveyard',
      'recursive',
    ],
    templates: ['otag:graveyard-recursion'],
    negativeTemplates: [],
    description: 'Cards that return things from graveyard',
    category: 'graveyard',
    priority: 80,
  },

  // === BLINK & BOUNCE ===
  blink: {
    aliases: [
      'blink',
      'flicker',
      'exile and return',
      'etb abuse',
      'blink effect',
    ],
    templates: ['otag:blink', 'otag:flicker'],
    negativeTemplates: [],
    description: 'Cards that exile and return permanents',
    category: 'blink',
    priority: 85,
  },
  bounce: {
    aliases: ['bounce', 'return to hand', 'unsummon effect'],
    templates: ['otag:bounce'],
    negativeTemplates: [],
    description: 'Cards that return permanents to hand',
    category: 'blink',
    priority: 75,
  },

  // === SACRIFICE ===
  sacrifice_outlet: {
    aliases: [
      'sacrifice outlet',
      'sac outlet',
      'free sac',
      'sacrifice for free',
    ],
    templates: ['otag:sacrifice-outlet'],
    negativeTemplates: [],
    description: 'Cards that let you sacrifice permanents',
    category: 'sacrifice',
    priority: 85,
  },
  aristocrats: {
    aliases: [
      'aristocrats',
      'death triggers',
      'dies payoff',
      'blood artist effect',
    ],
    templates: ['otag:aristocrats', 'otag:synergy-sacrifice'],
    negativeTemplates: [],
    description: 'Cards that benefit from creatures dying',
    category: 'sacrifice',
    priority: 85,
  },

  // === TOKENS ===
  token_generator: {
    aliases: [
      'token generator',
      'token maker',
      'creates tokens',
      'make tokens',
    ],
    templates: ['otag:token-generator'],
    negativeTemplates: [],
    description: 'Cards that create creature tokens',
    category: 'tokens',
    priority: 80,
  },
  treasure_tokens: {
    aliases: [
      'treasure',
      'treasure tokens',
      'makes treasure',
      'treasure generator',
    ],
    templates: ['otag:treasure-generator'],
    negativeTemplates: [],
    description: 'Cards that create treasure tokens',
    category: 'tokens',
    priority: 80,
  },

  // === CONTROL ===
  stax: {
    aliases: ['stax', 'prison', 'tax effects', 'lockdown'],
    templates: ['otag:stax'],
    negativeTemplates: [],
    description: 'Cards that restrict opponents actions',
    category: 'control',
    priority: 80,
  },
  hatebear: {
    aliases: ['hatebear', 'hatebears', 'hate creatures'],
    templates: ['otag:hatebear'],
    negativeTemplates: [],
    description: 'Creatures with disruptive abilities',
    category: 'control',
    priority: 80,
  },

  // === LIFEGAIN ===
  lifegain: {
    aliases: ['lifegain', 'life gain', 'gain life', 'healing'],
    templates: ['otag:lifegain'],
    negativeTemplates: [],
    description: 'Cards that gain life',
    category: 'lifegain',
    priority: 75,
  },
  soul_sisters: {
    aliases: ['soul sisters', 'soul warden', 'gain life when creatures enter'],
    templates: ['otag:soul-warden-ability'],
    negativeTemplates: [],
    description: 'Cards that gain life when creatures enter',
    category: 'lifegain',
    priority: 80,
  },

  // === SPECIAL ===
  extra_turn: {
    aliases: ['extra turn', 'extra turns', 'take another turn', 'time walk'],
    templates: ['otag:extra-turn'],
    negativeTemplates: [],
    description: 'Cards that grant extra turns',
    category: 'special',
    priority: 90,
  },
  untapper: {
    aliases: ['untapper', 'untap', 'untap permanents', 'untap creatures'],
    templates: ['otag:untapper'],
    negativeTemplates: ['-o:"untapped"'],
    description: 'Cards that untap permanents',
    category: 'special',
    priority: 75,
  },
  gives_flash: {
    aliases: [
      'gives flash',
      'flash enabler',
      'cast at instant speed',
      'flash to creatures',
    ],
    templates: ['otag:gives-flash'],
    negativeTemplates: [],
    description: 'Cards that give flash to other cards',
    category: 'special',
    priority: 80,
  },
  clone: {
    aliases: ['clone', 'clones', 'copy creature', 'copy permanent'],
    templates: ['otag:clone'],
    negativeTemplates: [],
    description: 'Cards that copy other permanents',
    category: 'special',
    priority: 80,
  },

  // === LANDS ===
  fetchland: {
    aliases: ['fetch land', 'fetchland', 'fetch lands', 'fetches'],
    templates: ['is:fetchland'],
    negativeTemplates: [],
    description: 'Lands that sacrifice to search for other lands',
    category: 'lands',
    priority: 90,
  },
  shockland: {
    aliases: ['shock land', 'shockland', 'shock lands', 'shocks'],
    templates: ['is:shockland'],
    negativeTemplates: [],
    description: 'Dual lands that deal 2 damage to enter untapped',
    category: 'lands',
    priority: 90,
  },
  dual_land: {
    aliases: ['dual land', 'duals', 'original duals', 'abur duals'],
    templates: ['is:dual'],
    negativeTemplates: [],
    description: 'Original dual lands from Alpha/Beta/Unlimited/Revised',
    category: 'lands',
    priority: 90,
  },
  mdfc_land: {
    aliases: ['mdfc land', 'modal land', 'modal lands', 'double faced land'],
    templates: ['is:mdfc t:land'],
    negativeTemplates: [],
    description: 'Modal double-faced lands',
    category: 'lands',
    priority: 85,
  },
};

/**
 * Finds matching concepts for the given residual query
 */
export async function findConceptMatches(
  residualQuery: string,
  maxMatches: number = 5,
  minConfidence: number = 0.7,
): Promise<ConceptMatch[]> {
  const matches: ConceptMatch[] = [];
  const normalizedQuery = residualQuery.toLowerCase().trim();

  // 1. Try exact alias matching first (fastest)
  for (const [conceptId, concept] of Object.entries(CONCEPT_LIBRARY)) {
    for (const alias of concept.aliases) {
      if (normalizedQuery.includes(alias)) {
        matches.push({
          conceptId,
          pattern: alias,
          scryfallSyntax: concept.templates[0],
          templates: concept.templates,
          negativeTemplates: concept.negativeTemplates,
          description: concept.description,
          confidence: 0.95,
          category: concept.category,
          priority: concept.priority,
          similarity: 1.0,
          matchType: 'exact',
        });
        break; // Only add each concept once
      }
    }
  }

  // 2. Try database alias matching
  try {
    const { data: dbMatches, error } = await supabase.rpc(
      'match_concepts_by_alias',
      {
        search_term: normalizedQuery.split(' ')[0], // First word
        match_count: 5,
      },
    );

    if (!error && dbMatches) {
      for (const match of dbMatches) {
        // Skip if we already have this concept
        if (matches.some((m) => m.conceptId === match.concept_id)) continue;

        matches.push({
          conceptId: match.concept_id || match.pattern,
          pattern: match.pattern,
          scryfallSyntax: match.scryfall_syntax,
          templates: match.scryfall_templates || [match.scryfall_syntax],
          negativeTemplates: match.negative_templates || [],
          description: match.description,
          confidence: match.confidence || 0.8,
          category: match.category || 'general',
          priority: match.priority || 50,
          similarity: 0.85,
          matchType: 'alias',
        });
      }
    }
  } catch {
    // Database not available, continue with hardcoded concepts
  }

  // 3. Sort by priority and confidence, limit results
  matches.sort((a, b) => {
    if (b.similarity !== a.similarity) return b.similarity - a.similarity;
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.confidence - a.confidence;
  });

  return matches
    .filter((m) => m.confidence >= minConfidence)
    .slice(0, maxMatches);
}

/**
 * Gets the best template for a concept based on context
 */
export function selectBestTemplate(
  concept: ConceptMatch,
  _slots: { types: { include: string[] } },
): string {
  // For now, just return the first template
  // Future: use context to pick the best one
  return concept.templates[0];
}
