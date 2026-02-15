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
  { name: 'Pyroblast', reason: 'One mana to counter or destroy anything blue. The ultimate sideboard card in red.' },
  { name: 'Temur Sabertooth', reason: 'Bounce your own creatures to reuse ETBs. Goes infinite with enough mana dorks.' },
  { name: 'Victimize', reason: 'Sacrifice one creature, reanimate two. Three mana, triple value.' },
  { name: 'Mystic Remora', reason: 'The "fish tax" draws absurd cards in early turns. Commander\'s best kept secret.' },
  { name: 'Kediss, Emberclaw Familiar', reason: 'Commander damage to one opponent hits all opponents. Voltron\'s best friend.' },
  { name: 'Elvish Reclaimer', reason: 'Tutors any land to the battlefield repeatedly. One-drop that fixes and ramps.' },
  { name: 'Gruul Ragebeast', reason: 'Every creature you play fights an opponent\'s creature. Removal on a stick, permanently.' },
  { name: 'Ashes of the Abhorrent', reason: 'Shuts down graveyard decks and gains you life whenever anything dies. Quiet powerhouse.' },
  { name: 'Rite of the Raging Storm', reason: 'Gives everyone a 5/1 that can\'t attack you. Free damage every round.' },
  { name: 'Curse of Opulence', reason: 'Incentivizes opponents to attack each other while you get free Gold tokens.' },
  { name: 'Kederekt Leviathan', reason: 'Bounces all nonland permanents. Unearth it for a one-sided reset when you\'re behind.' },
  { name: 'Mandate of Peace', reason: 'Ends the combat phase AND stops all spells for the turn. Fog on steroids.' },
  { name: 'Species Specialist', reason: 'Draw a card whenever a creature of the chosen type dies. Tribal card advantage engine.' },
  { name: 'Reins of Power', reason: 'Swap creatures with an opponent at instant speed. Blocks with their board, attacks with yours.' },
  { name: 'Virtus the Veiled', reason: 'Halves an opponent\'s life on hit. With evasion support, ends games fast.' },
  { name: 'Lunar Force', reason: 'Counters the next spell automatically. Flicker it to reset. Repeatable free counterspell.' },
  { name: 'Goblin Welder', reason: 'Swap artifacts between graveyard and battlefield at instant speed. Broken with big artifacts.' },
  { name: 'Helm of the Host', reason: 'Creates nonlegendary token copies of equipped creature every combat. Infinite combo enabler.' },
  { name: 'Skullwinder', reason: 'Eternal Witness with deathtouch that also lets an opponent recur a card. Political recursion.' },
  { name: 'Imp\'s Mischief', reason: 'Redirect a spell in mono-black. Nobody expects black to have interaction like this.' },
  { name: 'Stalking Leonin', reason: 'Secretly names a player — if they attack you, exile their creature. Hidden deterrent.' },
  { name: 'Descent into Avernus', reason: 'Gives everyone Treasures and burns life totals. Accelerates games to their conclusion.' },
  { name: 'Chaos Warp', reason: 'Red\'s answer to anything — shuffles any permanent into the library. Universal removal.' },
  { name: 'Illusionist\'s Bracers', reason: 'Copies any activated ability for free. Doubles your commander\'s best trick.' },
  { name: 'Scapeshift', reason: 'Sacrifice lands to find any combination. Assembles Cabal Coffers + Urborg in one shot.' },
  { name: 'Aven Mindcensor', reason: 'Flash in to limit searches to top four cards. Shuts down tutors at instant speed.' },
  { name: 'Nature\'s Claim', reason: 'One green mana destroys any artifact or enchantment. The 4 life is irrelevant in Commander.' },
  { name: 'Phyrexian Metamorph', reason: 'Clones the best artifact or creature on the table for 3 mana and 2 life.' },
  { name: 'Mob Rule', reason: 'Steal all small OR all big creatures for a turn. One-sided Insurrection in practice.' },
  { name: 'Faerie Mastermind', reason: 'Flash flyer that draws you a card whenever opponents draw extra. Punishes card advantage.' },
  { name: 'Wild Ricochet', reason: 'Copy a spell AND change its targets. Turns their removal into yours plus a bonus copy.' },
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
