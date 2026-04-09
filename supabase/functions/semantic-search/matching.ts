import { SYNONYM_MAP } from './shared-mappings.ts';
import { supabase } from './client.ts';
import { type CacheEntry } from './cache.ts';
import { createLogger } from './logging.ts';

const logger = createLogger('pattern-matching');

/**
 * Hardcoded translations for warmup/prefetch queries.
 * These MUST never hit AI - they are stable, well-known translations.
 */
const HARDCODED_TRANSLATIONS: Record<string, CacheEntry['result']> = {
  'budget board wipes under $5': {
    scryfallQuery: 'otag:boardwipe usd<5',
    explanation: {
      readable: 'Board wipes under $5',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'budget board wipes under 5': {
    scryfallQuery: 'otag:boardwipe usd<5',
    explanation: {
      readable: 'Board wipes under $5',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'mana rocks': {
    scryfallQuery:
      't:artifact o:"add" (o:"{C}" or o:"{W}" or o:"{U}" or o:"{B}" or o:"{R}" or o:"{G}" or o:"any color" or o:"one mana")',
    explanation: {
      readable: 'Artifacts that produce mana (mana rocks)',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'mana rocks that cost 2': {
    scryfallQuery: 't:artifact mv=2 (o:"add" o:"{")',
    explanation: {
      readable: 'Two-mana artifacts that produce mana',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'board wipes': {
    scryfallQuery: 'otag:board-wipe',
    explanation: {
      readable: 'Cards that destroy or remove all creatures/permanents',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'artifact removal': {
    scryfallQuery: 'otag:removal-artifact',
    explanation: {
      readable: 'Cards that remove artifacts',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'graveyard hate': {
    scryfallQuery: 'otag:graveyard-hate',
    explanation: {
      readable: 'Cards that disrupt graveyard strategies',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'lifegain': {
    scryfallQuery: 'otag:lifegain',
    explanation: {
      readable: 'Cards that gain life',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'sacrifice outlets': {
    scryfallQuery: 'otag:sacrifice-outlet',
    explanation: {
      readable: 'Cards that let you sacrifice permanents',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'sac outlets': {
    scryfallQuery: 'otag:sacrifice-outlet',
    explanation: {
      readable: 'Cards that let you sacrifice permanents',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'counterspells': {
    scryfallQuery: 'otag:counter',
    explanation: {
      readable: 'Cards that counter spells',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'spot removal': {
    scryfallQuery: 'otag:spot-removal',
    explanation: {
      readable: 'Targeted removal spells',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'mana dorks': {
    scryfallQuery: 'otag:mana-dork',
    explanation: {
      readable: 'Creatures that produce mana',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'card draw': {
    scryfallQuery: 'otag:draw',
    explanation: {
      readable: 'Cards that draw cards',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'ramp': {
    scryfallQuery: 'otag:ramp',
    explanation: {
      readable: 'Cards that accelerate mana production',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'tutors': {
    scryfallQuery: 'otag:tutor',
    explanation: {
      readable: 'Cards that search your library',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'cantrips': {
    scryfallQuery: 'otag:cantrip',
    explanation: {
      readable: 'Cheap spells that draw a card',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'elf lords': {
    scryfallQuery: 't:elf (otag:lord or otag:anthem)',
    explanation: {
      readable: 'Elf creatures that buff other elves',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'elf lords that buff other elves': {
    scryfallQuery: 't:elf (otag:lord or otag:anthem)',
    explanation: {
      readable: 'Elf creatures that buff other elves',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'zombie tribal payoffs': {
    scryfallQuery: 't:zombie (otag:lord or otag:anthem or o:"whenever" o:"zombie")',
    explanation: {
      readable: 'Zombie cards that reward tribal synergy',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'goblin lords': {
    scryfallQuery: 't:goblin (otag:lord or otag:anthem)',
    explanation: {
      readable: 'Goblin creatures that buff other goblins',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'goblin tribal': {
    scryfallQuery: 't:goblin (otag:lord or otag:anthem or o:"whenever" o:"goblin")',
    explanation: {
      readable: 'Goblin tribal payoffs and lords',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'merfolk lords': {
    scryfallQuery: 't:merfolk (otag:lord or otag:anthem)',
    explanation: {
      readable: 'Merfolk creatures that buff other merfolk',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'merfolk tribal': {
    scryfallQuery: 't:merfolk (otag:lord or otag:anthem or o:"whenever" o:"merfolk")',
    explanation: {
      readable: 'Merfolk tribal payoffs and lords',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'dragon lords': {
    scryfallQuery: 't:dragon (otag:lord or otag:anthem)',
    explanation: {
      readable: 'Dragon creatures that buff other dragons',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'dragon tribal': {
    scryfallQuery: 't:dragon (otag:lord or otag:anthem or o:"whenever" o:"dragon")',
    explanation: {
      readable: 'Dragon tribal payoffs and lords',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'vampire lords': {
    scryfallQuery: 't:vampire (otag:lord or otag:anthem)',
    explanation: {
      readable: 'Vampire creatures that buff other vampires',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'vampire tribal': {
    scryfallQuery: 't:vampire (otag:lord or otag:anthem or o:"whenever" o:"vampire")',
    explanation: {
      readable: 'Vampire tribal payoffs and lords',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'vampire tribal payoffs': {
    scryfallQuery: 't:vampire (otag:lord or otag:anthem or o:"whenever" o:"vampire")',
    explanation: {
      readable: 'Vampire cards that reward tribal synergy',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'best zombie tribal payoffs': {
    scryfallQuery: 't:zombie (otag:lord or otag:anthem or o:"whenever" o:"zombie")',
    explanation: {
      readable: 'Zombie cards that reward tribal synergy',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'infinite mana combos in green': {
    scryfallQuery: 'ci:g o:"untap" o:"add" t:creature',
    explanation: {
      readable: 'Green creatures that can untap and produce mana (infinite mana combo pieces)',
      assumptions: [],
      confidence: 0.9,
    },
    showAffiliate: true,
  },
  'cards that go infinite with sacrifice': {
    scryfallQuery: '(o:"whenever" o:"dies" (o:"create" or o:"return" or o:"add"))',
    explanation: {
      readable: 'Cards that trigger on death with recursion or value (sacrifice combo pieces)',
      assumptions: [],
      confidence: 0.9,
    },
    showAffiliate: true,
  },
  'cards that double etb triggers': {
    scryfallQuery: '(o:"enters the battlefield" (o:"twice" or o:"additional time" or o:"copy" o:"trigger"))',
    explanation: {
      readable: 'Cards that double enter-the-battlefield triggers',
      assumptions: [],
      confidence: 0.9,
    },
    showAffiliate: true,
  },
  'creatures that make treasure tokens': {
    scryfallQuery: 't:creature o:"create" o:"Treasure"',
    explanation: {
      readable: 'Creatures that create Treasure tokens',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'creatures that make treasure': {
    scryfallQuery: 't:creature o:"create" o:"Treasure"',
    explanation: {
      readable: 'Creatures that create Treasure tokens',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'creatures that make tokens': {
    scryfallQuery: 't:creature o:"create" o:"token"',
    explanation: {
      readable: 'Creatures that create tokens',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'lifegain angel theme': {
    scryfallQuery: 't:angel otag:lifegain',
    explanation: {
      readable: 'Angels with lifegain synergies',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'lifegain angels': {
    scryfallQuery: 't:angel otag:lifegain',
    explanation: {
      readable: 'Angels with lifegain synergies',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'cheap green ramp spells': {
    scryfallQuery: 'otag:ramp c:g mv<=3',
    explanation: {
      readable: 'Green ramp spells costing 3 or less mana',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'cheap green ramp': {
    scryfallQuery: 'otag:ramp c:g mv<=3',
    explanation: {
      readable: 'Green ramp cards costing 3 or less mana',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'cards that protect my commander': {
    scryfallQuery: '(o:"hexproof" or o:"indestructible" or o:"protection" or o:"shroud" or o:"phase out" or o:"can\'t be the target")',
    explanation: {
      readable: 'Cards that protect creatures from removal',
      assumptions: [],
      confidence: 0.9,
    },
    showAffiliate: true,
  },
  'best mill cards': {
    scryfallQuery: 'otag:mill',
    explanation: {
      readable: 'Cards that mill opponents',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'best mana dorks': {
    scryfallQuery: 'otag:mana-dork',
    explanation: {
      readable: 'Creatures that produce mana',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'best commander board wipes': {
    scryfallQuery: 'otag:board-wipe f:commander',
    explanation: {
      readable: 'Board wipes legal in Commander',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'best commander card draw': {
    scryfallQuery: 'otag:draw f:commander',
    explanation: {
      readable: 'Card draw spells legal in Commander',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'commander board wipes': {
    scryfallQuery: 'otag:board-wipe f:commander',
    explanation: {
      readable: 'Board wipes legal in Commander',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'commander card draw': {
    scryfallQuery: 'otag:draw f:commander',
    explanation: {
      readable: 'Card draw spells legal in Commander',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'sacrifice an artifact to draw a card': {
    scryfallQuery: 'o:"sacrifice" o:"artifact" o:"draw a card"',
    explanation: {
      readable: 'Cards that sacrifice an artifact to draw',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  '2 or less cmc creatures that tap for mana': {
    scryfallQuery: 't:creature mv<=2 o:"{T}" o:"add"',
    explanation: {
      readable: 'Creatures with mana value 2 or less that tap for mana',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'damage doubler': {
    scryfallQuery: 'o:"double" o:"damage"',
    explanation: {
      readable: 'Cards that double damage',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'damage doublers': {
    scryfallQuery: 'o:"double" o:"damage"',
    explanation: {
      readable: 'Cards that double damage',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'landfall titania synergies': {
    scryfallQuery: 'otag:landfall c:g',
    explanation: {
      readable: 'Green landfall cards for Titania synergy',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'cards that draw when creatures die': {
    scryfallQuery: 'o:"whenever" o:"dies" o:"draw"',
    explanation: {
      readable: 'Cards that draw when creatures die',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'creatures that buff the board': {
    scryfallQuery: 't:creature (otag:lord or otag:anthem)',
    explanation: {
      readable: 'Creatures that buff other creatures (lords/anthems)',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'cards that untap permanents': {
    scryfallQuery: 'otag:untapper',
    explanation: {
      readable: 'Cards that untap permanents',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'untap permanents': {
    scryfallQuery: 'otag:untapper',
    explanation: {
      readable: 'Cards that untap permanents',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'common legendaries': {
    scryfallQuery: 'r:common t:legendary',
    explanation: {
      readable: 'Common rarity legendary cards',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'common legendary creatures': {
    scryfallQuery: 'r:common t:legendary t:creature',
    explanation: {
      readable: 'Common rarity legendary creatures',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'cards with red in the name': {
    scryfallQuery: 'name:red',
    explanation: {
      readable: 'Cards with "red" in their name',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'cast a spell get mana': {
    scryfallQuery: 'o:"whenever you cast" o:"add"',
    explanation: {
      readable: 'Cards that produce mana when you cast spells',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'free spells': {
    scryfallQuery: 'mv=0 -t:land',
    explanation: {
      readable: 'Spells with zero mana cost',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'protection from everything': {
    scryfallQuery: 'o:"protection from everything"',
    explanation: {
      readable: 'Cards with protection from everything',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'flash creatures': {
    scryfallQuery: 't:creature kw:flash',
    explanation: {
      readable: 'Creatures with flash',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'token doublers': {
    scryfallQuery: 'o:"if" o:"token" o:"twice that many"',
    explanation: {
      readable: 'Cards that double token creation',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'blink creatures': {
    scryfallQuery: 'otag:blink',
    explanation: {
      readable: 'Cards that exile and return permanents (blink)',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
  'stax pieces': {
    scryfallQuery: 'otag:hatebear',
    explanation: {
      readable: 'Hatebear/stax cards that restrict opponents',
      assumptions: [],
      confidence: 0.95,
    },
    showAffiliate: true,
  },
};

/**
 * Normalizes synonyms in a query for better cache/pattern matching.
 */
export function normalizeSynonyms(query: string): string {
  let normalized = query.toLowerCase();
  for (const [synonym, canonical] of Object.entries(SYNONYM_MAP)) {
    const regex = new RegExp(`\\b${synonym}\\b`, 'gi');
    normalized = normalized.replace(regex, canonical);
  }
  return normalized;
}

/**
 * Normalizes a query for pattern matching (order-independent, lowercase, no punctuation)
 */
export function normalizeQueryForMatching(query: string): string {
  const synonymNormalized = normalizeSynonyms(query);
  return synonymNormalized
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .sort()
    .join(' ');
}

/**
 * Returns a hardcoded translation hit when available.
 * This is synchronous and zero-latency, so callers can short-circuit before
 * any database/cache work.
 */
export function getHardcodedPatternMatch(
  query: string,
): CacheEntry['result'] | null {
  const normalizedLower = query.toLowerCase().trim();
  const hit = HARDCODED_TRANSLATIONS[normalizedLower];
  if (!hit) return null;

  logger.logInfo('hardcoded_pattern_match', { query });
  return hit;
}

/**
 * Checks translation_rules for an exact pattern match to bypass AI entirely.
 * Also checks hardcoded translations for warmup queries.
 * Returns the cached result format if a match is found.
 */
export async function checkPatternMatch(
  query: string,
  _filters?: Record<string, unknown> | null,
): Promise<CacheEntry['result'] | null> {
  // Check hardcoded translations first (zero latency)
  const hardcodedHit = getHardcodedPatternMatch(query);
  if (hardcodedHit) {
    return hardcodedHit;
  }

  const normalizedQuery = normalizeQueryForMatching(query);

  try {
    const { data: rules, error } = await supabase
      .from('translation_rules')
      .select('pattern, scryfall_syntax, confidence, description')
      .eq('is_active', true)
      .is('archived_at', null)
      .gte('confidence', 0.8);

    if (error || !rules || rules.length === 0) return null;

    for (const rule of rules) {
      const normalizedPattern = normalizeQueryForMatching(rule.pattern);
      if (normalizedPattern === normalizedQuery) {
        logger.logInfo('translation_pattern_match_found', {
          query,
          translatedQuery: rule.scryfall_syntax,
        });

        return {
          scryfallQuery: rule.scryfall_syntax,
          explanation: {
            readable: `Using predefined rule: ${rule.description || query}`,
            assumptions: [],
            confidence: rule.confidence,
          },
          showAffiliate: true,
        };
      }
    }
    return null;
  } catch (e) {
    logger.logWarn('translation_pattern_match_error', {
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}
