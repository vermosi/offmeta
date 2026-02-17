/**
 * Curated Commander archetype data for discovery pages.
 * Each archetype includes a pre-built search query, colors, description,
 * key cards, and budget tips.
 * @module data/archetypes
 */

export interface Archetype {
  slug: string;
  name: string;
  colors: string[];
  searchQuery: string;
  tagline: string;
  description: string;
  keyCards: string[];
  budgetTip: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    slug: 'voltron',
    name: 'Voltron',
    colors: ['W', 'R'],
    searchQuery: 'equipment or auras that give bonuses to equipped or enchanted permanent for commander',
    tagline: 'Suit up one creature and swing for lethal',
    description:
      'Voltron decks focus on a single creature — usually your commander — loading it with equipment and auras to deal 21 commander damage as fast as possible. Protection, evasion, and double strike are your best friends.',
    keyCards: ['Sword of Feast and Famine', 'Lightning Greaves', 'Sigarda\'s Aid', 'All That Glitters', 'Colossus Hammer'],
    budgetTip: 'Start with cheap auras like Ethereal Armor, All That Glitters, and Rancor. Budget equipment like Blackblade Reforged and Champion\'s Helm are under $2.',
  },
  {
    slug: 'aristocrats',
    name: 'Aristocrats',
    colors: ['W', 'B'],
    searchQuery: 'white black sacrifice payoffs or death triggers for commander',
    tagline: 'Sacrifice creatures for incremental value',
    description:
      'Aristocrats decks create tokens, sacrifice them to free sacrifice outlets, and profit from death triggers. Cards like Blood Artist drain opponents one life at a time, turning every creature death into value.',
    keyCards: ['Blood Artist', 'Viscera Seer', 'Zulaport Cutthroat', 'Grave Pact', 'Bitterblossom'],
    budgetTip: 'Blood Artist, Zulaport Cutthroat, and Viscera Seer are all under $2. Bastion of Remembrance is a great budget alternative to more expensive payoffs.',
  },
  {
    slug: 'spellslinger',
    name: 'Spellslinger',
    colors: ['U', 'R'],
    searchQuery: 'blue red instants or sorceries that reward casting spells for commander',
    tagline: 'Cast a flurry of instants and sorceries',
    description:
      'Spellslinger decks chain cheap instants and sorceries, generating value from "whenever you cast" triggers. Storm counts, magecraft, and copy effects turn each cantrip into a threat.',
    keyCards: ['Archmage Emeritus', 'Storm-Kiln Artist', 'Guttersnipe', 'Young Pyromancer', 'Thousand-Year Storm'],
    budgetTip: 'Guttersnipe, Young Pyromancer, and Talrand are all cheap payoffs. Fill the deck with cantrips like Ponder, Preordain, and Brainstorm.',
  },
  {
    slug: 'tokens',
    name: 'Tokens',
    colors: ['G', 'W'],
    searchQuery: 'selesnya cards that create creature tokens for commander',
    tagline: 'Go wide with an army of tokens',
    description:
      'Token decks create massive boards of creature tokens, then use anthems, Overrun effects, or sacrifice synergies to close the game. The strategy is resilient against targeted removal since you always have more bodies.',
    keyCards: ['Doubling Season', 'Anointed Procession', 'Parallel Lives', 'Craterhoof Behemoth', 'Avenger of Zendikar'],
    budgetTip: 'Second Harvest and Rootborn Defenses are cheap token doublers. Raise the Alarm, Spectral Procession, and Increasing Devotion provide solid token generation on a budget.',
  },
  {
    slug: 'reanimator',
    name: 'Reanimator',
    colors: ['B'],
    searchQuery: 'black cards that return creatures from graveyard to battlefield for commander',
    tagline: 'Cheat massive threats from the graveyard',
    description:
      'Reanimator decks fill the graveyard with expensive creatures, then bring them back at a fraction of the mana cost. Self-mill, discard outlets, and reanimation spells are the core engine.',
    keyCards: ['Reanimate', 'Animate Dead', 'Entomb', 'Buried Alive', 'Living Death'],
    budgetTip: 'Animate Dead and Exhume are cheap reanimation spells. Stinkweed Imp and Golgari Grave-Troll fill your graveyard for free via dredge.',
  },
  {
    slug: 'stax',
    name: 'Stax',
    colors: ['W'],
    searchQuery: 'white cards that restrict or tax opponents for commander',
    tagline: 'Lock the table down with taxing effects',
    description:
      'Stax decks slow down opponents with taxing effects, sacrifice triggers, and resource denial. While unpopular at casual tables, stax is powerful in competitive metas where slowing everyone else wins games.',
    keyCards: ['Smokestack', 'Winter Orb', 'Thalia, Guardian of Thraben', 'Drannith Magistrate', 'Sphere of Resistance'],
    budgetTip: 'Thalia, Blind Obedience, and Deafening Silence are affordable stax pieces. Rule of Law effects can be found under $1.',
  },
  {
    slug: 'group-hug',
    name: 'Group Hug',
    colors: ['U', 'G'],
    searchQuery: 'simic cards that let all players draw cards or gain mana for commander',
    tagline: 'Give everyone resources — then win anyway',
    description:
      'Group Hug decks accelerate the entire table with extra draws and mana, building political alliances. The trick is having a hidden win condition that exploits the resources you\'ve given everyone.',
    keyCards: ['Howling Mine', 'Temple Bell', 'Rites of Flourishing', 'Dictate of Kruphix', 'Selvala, Explorer Returned'],
    budgetTip: 'Font of Mythos, Kami of the Crescent Moon, and Veteran Explorer are all budget-friendly group hug staples.',
  },
  {
    slug: 'mill',
    name: 'Mill',
    colors: ['U', 'B'],
    searchQuery: 'dimir cards that mill opponents or care about cards in graveyards for commander',
    tagline: 'Win by emptying their libraries',
    description:
      'Mill decks attack the library instead of life totals, putting cards directly from opponents\' decks into their graveyards. In Commander, you need to mill 3 opponents, so efficient repeatable mill is key.',
    keyCards: ['Bruvac the Grandiloquent', 'Maddening Cacophony', 'Traumatize', 'Fleet Swallower', 'Altar of Dementia'],
    budgetTip: 'Maddening Cacophony, Ruin Crab, and Hedron Crab are cheap and effective. Altar of Dementia does double duty as a sacrifice outlet.',
  },
  {
    slug: 'landfall',
    name: 'Landfall',
    colors: ['G', 'R'],
    searchQuery: 'gruul creatures with landfall abilities or cards that play extra lands for commander',
    tagline: 'Turn every land drop into a threat',
    description:
      'Landfall decks trigger powerful abilities every time a land enters the battlefield. Extra land drops, fetch lands, and land recursion multiply these triggers for explosive turns.',
    keyCards: ['Avenger of Zendikar', 'Omnath, Locus of Rage', 'Scute Swarm', 'Oracle of Mul Daya', 'Exploration'],
    budgetTip: 'Rampaging Baloths, Moraug, and Evolution Sage are affordable landfall payoffs. Evolving Wilds and Terramorphic Expanse trigger landfall twice.',
  },
  {
    slug: 'lifegain',
    name: 'Lifegain',
    colors: ['W', 'B'],
    searchQuery: 'orzhov cards that gain life or care about lifegain triggers for commander',
    tagline: 'Gain life and convert it into power',
    description:
      'Lifegain decks turn life gain into card draw, creature tokens, and drain effects. The strategy is deceptively powerful when every life gained triggers multiple payoffs.',
    keyCards: ['Ajani\'s Pridemate', 'Vito, Thorn of the Dusk Rose', 'Exquisite Blood', 'Dina, Soul Steeper', 'Aetherflux Reservoir'],
    budgetTip: 'Soul Warden, Ajani\'s Pridemate, and Dina are all under $1. Epicure of Blood and Marauding Blight-Priest provide budget drain effects.',
  },
  {
    slug: 'counters',
    name: '+1/+1 Counters',
    colors: ['G', 'W'],
    searchQuery: 'selesnya creatures that add or care about +1/+1 counters for commander',
    tagline: 'Grow your creatures beyond their limits',
    description:
      '+1/+1 counter decks start small and grow into unstoppable forces. Counter doublers, proliferate, and "move counters" effects create exponential growth that overwhelms opponents.',
    keyCards: ['Hardened Scales', 'Doubling Season', 'Branching Evolution', 'Forgotten Ancient', 'The Ozolith'],
    budgetTip: 'Hardened Scales is the foundation piece and very affordable. Solidarity of Heroes, Inspiring Call, and Champion of Lambholt are cheap but powerful.',
  },
  {
    slug: 'blink',
    name: 'Blink / Flicker',
    colors: ['W', 'U'],
    searchQuery: 'azorius cards that exile and return permanents or have ETB effects for commander',
    tagline: 'Abuse enter-the-battlefield triggers',
    description:
      'Blink decks exile their own permanents and return them to re-trigger ETB effects. Every creature becomes a spell when you can blink it on demand, generating cards, removal, and tokens.',
    keyCards: ['Restoration Angel', 'Ephemerate', 'Panharmonicon', 'Thassa, Deep-Dwelling', 'Soulherder'],
    budgetTip: 'Ephemerate, Ghostly Flicker, and Conjurer\'s Closet are affordable blink enablers. Mulldrifter and Cloudblazer are cheap ETB value creatures.',
  },
  {
    slug: 'wheels',
    name: 'Wheels',
    colors: ['U', 'R'],
    searchQuery: 'izzet cards that make all players discard and draw for commander',
    tagline: 'Refill your hand and punish opponents',
    description:
      'Wheel decks force everyone to discard and draw new hands, profiting from the chaos. Damage-on-draw effects, graveyard synergies, and "no maximum hand size" cards turn wheels into win conditions.',
    keyCards: ['Wheel of Fortune', 'Windfall', 'Narset, Parter of Veils', 'Notion Thief', 'Teferi\'s Puzzle Box'],
    budgetTip: 'Windfall, Whirlpool Warrior, and Jace\'s Archivist are budget wheel effects. Pair with Psychosis Crawler or Glint-Horn Buccaneer for damage.',
  },
  {
    slug: 'graveyard',
    name: 'Graveyard Value',
    colors: ['B', 'G'],
    searchQuery: 'golgari cards that recur from graveyard or benefit from creatures dying for commander',
    tagline: 'Your graveyard is your second hand',
    description:
      'Graveyard decks treat the graveyard as a resource, recurring threats and generating value from cards in the yard. Self-mill fuels the engine while recursion provides inevitability.',
    keyCards: ['Meren of Clan Nel Toth', 'Eternal Witness', 'Dread Return', 'World Shaper', 'Ramunap Excavator'],
    budgetTip: 'Eternal Witness, Golgari Findbroker, and Regrowth are cheap recursion. Satyr Wayfinder and Grisly Salvage fill the graveyard efficiently.',
  },
  {
    slug: 'superfriends',
    name: 'Superfriends',
    colors: ['W', 'U', 'G'],
    searchQuery: 'planeswalkers or cards that proliferate or protect planeswalkers for commander',
    tagline: 'Assemble a team of planeswalkers',
    description:
      'Superfriends decks deploy multiple planeswalkers and protect them with board wipes, pillowfort effects, and proliferate. Ultimate abilities become reachable when you can tick up faster.',
    keyCards: ['Doubling Season', 'The Chain Veil', 'Oath of Teferi', 'Vorinclex, Monstrous Raider', 'Atraxa, Praetors\' Voice'],
    budgetTip: 'Many planeswalkers are surprisingly cheap. Evolution Sage, Flux Channeler, and Contentious Plan provide budget proliferate. War of the Spark planeswalkers are affordable.',
  },
  {
    slug: 'enchantress',
    name: 'Enchantress',
    colors: ['G', 'W'],
    searchQuery: 'selesnya enchantments or creatures that draw cards when enchantments enter for commander',
    tagline: 'Draw cards and lock the board with enchantments',
    description:
      'Enchantress decks leverage enchantments for card draw, removal, and board control. "Enchantress" creatures draw a card whenever you cast an enchantment, turning every aura and enchantment into a cantrip.',
    keyCards: ['Enchantress\'s Presence', 'Argothian Enchantress', 'Sterling Grove', 'Sphere of Safety', 'Sigil of the Empty Throne'],
    budgetTip: 'Mesa Enchantress and Satyr Enchanter are budget draw engines. Abundant Growth and Utopia Sprawl are cheap enchantments that ramp and trigger draws.',
  },
  {
    slug: 'infect',
    name: 'Infect',
    colors: ['G', 'U'],
    searchQuery: 'simic creatures with infect or proliferate for commander',
    tagline: 'Kill with 10 poison counters instead of 40 damage',
    description:
      'Infect decks only need to deal 10 poison counters to eliminate a player, bypassing the 40-life Commander cushion. Pump spells and evasion make infect creatures lethal in one or two swings.',
    keyCards: ['Blighted Agent', 'Glistener Elf', 'Triumph of the Hordes', 'Infectious Inquiry', 'Grafted Exoskeleton'],
    budgetTip: 'Most infect creatures are very cheap. Blighted Agent, Glistener Elf, and Ichorclaw Myr cost pennies. Pump spells like Might of Old Krosa and Groundswell are under $1.',
  },
  {
    slug: 'treasure',
    name: 'Treasure',
    colors: ['R', 'B'],
    searchQuery: 'rakdos cards that create treasure tokens or benefit from treasures for commander',
    tagline: 'Generate treasure tokens for explosive mana',
    description:
      'Treasure decks create massive amounts of treasure tokens, then leverage them for mana acceleration, sacrifice synergies, or win conditions that care about artifact count.',
    keyCards: ['Dockside Extortionist', 'Smothering Tithe', 'Revel in Riches', 'Goldspan Dragon', 'Academy Manufactor'],
    budgetTip: 'Sticky Fingers, Big Score, and Unexpected Windfall generate treasures cheaply. Magda, Brazen Outlaw and Professional Face-Breaker are affordable treasure engines.',
  },
  {
    slug: 'storm',
    name: 'Storm',
    colors: ['U', 'R'],
    searchQuery: 'izzet cards with storm or that copy spells or reduce spell costs for commander',
    tagline: 'Chain spells into a lethal storm count',
    description:
      'Storm decks cast as many spells as possible in a single turn, then finish with a storm card that copies itself for each prior spell. Mana reduction, rituals, and cantrips fuel the chain.',
    keyCards: ['Grapeshot', 'Tendrils of Agony', 'Birgi, God of Storytelling', 'Baral, Chief of Compliance', 'Past in Flames'],
    budgetTip: 'Birgi and Baral are affordable cost reducers. Gitaxian Probe, Manamorphose, and Desperate Ritual are cheap storm enablers. Grapeshot is a budget finisher.',
  },
  {
    slug: 'chaos',
    name: 'Chaos',
    colors: ['R'],
    searchQuery: 'red cards that randomize or create chaotic effects like coin flips for commander',
    tagline: 'Embrace randomness and watch the table burn',
    description:
      'Chaos decks thrive on unpredictability — coin flips, random targets, and effects that scramble the board state. While inconsistent, chaos decks create memorable and hilarious games.',
    keyCards: ['Krark, the Thumbless', 'Scrambleverse', 'Warp World', 'Possibility Storm', 'Zndrsplt, Eye of Wisdom'],
    budgetTip: 'Most chaos cards are very budget-friendly since they\'re niche. Goblin Game, Thieves\' Auction, and Wild Evocation are all under $2.',
  },
  {
    slug: 'tribal',
    name: 'Tribal',
    colors: ['W', 'U', 'B', 'R', 'G'],
    searchQuery: 'cards that give bonuses to creatures that share a type or lords for commander',
    tagline: 'Build around your favorite creature type',
    description:
      'Tribal decks pick a creature type — elves, goblins, zombies, dragons — and fill the deck with lords, synergy pieces, and tribal payoffs. Strength in numbers and shared abilities define the strategy.',
    keyCards: ['Coat of Arms', 'Vanquisher\'s Banner', 'Herald\'s Horn', 'Kindred Discovery', 'Door of Destinies'],
    budgetTip: 'Herald\'s Horn and Vanquisher\'s Banner work in any tribe. Most tribal lords for common types (elves, goblins, zombies) are very affordable.',
  },
  {
    slug: 'pillowfort',
    name: 'Pillowfort',
    colors: ['W', 'U'],
    searchQuery: 'azorius enchantments or artifacts that prevent attacks or tax attackers for commander',
    tagline: 'Make yourself impossible to attack',
    description:
      'Pillowfort decks stack defensive enchantments and artifacts that discourage or prevent opponents from attacking you. Once safely fortified, you win with alternate win conditions or incremental damage.',
    keyCards: ['Ghostly Prison', 'Propaganda', 'Sphere of Safety', 'Crawlspace', 'Solitary Confinement'],
    budgetTip: 'Ghostly Prison and Propaganda are affordable staples. Windborn Muse, Baird, Steward of Argive, and Kazuul, Tyrant of the Cliffs add redundancy on a budget.',
  },
  {
    slug: 'control',
    name: 'Control',
    colors: ['U', 'W'],
    searchQuery: 'azorius counterspells or board wipes or removal for commander',
    tagline: 'Answer every threat and win on your terms',
    description:
      'Control decks use counterspells, board wipes, and removal to neutralize threats while slowly building toward a dominant win condition. Patience and card advantage are the keys to victory.',
    keyCards: ['Cyclonic Rift', 'Counterspell', 'Swords to Plowshares', 'Teferi, Hero of Dominaria', 'Wrath of God'],
    budgetTip: 'Counterspell, Negate, and Swords to Plowshares are cheap answers. Day of Judgment and Fumigate are budget board wipes under $1.',
  },
];
