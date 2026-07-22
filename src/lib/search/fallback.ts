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
export const PRETRANSLATED: Record<string, string> = {
  // Guides
  'dragons': 't:dragon',
  'mono red creatures': 'id=r t:creature',
  'budget board wipes under $5': 'otag:boardwipe usd<5',
  'budget board wipes under 5': 'otag:boardwipe usd<5',
  'find budget board wipes under $5': 'otag:boardwipe usd<5',
  'find budget board wipes under 5': 'otag:boardwipe usd<5',
  // Tribal lords
  'elf lords': 't:elf (otag:lord or otag:anthem)',
  'goblin lords': 't:goblin (otag:lord or otag:anthem)',
  'zombie lords': 't:zombie (otag:lord or otag:anthem)',
  'merfolk lords': 't:merfolk (otag:lord or otag:anthem)',
  'vampire lords': 't:vampire (otag:lord or otag:anthem)',
  'dragon lords': 't:dragon (otag:lord or otag:anthem)',
  'commander staples under $3': 'f:commander usd<3',
  'creatures with flying and deathtouch': 't:creature kw:flying kw:deathtouch',
  'green ramp spells that search for lands': 'c:g otag:mana-ramp o:"search your library" o:"basic land"',
  'elf tribal payoffs for commander': 't:elf f:commander (o:"elf" o:"you control" or o:"elf" o:"+1/+1")',
  'creatures that make token creatures when an opponent takes an action': 't:creature o:"whenever" o:"opponent" o:"create" o:"token"',
  'mana rocks that cost 2': 't:artifact mv=2 (o:"add" o:"{")',
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
  'mana fixing': '(t:land or t:artifact) (o:"add" or o:"search" or o:"any color")',
  'vintage cube staples': 'f:vintage (otag:ramp or otag:draw or otag:removal or otag:counter or otag:boardwipe)',
  'draw a card': 'otag:draw',
  'draw two cards': 'otag:draw',
  'draw three cards': 'otag:draw',
  'power greater than toughness': 'pow>tou',
  'toughness greater than power': 'tou>pow',
};

