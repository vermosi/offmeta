/**
 * Client-side fallback query builder.
 * Used when the edge function is unavailable to produce a
 * best-effort Scryfall query from natural language input.
 * @module lib/search/fallback
 */

/**
 * Pre-translated queries for known guide and archetype searches.
 * These bypass all parsing and return the exact Scryfall query.
 */
const PRETRANSLATED: Record<string, string> = {
  // Guides
  'dragons': 't:dragon',
  'mono red creatures': 'id=r t:creature',
  'budget board wipes under $5': 'otag:boardwipe usd<5',
  'commander staples under $3': 'f:commander usd<3',
  'creatures with flying and deathtouch': 't:creature kw:flying kw:deathtouch',
  'green ramp spells that search for lands': 'c:g otag:mana-ramp o:"search your library" o:"basic land"',
  'elf tribal payoffs for commander': 't:elf f:commander (o:"elf" o:"you control" or o:"elf" o:"+1/+1")',
  'creatures that make token creatures when an opponent takes an action': 't:creature o:"whenever" o:"opponent" o:"create" o:"token"',
  'cards that double etb effects': 'o:"enters the battlefield" o:"triggers an additional time"',
  'utility lands for commander in esper under $5': 't:land -t:basic id<=wub f:commander usd<5',
  // Archetypes
  'equipment or auras that give bonuses to equipped or enchanted permanent for commander': '(t:equipment or t:aura) (o:"equipped creature" or o:"enchanted creature") f:commander',
  'creatures that deal damage or drain life when a creature dies for commander': 't:creature o:"whenever" (o:"dies" or o:"creature dies") (o:"deals" or o:"lose" or o:"drain") f:commander',
  'blue red instants or sorceries that reward casting spells for commander': 'id<=ur (t:instant or t:sorcery or o:"whenever you cast") f:commander',
  'selesnya cards that create creature tokens for commander': 'id<=gw o:"create" o:"token" f:commander',
  'black cards that return creatures from graveyard to battlefield for commander': 'c:b o:"return" o:"from" o:"graveyard" o:"battlefield" f:commander',
  'white cards that restrict or tax opponents for commander': 'c:w (o:"opponents" or o:"each opponent") (o:"pay" or o:"can\'t" or o:"cost" o:"more") f:commander',
  'simic cards that let all players draw cards or gain mana for commander': 'id<=gu (o:"each player" or o:"all players") (o:"draw" or o:"add") f:commander',
  'cards that mill opponents or put cards from library into graveyard for commander': '(o:"mill" or (o:"library" o:"graveyard")) f:commander',
  'landfall cards legal in commander': 'otag:landfall f:commander',
  'orzhov cards that gain life or care about lifegain triggers for commander': 'id<=wb (o:"gain" o:"life" or o:"whenever" o:"life") f:commander',
  'selesnya creatures that add or care about +1/+1 counters for commander': 'id<=gw t:creature o:"+1/+1 counter" f:commander',
  'azorius cards that exile and return permanents or have etb effects for commander': 'id<=wu (o:"exile" o:"return" or o:"enters the battlefield") f:commander',
  'izzet cards that make all players discard and draw for commander': 'id<=ur o:"each player" o:"discard" o:"draw" f:commander',
  'golgari cards that recur from graveyard or benefit from creatures dying for commander': 'id<=bg (o:"from your graveyard" or o:"whenever" o:"dies") f:commander',
  'planeswalkers or cards that proliferate or protect planeswalkers for commander': '(t:planeswalker or o:"proliferate" or o:"planeswalker" o:"protect") f:commander',
  'selesnya enchantments or creatures that draw cards when enchantments enter for commander': 'id<=gw (t:enchantment or t:creature) o:"enchantment" o:"draw" f:commander',
  'simic creatures with infect or proliferate for commander': 'id<=gu (kw:infect or o:"proliferate") f:commander',
  'treasure token cards legal in commander': 'o:"treasure" o:"token" f:commander',
  'izzet cards with storm or that copy spells or reduce spell costs for commander': 'id<=ur (kw:storm or o:"copy" o:"spell" or o:"costs" o:"less") f:commander',
  'chaos cards legal in commander': '(o:"coin" or o:"random" or o:"chaos") f:commander',
  'tribal lords legal in commander': '(otag:lord or otag:anthem) f:commander',
  'azorius enchantments or artifacts that prevent attacks or tax attackers for commander': 'id<=wu (t:enchantment or t:artifact) (o:"can\'t attack" or o:"attacks" o:"pay") f:commander',
  'azorius counterspells or board wipes or removal for commander': 'id<=wu (otag:counter or otag:boardwipe or otag:removal) f:commander',
};

/** Common MTG slang → Scryfall syntax fragments */
const SLANG_MAP: Record<string, string> = {
  'mana rocks': 't:artifact o:"add" o:"{"',
  'mana rock': 't:artifact o:"add" o:"{"',
  'mana dorks': 't:creature o:"add" o:"{"',
  'mana dork': 't:creature o:"add" o:"{"',
  'board wipes': 'otag:boardwipe',
  'board wipe': 'otag:boardwipe',
  'boardwipe': 'otag:boardwipe',
  'boardwipes': 'otag:boardwipe',
  counterspells: 'otag:counter',
  counterspell: 'otag:counter',
  'card draw': 'otag:draw',
  ramp: 'otag:ramp',
  removal: 'otag:removal',
  tutor: 'otag:tutor',
  tutors: 'otag:tutor',
  lifegain: 'otag:lifegain',
  mill: 'otag:mill',
  blink: 'otag:blink',
  flicker: 'otag:flicker',
  reanimation: 'otag:reanimate',
  reanimate: 'otag:reanimate',
  'treasure tokens': 'o:"create" o:"treasure"',
  'treasure token': 'o:"create" o:"treasure"',
  treasure: 'o:"treasure"',
  // Archetype slang
  aristocrats: 'o:"when" o:"dies"',
  voltron: '(t:equipment or t:aura)',
  spellslinger: '(t:instant or t:sorcery)',
  tokens: 'o:"create" o:"token"',
  sacrifice: 'o:"sacrifice"',
};

