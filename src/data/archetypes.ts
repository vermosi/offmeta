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
    searchQuery: 'equipment or auras that buff equipped or enchanted creature for commander',
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
];
