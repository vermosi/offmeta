/**
 * "Cards Like X" mappings for functional similarity search.
 * Maps famous cards to search for functional equivalents.
 * @module mappings/cards-like
 */

/**
 * Maps famous cards to Scryfall queries that find functional equivalents.
 * Searches for cards that do similar things, not cards that mention the name.
 */
export const CARDS_LIKE_MAP: Record<string, string> = {
  // Ramp
  cultivate: 'otag:land-ramp o:"search your library" o:"basic land"',
  kodama: 'otag:land-ramp o:"search your library" o:"basic land"',
  'rampant growth': 'otag:land-ramp mv<=2',
  "nature's lore": 'otag:land-ramp mv<=2 o:"forest"',
  farseek: 'otag:land-ramp mv=2',
  'sol ring': 't:artifact mv<=2 o:"add" o:"{C}{C}"',
  'mana crypt': 't:artifact mv=0 o:"add"',
  'arcane signet': 't:artifact mv=2 o:"add" o:"color"',

  // Card draw
  brainstorm: 'o:"draw" o:"cards" o:"put" o:"top"',
  ponder: 'o:"look at the top" o:"shuffle"',
  preordain: 'o:"scry" o:"draw a card" mv<=2',
  rhystic: 'o:"whenever" o:"opponent" o:"pay" o:"draw"',

  // Removal
  'swords to plowshares': 'o:"exile target creature" mv<=2',
  'path to exile': 'o:"exile target creature" mv<=2',
  'wrath of god': 'otag:creature-board-wipe',
  damnation: 'otag:creature-board-wipe',
  'cyclonic rift': 'otag:mass-bounce',

  // Counters
  counterspell: 'otag:hard-counter',
  'mana drain': 'otag:hard-counter',
  'force of will': 'otag:hard-counter o:"without paying"',

  // Aristocrats/Sacrifice
  'blood artist': 'otag:blood-artist-effect',
  'zulaport cutthroat': 'otag:blood-artist-effect',
  'viscera seer': 'otag:free-sacrifice-outlet',

  // Tutors
  'demonic tutor': 'otag:tutor o:"search your library" o:"hand"',
  vampiric: 'otag:tutor o:"search your library" o:"top"',
  'enlightened tutor': 'otag:artifact-tutor or otag:enchantment-tutor',
  'mystical tutor': 'otag:instant-or-sorcery-tutor',
  'worldly tutor': 'otag:creature-tutor',

  // Reanimation
  reanimate: 'otag:reanimation mv<=3',
  'animate dead': 'otag:reanimation t:enchantment',
  exhume: 'otag:reanimation',

  // Value creatures
  'dark confidant': 'o:"beginning of your upkeep" o:"draw" o:"life"',
  bob: 'o:"beginning of your upkeep" o:"draw" o:"life"',

  // Equipment
  'lightning greaves': 't:equipment o:"haste" o:"shroud" or o:"hexproof"',
  'swiftfoot boots': 't:equipment o:"haste" o:"hexproof"',
  skullclamp: 't:equipment o:"draw"',

  // Mana dorks
  'llanowar elves': 'otag:mana-dork mv=1 o:"add {G}"',
  'birds of paradise': 'otag:mana-dork mv=1 o:"add" o:"any color"',

  // Wheels
  'wheel of fortune': 'otag:wheel',
  windfall: 'otag:wheel',

  // Land destruction
  'strip mine': 't:land o:"destroy target land"',
  'ghost quarter': 't:land o:"destroy target" o:"land"',
};