/** Common MTG slang → Scryfall syntax fragments */
const SLANG_MAP: Record<string, string> = {
  'mana rocks': 't:artifact o:"add" o:"{"',
  'mana rock': 't:artifact o:"add" o:"{"',
  'mana dorks': 't:creature o:"add" o:"{"',
  'mana dork': 't:creature o:"add" o:"{"',
  'mana fixing': '(t:land or t:artifact) (o:"add" or o:"search" or o:"any color")',
  'vintage cube staples': 'f:vintage (otag:ramp or otag:draw or otag:removal or otag:counter or otag:boardwipe)',
  'draw a card': 'otag:draw',
  'draw two cards': 'otag:draw',
  'draw three cards': 'otag:draw',
  'power greater than toughness': 'pow>tou',
  'toughness greater than power': 'tou>pow',
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
  mil: 'otag:mill',
  'mana burn': 'o:"mana burn"',
  'combat evasion': '(kw:flying or kw:menace or kw:trample or kw:unblockable or kw:shadow or kw:fear or kw:intimidate or kw:skulk or o:"can\'t be blocked")',
  'mass combat evasion': '(kw:flying or kw:menace or kw:trample or o:"can\'t be blocked") o:"creatures you control"',
  'untap target permanent': 'o:"untap target permanent"',
  'play off top': 'o:"play the top card of your library"',
  'play off the top': 'o:"play the top card of your library"',
  blink: 'otag:blink',
  flicker: 'otag:flicker',
  reanimation: 'otag:reanimate',
  reanimate: 'otag:reanimate',
  'treasure tokens': 'o:"create" o:"treasure"',
  'treasure token': 'o:"create" o:"treasure"',
  treasure: 'o:"treasure"',
  'discard outlets': 'o:"discard a card"',
  'discard outlet': 'o:"discard a card"',
  'protection spells': '(kw:hexproof or kw:indestructible or o:"protection from")',
  'protection spell': '(kw:hexproof or kw:indestructible or o:"protection from")',
  'sacrifice outlets': 'o:"sacrifice" -o:"opponent"',
  'sacrifice outlet': 'o:"sacrifice" -o:"opponent"',
  'sac outlets': 'o:"sacrifice" -o:"opponent"',
  'sac outlet': 'o:"sacrifice" -o:"opponent"',
  'graveyard hate': 'o:"exile" o:"graveyard"',
  'extra turns': 'o:"extra turn"',
  'extra turn': 'o:"extra turn"',
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

/**
 * Strategy-hate / hoser patterns.
 * Match "cards that punish/hate/hose/stop/shut down X decks" BEFORE
 * SLANG_MAP so we don't collapse "punish treasure decks" → o:"treasure".
 * These are used by the client-side fallback when the AI edge times out.
 */
const HATE_VERB = String.raw`(?:punish(?:es|ing)?|hate|hates|hoses?|hosed|hosers?|stop|stops|shut(?:s|ting)?\s+down|beat[s]?|counter[s]?|anti[- ]?)`;
const HATE_SUFFIX = String.raw`(?:\s+(?:decks?|strateg(?:y|ies)|players?|based|token))?`;
const STRATEGY_HATE_PATTERNS: Array<{ regex: RegExp; syntax: string }> = [
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:treasure|artifact(?:\s+token)?|affinity|mud|urza)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(otag:artifact-removal or o:"activated abilities of artifacts" or o:"artifacts your opponents control" or o:"noncreature artifacts")',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:graveyard|reanimator|reanimation|dredge|mill|self[- ]?mill)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(otag:graveyard-hate or (o:"exile" o:"graveyard") or o:"can\'t be cast from")',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:storm|spellslinger|spells?|instants?\s+and\s+sorceries?|combo)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"can\'t cast more than" or (o:"whenever" o:"opponent" o:"casts") or otag:hatebear or (o:"spells cost" o:"more"))',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?tokens?${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax: '(o:"tokens can\'t" or o:"exile all tokens" or o:"destroy all tokens")',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:life\s?gain|life)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"can\'t gain life" or o:"lose life instead" or (o:"whenever" o:"gains life"))',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:ramp|land[- ]?ramp|lands|mana)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"can\'t search" or o:"can\'t play additional lands" or (o:"skip" o:"land") or otag:hatebear)',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?tutors?${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax: '(o:"can\'t search" or otag:hatebear)',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:draw|card[- ]?draw|wheel|blue)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '((o:"whenever" o:"opponent" o:"draws") or (o:"skip" o:"draw") or o:"can\'t draw more than" or otag:hatebear)',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:aggro|creature|go[- ]?wide|weenie|swarm)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax: '(otag:boardwipe or o:"deals damage to each creature")',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?enchantments?${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax: '(o:"destroy" o:"enchantment" or o:"exile" o:"enchantment")',
  },
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:control|counterspell|counter\s?magic|permission)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"can\'t be countered" or (o:"whenever" o:"opponent" o:"counters") or otag:hatebear)',
  },
  // Planeswalker hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:planeswalkers?|superfriends|walkers?)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"destroy target planeswalker" or o:"deals damage to" o:"planeswalker" or otag:planeswalker-removal)',
  },
  // Discard / hand hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:hand|hand\s+size|discard|8[- ]?rack|rack)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(otag:discard or o:"discards a card" or o:"maximum hand size" or o:"reveal your hand")',
  },
  // Flying / evasion hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:flying|fliers?|flyers?|air|dragons?|angels?)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"destroy all creatures with flying" or o:"damage to each creature with flying" or o:"creatures with flying can\'t")',
  },
  // Tribal / creature-type hate (generic)
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:tribal|humans?|elf|elves|elfs|goblins?|zombies?|vampires?|merfolk|slivers?|dinosaurs?|cats?|wizards?|warriors?|soldiers?)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax: '(otag:boardwipe or o:"destroy all creatures" or o:"protection from")',
  },
  // Big mana / Eldrazi / ramp payoff hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:eldrazi|big\s+mana|tron|cheat(?:ing)?(?:\s+into\s+play)?|reanimate)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"can\'t be cast" or o:"put onto the battlefield" or otag:stax or otag:hatebear)',
  },
  // Infect / poison hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:infect|poison|toxic|proliferate)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"remove all poison" or o:"you can\'t get poison counters" or o:"prevent all damage")',
  },
  // Voltron / equipment / auras hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:voltron|equipment|equipped|auras?|enchanted\s+creature)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"destroy target equipment" or o:"destroy all equipment" or o:"destroy all auras" or o:"return" o:"equipment")',
  },
  // Aristocrats / sacrifice hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:aristocrats?|sacrifice|sac(?:\s+outlets?)?|death\s?trigger)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"can\'t be sacrificed" or o:"if a creature would die" o:"exile it instead" or o:"leyline of the void")',
  },
  // Blink / flicker / etb hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:blink|flicker|flash|etb|enter[- ]?the[- ]?battlefield)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"enter the battlefield" o:"don\'t" or o:"can\'t enter the battlefield" or otag:stax)',
  },
  // Landfall / lands-matter hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:landfall|lands?[- ]?matter)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"destroy target land" or o:"can\'t play additional lands" or otag:land-destruction)',
  },
  // Group hug / extra cards / extra turns hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:group\s?hug|extra\s+turns?|time\s?walk|chain\s+of\s+turns?)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"can\'t take extra turns" or o:"skip" o:"turn" or o:"opponents can\'t draw more than")',
  },
  // Stax / prison hate (players hating stax)
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:stax|prison|lock(?:down)?|mld|mass\s+land\s+destruction)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"destroy all" o:"artifacts" or o:"destroy all" o:"enchantments" or otag:enchantment-removal or otag:artifact-removal)',
  },
  // Enchantress / enchantments-matter hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:enchantress|enchantments?[- ]?matter|bogles?)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(otag:enchantment-removal or o:"destroy all enchantments" or o:"exile all enchantments")',
  },
  // Counters / proliferate / +1/+1 hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:\+1\/\+1|plus\s*one|counters?|counter[s]?[- ]?matter)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"remove all counters" or o:"can\'t have counters" or o:"counters can\'t be put")',
  },
  // Madness / cycling / discard-payoff hate
  {
    regex: new RegExp(
      String.raw`\b(?:cards?\s+(?:that\s+)?)?${HATE_VERB}\s+(?:the\s+)?(?:madness|cycling|hollow\s+one)${HATE_SUFFIX}\b`,
      'i',
    ),
    syntax:
      '(o:"if a card would be put into" o:"graveyard" o:"exile it instead" or otag:graveyard-hate)',
  },
];


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
  // Guilds (2-color)
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
  // Shards (3-color)
  esper: 'id<=wub',
  grixis: 'id<=ubr',
  jund: 'id<=brg',
  naya: 'id<=rgw',
  bant: 'id<=gwu',
  // Wedges (3-color)
  mardu: 'id<=rwb',
  temur: 'id<=gur',
  abzan: 'id<=wbg',
  jeskai: 'id<=urw',
  sultai: 'id<=bgu',
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

