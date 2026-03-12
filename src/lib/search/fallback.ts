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
  'artifacts that tap for blue': 't:artifact o:"add" o:"{U}"',
  'lands that add any color': 't:land o:"add" o:"any color"',
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
  // Mono-color deck phrasing
  'mono white': 'id<=w',
  'mono-blue': 'id<=u',
  'mono blue': 'id<=u',
  'mono-black': 'id<=b',
  'mono black': 'id<=b',
  'mono-red': 'id<=r',
  'mono red': 'id<=r',
  'mono-green': 'id<=g',
  'mono green': 'id<=g',
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
 * Mana-production patterns recognized before filler stripping.
 * Matches phrases like "produce 2 mana", "add mana", "tap for mana".
 */
const MANA_COLOR_MAP: Record<string, string> = {
  white: '{W}', blue: '{U}', black: '{B}', red: '{R}', green: '{G}',
  colorless: '{C}', any: 'any color',
};

const MANA_PRODUCTION_PATTERNS: Array<{ regex: RegExp; syntax: string | ((m: RegExpMatchArray) => string) }> = [
  // "tap for <color>" e.g. "tap for blue", "tap for any color"
  { regex: /\b(?:tap for|produce|generate|add)\s+(white|blue|black|red|green|colorless|any(?:\s+color)?)\b/i,
    syntax: (m: RegExpMatchArray) => {
      const color = m[1].toLowerCase().replace(/\s+color$/, '');
      const symbol = MANA_COLOR_MAP[color] ?? 'any color';
      return `o:"add" o:"${symbol}"`;
    },
  },
  // "produce/generate/add X mana" or "tap for X mana"
  { regex: /\b(?:produce|generate|add|tap for)\s+(\d+)\s*(?:or more\s+)?mana\b/i, syntax: 'o:"add"' },
  // "produce/generate/add mana" (no number)
  { regex: /\b(?:produce|generate|add|tap for)\s+mana\b/i, syntax: 'o:"add" o:"{"' },
  // "mana production" / "mana producing"
  { regex: /\bmana[- ](?:production|producing)\b/i, syntax: 'o:"add" o:"{"' },
  // "add any color" / "any color of mana"
  { regex: /\b(?:add\s+)?any\s+color(?:\s+of\s+mana)?\b/i, syntax: 'o:"add" o:"any color"' },
  // "make/create treasure token(s)"
  { regex: /\b(?:make|create|generate)\s+treasure\s+tokens?\b/i, syntax: 'o:"create" o:"Treasure token"' },
];

/**
 * Build a best-effort Scryfall query from a natural language string.
 * Intended as a client-side fallback when the AI edge function is unreachable.
 */
/**
 * Detect if a query looks like a card name rather than a search description.
 * Card names are typically 1-6 title-cased words without search keywords.
 */
function isLikelyCardName(query: string): boolean {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/);
  if (words.length < 1 || words.length > 6) return false;

  const hasSearchKeywords = /\b(with|that|under|below|above|less|more|cheap|budget|from|legal|commander|deck|spells?|cards?|creatures?|artifacts?|enchantments?|lands?|instants?|sorcery|sorceries|produce|generate|create|make|draw|destroy|exile|return|search|find|tap for|best|good|great|top|payoffs?|synerg(?:y|ies))\b/i.test(trimmed);
  if (hasSearchKeywords) return false;

  // Check for possessives or title-cased words (typical card names)
  const hasPossessive = /\w's\b/.test(trimmed);
  const allCapitalized = words.every(w => /^[A-Z]/.test(w) || /^(of|the|and|to|in|for|a|an)$/i.test(w));

  // Single-word MTG terms that are NOT card names
  const singleWordMtgTerms = /^(flying|trample|haste|deathtouch|lifelink|vigilance|reach|menace|flash|hexproof|indestructible|ward|defender|infect|prowess|cascade|storm|ramp|removal|mill|blink|tokens?|sacrifice|voltron|aristocrats|reanimation|lifegain|tutor|counterspell|boardwipe|flicker|cycling|landfall|scry|proliferate|populate|red|blue|green|white|black|colorless|multicolor|mono|tribal|burn|bounce|copy|clone|theft|discard|anthem|lord|stax|hatebear|aggro|combo|midrange|tempo|control|prison|equipment|aura|ping)$/i;
  if (words.length === 1 && singleWordMtgTerms.test(trimmed)) return false;
  if (words.length === 1 && !singleWordMtgTerms.test(trimmed) && allCapitalized) return true;

  if (hasPossessive || (allCapitalized && words.length >= 2)) return true;

  // For 2-3 word lowercase queries: if no word is a search keyword, MTG keyword,
  // or common filler, it's likely a card name (e.g., "sol ring", "dark ritual")
  if (words.length >= 2 && words.length <= 3) {
    const fillerWords = /^(the|and|for|are|but|not|you|all|can|had|her|was|one|our|out|day|get|has|him|his|how|its|may|new|now|old|see|way|who|any|big|few|got|let|say|she|too|use|why|try|ask|run|own|put|set|end|low|high|far|long|last|next|much|take|come|make|give|look|help|turn|play|move|live|find|work|tell|call|keep|hand|pick|part|free|full|open|show|hard|fast|real|good|best|great|cool|nice|small|power|my|your|its|some|every|each|other|most)$/i;
    const noFiller = words.every(w => !fillerWords.test(w));
    const noMtgKeyword = words.every(w => !singleWordMtgTerms.test(w));
    if (noFiller && noMtgKeyword) return true;
  }

  return false;
}

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

  // Check if this looks like a card name — use exact name search
  if (isLikelyCardName(naturalQuery)) {
    return `!"${naturalQuery.trim()}"`;
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

  // 3. Extract mana-production patterns EARLY (before colors consume "red", "blue", etc.)
  for (const { regex, syntax } of MANA_PRODUCTION_PATTERNS) {
    const match = residual.match(regex);
    if (match) {
      const resolved = typeof syntax === 'function' ? syntax(match) : syntax;
      for (const part of resolved.split(' ')) {
        if (!parts.includes(part)) {
          parts.push(part);
        }
      }
      residual = residual.replace(regex, ' ').trim();
      break;
    }
  }

  // 4. Extract guild/shard colors
  for (const [word, syntax] of Object.entries(GUILD_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 5. Extract colors
  for (const [word, syntax] of Object.entries(COLOR_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 6. Extract types
  for (const [word, syntax] of Object.entries(TYPE_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 7. Extract formats
  for (const [word, syntax] of Object.entries(FORMAT_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 8. Extract single-word keywords
  for (const [word, syntax] of Object.entries(KEYWORD_WORDS)) {
    if (word.includes(' ')) continue;
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 9. Extract cost modifiers
  for (const [word, syntax] of Object.entries(COST_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 10. Clean up filler words from residual
  residual = residual
    .replace(
      /\b(that|the|with|for|and|or|a|an|in|of|to|make|spells?|bonuses?|reward|casting|gives?|when|dies?|deal|drain|legal|cards?|pieces?|fit|into|style|deck|is|mono)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();

  // 11. If there's meaningful residual, add as oracle text search
  if (residual.length > 2) {
    parts.push(`o:"${residual}"`);
  }

  // If nothing was extracted, return original as a name search
  if (parts.length === 0) {
    return `!"${naturalQuery.trim()}"`;
  }

  return parts.join(' ');
}