const COLOR_WORDS: Record<string, string> = {
  white: 'c:w',
  blue: 'c:u',
  black: 'c:b',
  red: 'c:r',
  green: 'c:g',
  colorless: 'c:c',
};

/** Guild / shard color identity pairs */
const GUILD_WORDS: Record<string, string> = {
  azorius: 'id<=wu',
  dimir: 'id<=ub',
  rakdos: 'id<=br',
  gruul: 'id<=rg',
  selesnya: 'id<=gw',
  orzhov: 'id<=wb',
  izzet: 'id<=ur',
  golgari: 'id<=bg',
  boros: 'id<=rw',
  simic: 'id<=gu',
};

const TYPE_WORDS: Record<string, string> = {
  creature: 't:creature',
  creatures: 't:creature',
  artifact: 't:artifact',
  artifacts: 't:artifact',
  enchantment: 't:enchantment',
  enchantments: 't:enchantment',
  instant: 't:instant',
  instants: 't:instant',
  sorcery: 't:sorcery',
  sorceries: 't:sorcery',
  planeswalker: 't:planeswalker',
  planeswalkers: 't:planeswalker',
  land: 't:land',
  lands: 't:land',
  equipment: 't:equipment',
  equipments: 't:equipment',
  aura: 't:aura',
  auras: 't:aura',
};

const COST_WORDS: Record<string, string> = {
  cheap: 'mv<=3',
  low: 'mv<=2',
  expensive: 'mv>=6',
  high: 'mv>=5',
};

/** Format words */
const FORMAT_WORDS: Record<string, string> = {
  commander: 'f:commander',
  edh: 'f:commander',
  standard: 'f:standard',
  modern: 'f:modern',
  pioneer: 'f:pioneer',
  legacy: 'f:legacy',
  vintage: 'f:vintage',
  pauper: 'f:pauper',
  brawl: 'f:brawl',
  historic: 'f:historic',
};

/** Keyword abilities → kw: operator */
const KEYWORD_WORDS: Record<string, string> = {
  flying: 'kw:flying',
  trample: 'kw:trample',
  deathtouch: 'kw:deathtouch',
  lifelink: 'kw:lifelink',
  haste: 'kw:haste',
  vigilance: 'kw:vigilance',
  menace: 'kw:menace',
  reach: 'kw:reach',
  hexproof: 'kw:hexproof',
  indestructible: 'kw:indestructible',
  flash: 'kw:flash',
  defender: 'kw:defender',
  infect: 'kw:infect',
  prowess: 'kw:prowess',
  ward: 'kw:ward',
  cascade: 'kw:cascade',
  'first strike': 'kw:first-strike',
  'double strike': 'kw:double-strike',
};

/**
 * Build a best-effort Scryfall query from a natural language string.
 * Intended as a client-side fallback when the AI edge function is unreachable.
 */
export function buildClientFallbackQuery(naturalQuery: string): string {
  const lower = naturalQuery.toLowerCase().trim();
  if (!lower) return '';

  // Check pre-translated queries first (exact match)
  if (PRETRANSLATED[lower]) {
    return PRETRANSLATED[lower];
  }

  const parts: string[] = [];
  let residual = lower;

  // 1. Check multi-word keyword phrases first
  for (const [phrase, syntax] of Object.entries(KEYWORD_WORDS)) {
    if (phrase.includes(' ') && residual.includes(phrase)) {
      parts.push(syntax);
      residual = residual.replace(phrase, ' ').trim();
    }
  }

  // 2. Check full slang phrases (longest match)
  const sortedSlang = Object.entries(SLANG_MAP).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [phrase, syntax] of sortedSlang) {
    if (residual.includes(phrase)) {
      parts.push(syntax);
      residual = residual.replace(phrase, ' ').trim();
    }
  }

  // 3. Extract guild/shard colors
  for (const [word, syntax] of Object.entries(GUILD_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 4. Extract colors
  for (const [word, syntax] of Object.entries(COLOR_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 5. Extract types
  for (const [word, syntax] of Object.entries(TYPE_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 6. Extract formats
  for (const [word, syntax] of Object.entries(FORMAT_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 7. Extract single-word keywords
  for (const [word, syntax] of Object.entries(KEYWORD_WORDS)) {
    if (word.includes(' ')) continue; // already handled
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 8. Extract cost modifiers
  for (const [word, syntax] of Object.entries(COST_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 9. Clean up filler words from residual
  residual = residual
    .replace(
      /\b(that|the|with|for|and|or|a|an|in|of|to|make|produce|spells?|bonuses?|reward|casting|gives?|when|dies?|deal|drain|legal|cards?|pieces?)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();

  // 10. If there's meaningful residual, add as oracle text search
  if (residual.length > 2) {
    parts.push(`o:"${residual}"`);
  }

  // If nothing was extracted, return original as a name search
  if (parts.length === 0) {
    return naturalQuery.trim();
  }

  return parts.join(' ');
}