/** Common creature/card subtypes */
const SUBTYPE_WORDS: Record<string, string> = {
  angel: 't:angel', angels: 't:angel',
  dragon: 't:dragon', dragons: 't:dragon',
  elf: 't:elf', elves: 't:elf',
  goblin: 't:goblin', goblins: 't:goblin',
  zombie: 't:zombie', zombies: 't:zombie',
  vampire: 't:vampire', vampires: 't:vampire',
  demon: 't:demon', demons: 't:demon',
  spirit: 't:spirit', spirits: 't:spirit',
  human: 't:human', humans: 't:human',
  wizard: 't:wizard', wizards: 't:wizard',
  warrior: 't:warrior', warriors: 't:warrior',
  soldier: 't:soldier', soldiers: 't:soldier',
  merfolk: 't:merfolk',
  elemental: 't:elemental', elementals: 't:elemental',
  sliver: 't:sliver', slivers: 't:sliver',
  dinosaur: 't:dinosaur', dinosaurs: 't:dinosaur',
  knight: 't:knight', knights: 't:knight',
  cleric: 't:cleric', clerics: 't:cleric',
  rogue: 't:rogue', rogues: 't:rogue',
  pirate: 't:pirate', pirates: 't:pirate',
  cat: 't:cat', cats: 't:cat',
  dog: 't:dog', dogs: 't:dog',
  bird: 't:bird', birds: 't:bird',
  beast: 't:beast', beasts: 't:beast',
  faerie: 't:faerie', faeries: 't:faerie',
  phyrexian: 't:phyrexian',
  fungus: 't:fungus',
  saproling: 't:saproling',
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
export function isLikelyCardName(query: string): boolean {
  const trimmed = query.trim();
  const words = trimmed.split(/\s+/);
  if (words.length < 1 || words.length > 6) return false;

  const hasSearchKeywords = /\b(with|that|under|below|above|less|more|cheap|budget|from|legal|commander|deck|spells?|cards?|creatures?|artifacts?|enchantments?|lands?|instants?|sorcery|sorceries|produce|generate|create|make|draw|search|find|tap for|best|good|great|top|payoffs?|synerg(?:y|ies)|released|after|before|since|until|mana|rocks?|wipes?|board|ramp|removal)\b/i.test(trimmed);
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
 * Extract a candidate card name from a natural-language query.
 * Handles patterns like "cards like X", "similar to X", "X alternatives",
 * "cheap alternatives to X", "cards similar to X", plus bare card names.
 *
 * Returns the extracted name, or null if the query doesn't look name-shaped.
 * Used to power the fuzzy-name recovery step for zero-result searches.
 */
export function extractCardNameCandidate(query: string): string | null {
  let trimmed = query.trim();
  if (!trimmed) return null;

  // Strip trailing punctuation ("?", ".", "!") and stray quotes
  trimmed = trimmed.replace(/[?!.]+$/u, '').replace(/^["']|["']$/g, '').trim();
  if (!trimmed) return null;

  // Strip trailing format qualifiers: "sol ring in commander" → "sol ring"
  // (Only when the format word is at the very end — mid-sentence "in commander"
  //  is left alone so descriptive queries still fail the keyword check below.)
  const FORMAT_WORDS =
    'commander|edh|modern|legacy|vintage|standard|pioneer|pauper|brawl|historic|explorer|alchemy|premodern|penny|oathbreaker|timeless';
  const trailingFormat = new RegExp(
    `^(.+?)\\s+(?:in|for|legal\\s+in)\\s+(?:${FORMAT_WORDS})$`,
    'i',
  );
  const fmtMatch = trimmed.match(trailingFormat);
  if (fmtMatch) trimmed = fmtMatch[1].trim();

  // Strip common "similar to / like / alternative / replacement" wrappers
  const patterns: RegExp[] = [
    // "what/which card(s) is/are like|similar to X", "whats a card like X"
    /^(?:what(?:'?s|\s+is)?|which)\s+(?:a\s+)?cards?\s+(?:is\s+|are\s+)?(?:like|similar\s+to)\s+(.+)$/i,
    // "is there a card like|similar to X"
    /^(?:is\s+there\s+)?(?:a\s+)?cards?\s+(?:that\s+(?:is|works?|plays?)\s+)?(?:like|similar\s+to)\s+(.+)$/i,
    // "cards (that are) similar to|like X"
    /^cards?\s+(?:that\s+are\s+)?(?:similar\s+to|like)\s+(.+)$/i,
    // "similar (cards) to X"
    /^similar\s+(?:cards?\s+)?to\s+(.+)$/i,
    // "cheap|budget alternatives/replacements to|for X"
    /^(?:cheap|budget)\s+(?:alternatives?|replacements?)\s+(?:to|for)\s+(.+)$/i,
    // "alternatives|replacements to|for X"
    /^(?:alternatives?|replacements?)\s+(?:to|for)\s+(.+)$/i,
    // Trailing: "X (cheap|budget) alternatives|replacements"
    /^(.+?)\s+(?:cheap|budget)?\s*(?:alternatives?|replacements?)$/i,
    /^(.+?)\s+alternative$/i,
    // "X but cheaper|budget|better"
    /^(.+?)\s+but\s+(?:cheaper|budget|better)$/i,
  ];

  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) {
      const inner = match[1].trim().replace(/^["']|["']$/g, '').trim();
      // Reject if the extracted piece still looks like a description
      if (inner.length >= 3 && inner.split(/\s+/).length <= 6) {
        return inner;
      }
    }
  }

  // Bare card name (with typos allowed — fuzzy resolver handles them)
  if (isLikelyCardName(trimmed)) return trimmed;

  // Short, non-keyword-y phrase (1–4 words) — worth a fuzzy attempt
  const words = trimmed.split(/\s+/);
  if (words.length >= 1 && words.length <= 4) {
    const hasKeywords = /\b(with|that|under|below|above|less|more|cheap|budget|from|legal|commander|deck|spells?|create|make|search|find|tap|produce|generate)\b/i.test(trimmed);
    if (!hasKeywords) return trimmed;
  }

  return null;
}

/**
 * Build a best-effort Scryfall query from a natural language string.
 * Intended as a client-side fallback when the AI edge function is unreachable.
 */
export function buildClientFallbackQuery(naturalQuery: string): string {
  const lower = naturalQuery.toLowerCase().trim();
  if (!lower) return '';

  // Check pre-translated queries first (exact match). Use `hasOwn` so inputs
  // like "__proto__" or "toString" don't resolve to inherited object members.
  if (Object.prototype.hasOwnProperty.call(PRETRANSLATED, lower)) {
    const pre = PRETRANSLATED[lower];
    if (typeof pre === 'string') return pre;
  }

  // Check if this looks like a card name — use exact name search.
  // Strip characters that would break Scryfall's `!"..."` exact-name syntax.
  if (isLikelyCardName(naturalQuery)) {
    const safe = naturalQuery.trim().replace(/["()]/g, '').replace(/\s+/g, ' ').trim();
    if (safe) return `!"${safe}"`;
    return '';
  }

  const parts: string[] = [];
  let residual = lower;

  // 0. Strategy-hate / hoser phrases MUST run before SLANG_MAP so
  //    "punish treasure decks" doesn't collapse to o:"treasure".
  //    Multi-intent requests like "punish treasure decks and stop tokens"
  //    collect every matching hate clause, then combine them with OR so
  //    the compound query surfaces cards that hit either strategy.
  const hateMatches: string[] = [];
  for (const { regex, syntax } of STRATEGY_HATE_PATTERNS) {
    if (regex.test(residual)) {
      if (!hateMatches.includes(syntax)) {
        hateMatches.push(syntax);
      }
      residual = residual.replace(regex, ' ').trim();
    }
  }
  if (hateMatches.length === 1) {
    parts.push(hateMatches[0]);
  } else if (hateMatches.length > 1) {
    parts.push(`(${hateMatches.join(' or ')})`);
  }

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

  // 5b. Extract "search for X from library" patterns BEFORE type extraction
  // Otherwise "artifact" in "search for an artifact" gets consumed as t:artifact
  const searchForMatch = residual.match(/\b(?:search|find|tutor|look)\s+(?:for\s+)?(?:an?\s+)?(artifact|creature|enchantment|instant|sorcery|land|equipment)\s*(?:from|in)?\s*(?:my|your|the)?\s*(?:library|deck)?\b/i);
  if (searchForMatch) {
    const targetType = searchForMatch[1].toLowerCase();
    parts.push(`o:"search your library" o:"${targetType}"`);
    residual = residual.replace(searchForMatch[0], ' ').trim();
  }

  // 5c. Extract negated types BEFORE positive types
  // "aren't creatures" / "not creatures" / "non-creature" → -t:creature
  const negatedTypes = ['creature', 'artifact', 'enchantment', 'instant', 'sorcery', 'land', 'planeswalker'];
  for (const type of negatedTypes) {
    const negPatterns = [
      new RegExp(`\\b(?:aren'?t|isn'?t|not)\\s+${type}s?\\b`, 'gi'),
      new RegExp(`\\bnon[-\\s]?${type}s?\\b`, 'gi'),
      new RegExp(`\\b(?:no|without)\\s+${type}s?\\b`, 'gi'),
    ];
    for (const negPattern of negPatterns) {
      if (negPattern.test(residual)) {
        parts.push(`-t:${type}`);
        residual = residual.replace(negPattern, ' ').trim();
      }
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

  // 6b. Extract subtypes (angel, dragon, elf, etc.)
  for (const [word, syntax] of Object.entries(SUBTYPE_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      if (!parts.includes(syntax)) {
        parts.push(syntax);
      }
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

  // 9a. Extract "under/less than/below N mana" → mv<N (before generic cost words)
  const manaValueMatch = residual.match(/\b(?:under|less than|below)\s+(\d+)\s+mana\b/i);
  if (manaValueMatch) {
    parts.push(`mv<${manaValueMatch[1]}`);
    residual = residual.replace(manaValueMatch[0], ' ').trim();
  } else {
    // "costs N or less" / "N mana or less"
    const mvOrLessMatch = residual.match(/\b(?:costs?\s+)?(\d+)\s+(?:mana\s+)?or\s+less\b/i);
    if (mvOrLessMatch) {
      parts.push(`mv<=${mvOrLessMatch[1]}`);
      residual = residual.replace(mvOrLessMatch[0], ' ').trim();
    }
  }

  // 9b. Extract "under $N" / "under N dollars" → usd<N (price)
  const priceMatch = residual.match(/\b(?:under|less than|below)\s+\$?\s*(\d+(?:\.\d+)?)\s*(?:dollars?)?\b/i);
  if (priceMatch) {
    parts.push(`usd<${priceMatch[1]}`);
    residual = residual.replace(priceMatch[0], ' ').trim();
  }

  // 9c. Extract generic cost modifiers (cheap, expensive, etc.)
  for (const [word, syntax] of Object.entries(COST_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    if (re.test(residual)) {
      parts.push(syntax);
      residual = residual.replace(re, ' ').trim();
    }
  }

  // 10. Extract year constraints (e.g., "released after 2020", "before 2019", "since 2021")
  const yearMatch = residual.match(/\b(?:released?\s+)?(?:after|since)\s+((?:19|20)\d{2})\b/i);
  if (yearMatch) {
    parts.push(`year>${yearMatch[1]}`);
    residual = residual.replace(yearMatch[0], ' ').trim();
  } else {
    const yearBeforeMatch = residual.match(/\b(?:released?\s+)?(?:before|until)\s+((?:19|20)\d{2})\b/i);
    if (yearBeforeMatch) {
      parts.push(`year<${yearBeforeMatch[1]}`);
      residual = residual.replace(yearBeforeMatch[0], ' ').trim();
    }
  }

  // 11. Clean up filler words from residual
  residual = residual
    .replace(
      /\b(that|the|with|for|and|or|plus|also|as|well|a|an|in|of|to|make|spells?|bonuses?|reward|casting|gives?|when|dies?|deal|drain|legal|cards?|pieces?|fit|into|style|deck|is|mono|theme|build|strategy|let|me|my|your|from|library)\b/gi,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim();

  // 11. Only emit residual as oracle-text search when it's a single meaningful
  // word. Multi-word residuals (e.g. "punish decks", "artifact hate") almost
  // never appear verbatim in oracle text and produce zero-result or misleading
  // searches. Drop them — the extracted parts already carry intent.
  const residualWords = residual.split(/\s+/).filter(Boolean);
  const isSingleContentWord =
    residualWords.length === 1 &&
    /^[a-z][a-z'-]{3,}$/i.test(residualWords[0]);
  if (isSingleContentWord) {
    parts.push(`o:"${residualWords[0]}"`);
  }


  // If nothing was extracted, return original as a name search
  if (parts.length === 0) {
    const safe = naturalQuery.trim().replace(/["()]/g, '').replace(/\s+/g, ' ').trim();
    if (safe) return `!"${safe}"`;
    return '';
  }

  return parts.join(' ');
}
