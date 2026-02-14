/**
 * Curated list of off-meta hidden gem cards.
 * Each entry has the exact Scryfall card name and a short "why it's a gem" blurb.
 * Rotated deterministically by day-of-year so every user sees the same pick.
 */

export interface DailyGem {
  name: string;
  reason: string;
}

export const DAILY_GEMS: DailyGem[] = [
  { name: 'Perplexing Chimera', reason: 'Turns every spell your opponents cast into a negotiation. Chaos incarnate in enchantment form.' },
  { name: 'Thaumatic Compass', reason: 'Ramp that flips into a Maze of Ith. Two cards in one for just 2 mana.' },
  { name: 'Possibility Storm', reason: 'Locks out combo players and tutors while you ride the chaos. Criminally underplayed.' },
  { name: 'Mangara of Corondor', reason: 'Exile any permanent — repeatedly with flicker effects. A hidden mono-white all-star.' },
  { name: 'Soldevi Adnate', reason: 'Sacrifice a black creature for mana equal to its CMC. Absurd with big demons.' },
  { name: 'Shaman of Forgotten Ways', reason: 'A mana dork with a Biorhythm stapled on. Wins games nobody sees coming.' },
  { name: 'Lifeline', reason: 'Everything comes back. Every turn. For everyone. Build around it and you win the value war.' },
  { name: 'Willbreaker', reason: 'Any targeting effect steals a creature permanently. Turns cantrips into mind control.' },
  { name: 'Keen Duelist', reason: 'Dark Confidant for multiplayer — you draw AND deal damage to an opponent each turn.' },
  { name: 'Shiny Impetus', reason: 'Goads a creature AND makes you Treasure when it attacks. Removal that pays you.' },
  { name: 'Heartless Hidetsugu', reason: 'Halves everyone\'s life total. Combine with damage doublers for instant kills.' },
  { name: 'Dream Devourer', reason: 'Foretell any card from your hand for 2. Protects your hand and smooths your curve.' },
  { name: 'Maskwood Nexus', reason: 'Every creature is every type. Enables every tribal synergy simultaneously.' },
  { name: 'Tombstone Stairwell', reason: 'Creates zombie tokens for everyone every turn — but you built for it and they didn\'t.' },
  { name: 'Tortured Existence', reason: 'Swap creatures between hand and graveyard for B. Infinite value engine for 1 mana.' },
  { name: 'Primal Surge', reason: 'Build your entire deck as permanents and flip your library onto the battlefield.' },
  { name: 'Karn, the Great Creator', reason: 'Shuts off opponent artifacts and retrieves your exiled/sideboarded ones. Format warping in casual.' },
  { name: 'Nashi, Moon Sage\'s Scion', reason: 'Ninjutsu in, play cards from opponents\' libraries for life instead of mana. Pure heist energy.' },
  { name: 'Bitter Feud', reason: 'Doubles all damage between two opponents. Watch them destroy each other.' },
  { name: 'Dauthi Voidwalker', reason: 'Gravehate on a shadow body that can cast opponents\' exiled cards. Does everything.' },
  { name: 'Sudden Substitution', reason: 'Split second — swap control of a spell and a creature. Can\'t be responded to.' },
  { name: 'Fractured Identity', reason: 'Exile an opponent\'s best card, and everyone else gets a copy. Political dynamite.' },
  { name: 'Bennie Bracks, Zoologist', reason: 'Draw a card every turn you create a token. Convoke makes him nearly free.' },
  { name: 'Kami of Whispered Hopes', reason: 'Taps for mana equal to its power. Grows with +1/+1 counters. Budget Selvala.' },
  { name: 'Eluge, the Shoreless Sea', reason: 'Turns your creatures into copies of itself. One card army in blue.' },
  { name: 'Professional Face-Breaker', reason: 'Every creature that connects makes Treasure. Exile top card to draw. Card advantage machine.' },
  { name: 'Roaming Throne', reason: 'Doubles triggered abilities of your chosen creature type. Tribal decks\' best friend.' },
  { name: 'Saw in Half', reason: 'Kill a creature, get two half-sized copies. Use on your own ETB creatures for triple value.' },
  { name: 'Cunning Rhetoric', reason: 'Opponents who attack you let you exile and play their cards. Punishes aggression passively.' },
  { name: 'Surge to Victory', reason: 'Every creature that deals combat damage casts a free instant/sorcery from your graveyard.' },
  { name: 'Mesmeric Orb', reason: 'Mills everyone aggressively. Enables graveyard strategies while disrupting opponents.' },
];

/**
 * Get today's pick index, deterministic across all users.
 * Uses day-of-year so the pick changes at midnight UTC.
 */
export function getTodayPickIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return dayOfYear % DAILY_GEMS.length;
}

export function getTodayPick(): DailyGem {
  return DAILY_GEMS[getTodayPickIndex()];
}
