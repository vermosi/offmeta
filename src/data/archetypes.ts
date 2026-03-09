/**
 * Curated archetype data for discovery pages.
 * Each archetype includes default (Commander) content and optional
 * format-specific overrides for searchQuery, budgetTip, keyCards, and description.
 * @module data/archetypes
 */

/** Format-specific content overrides */
export interface ArchetypeFormatOverride {
  searchQuery?: string;
  budgetTip?: string;
  keyCards?: string[];
  description?: string;
}

export interface Archetype {
  slug: string;
  name: string;
  colors: string[];
  /** Default search query (Commander) */
  searchQuery: string;
  tagline: string;
  description: string;
  keyCards: string[];
  budgetTip: string;
  /** Format-specific overrides — keyed by format name (e.g., "pauper", "modern") */
  formatOverrides?: Record<string, ArchetypeFormatOverride>;
}

/**
 * Get format-aware archetype content.
 * Returns curated data with format-specific overrides applied.
 */
export function getArchetypeForFormat(
  archetype: Archetype,
  format: string | null,
): {
  searchQuery: string;
  budgetTip: string;
  keyCards: string[];
  description: string;
} {
  const overrides = format ? archetype.formatOverrides?.[format] : undefined;
  return {
    searchQuery: overrides?.searchQuery ?? buildFormatSearchQuery(archetype.searchQuery, format),
    budgetTip: overrides?.budgetTip ?? archetype.budgetTip,
    keyCards: overrides?.keyCards ?? archetype.keyCards,
    description: overrides?.description ?? archetype.description,
  };
}

/**
 * Automatically adapt a Commander-centric search query to a different format.
 * Replaces "for commander" with "f:{format}" in the query string.
 */
function buildFormatSearchQuery(query: string, format: string | null): string {
  if (!format || format === 'commander') return query;
  // Replace "for commander" or "legal in commander" with the target format
  return query
    .replace(/\bfor commander\b/gi, `f:${format}`)
    .replace(/\blegal in commander\b/gi, `f:${format}`)
    .replace(/\bf:commander\b/gi, `f:${format}`);
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
    formatOverrides: {
      pauper: {
        searchQuery: 'common auras or equipment that boost creatures f:pauper',
        budgetTip: 'Ethereal Armor, Rancor, and Armadillo Cloak are Pauper staples. Bonesplitter and Flayer Husk are free-equip options.',
        keyCards: ['Ethereal Armor', 'Rancor', 'Bonesplitter', 'All That Glitters', 'Armadillo Cloak'],
      },
      modern: {
        searchQuery: 'equipment or auras that buff creatures f:modern',
        budgetTip: 'Colossus Hammer with Sigarda\'s Aid or Puresteel Paladin is the Modern Voltron core. Kor Spiritdancer is a budget-friendly aura payoff.',
        keyCards: ['Colossus Hammer', 'Sigarda\'s Aid', 'Puresteel Paladin', 'Kor Spiritdancer', 'All That Glitters'],
      },
      legacy: {
        searchQuery: 'equipment or auras that buff creatures f:legacy',
        budgetTip: 'Stoneforge Mystic into Batterskull or Kaldra Compleat is the Legacy equipment package. Umezawa\'s Jitte is a powerhouse.',
        keyCards: ['Stoneforge Mystic', 'Batterskull', 'Umezawa\'s Jitte', 'Kaldra Compleat', 'Ethereal Armor'],
      },
    },
  },
  {
    slug: 'aristocrats',
    name: 'Aristocrats',
    colors: ['W', 'B'],
    searchQuery: 'creatures that deal damage or drain life when a creature dies for commander',
    tagline: 'Sacrifice creatures for incremental value',
    description:
      'Aristocrats decks create tokens, sacrifice them to free sacrifice outlets, and profit from death triggers. Cards like Blood Artist drain opponents one life at a time, turning every creature death into value.',
    keyCards: ['Blood Artist', 'Viscera Seer', 'Zulaport Cutthroat', 'Grave Pact', 'Bitterblossom'],
    budgetTip: 'Blood Artist, Zulaport Cutthroat, and Viscera Seer are all under $2. Bastion of Remembrance is a great budget alternative to more expensive payoffs.',
    formatOverrides: {
      pauper: {
        searchQuery: 'creatures that drain or deal damage when creatures die f:pauper',
        budgetTip: 'Epicure of Blood, Falkenrath Noble, and Carrion Feeder are Pauper aristocrats staples. Mortician Beetle grows with every sacrifice.',
        keyCards: ['Carrion Feeder', 'Falkenrath Noble', 'Mortician Beetle', 'Viscera Seer', 'Brindle Shoat'],
      },
      modern: {
        searchQuery: 'creatures that drain life when creatures die f:modern',
        budgetTip: 'Blood Artist, Zulaport Cutthroat, and Viscera Seer form the budget core. Cauldron Familiar with Witch\'s Oven is a strong Modern engine.',
        keyCards: ['Blood Artist', 'Zulaport Cutthroat', 'Viscera Seer', 'Cauldron Familiar', 'Collected Company'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'instants or sorceries with prowess or spell triggers f:pauper',
        budgetTip: 'Kiln Fiend, Monastery Swiftspear, and Firebrand Archer are Pauper spellslinger all-stars. Cantrips like Ponder and Preordain are free.',
        keyCards: ['Kiln Fiend', 'Monastery Swiftspear', 'Firebrand Archer', 'Ponder', 'Lightning Bolt'],
      },
      modern: {
        searchQuery: 'instants or sorceries that reward spell casting f:modern',
        budgetTip: 'Young Pyromancer and Guttersnipe are affordable payoffs. Pair with cheap cantrips like Opt, Consider, and Expressive Iteration.',
        keyCards: ['Young Pyromancer', 'Monastery Swiftspear', 'Expressive Iteration', 'Guttersnipe', 'Lightning Bolt'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that create creature tokens f:pauper',
        budgetTip: 'Battle Screech, Raise the Alarm, and Gather the Townsfolk create tokens at common. Triplicate Spirits is a powerhouse.',
        keyCards: ['Battle Screech', 'Raise the Alarm', 'Triplicate Spirits', 'Gather the Townsfolk', 'Sprout Swarm'],
      },
      modern: {
        searchQuery: 'cards that create creature tokens f:modern',
        budgetTip: 'Lingering Souls, Spectral Procession, and Raise the Alarm are cheap token generators. Intangible Virtue is an affordable anthem.',
        keyCards: ['Lingering Souls', 'Spectral Procession', 'Intangible Virtue', 'Bitterblossom', 'Monastery Mentor'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that return creatures from graveyard f:pauper',
        budgetTip: 'Exhume is the premier Pauper reanimation spell. Ulamog\'s Crusher and Gurmag Angler are common fatties to reanimate. Stinkweed Imp fills the graveyard.',
        keyCards: ['Exhume', 'Stinkweed Imp', 'Gurmag Angler', 'Ulamog\'s Crusher', 'Dragon Breath'],
      },
      modern: {
        searchQuery: 'cards that return creatures from graveyard to battlefield f:modern',
        budgetTip: 'Persist and Unburial Rites are Modern-legal reanimation. Faithless Looting and Unmarked Grave set up the graveyard.',
        keyCards: ['Persist', 'Unburial Rites', 'Archon of Cruelty', 'Unmarked Grave', 'Faithless Looting'],
      },
      legacy: {
        searchQuery: 'cards that reanimate creatures from graveyard f:legacy',
        budgetTip: 'Reanimate and Animate Dead are Legacy staples. Entomb finds any creature. Grief and Archon of Cruelty are premium targets.',
        keyCards: ['Reanimate', 'Animate Dead', 'Entomb', 'Grief', 'Archon of Cruelty'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that tax or restrict opponents f:pauper',
        budgetTip: 'Standard Bearer redirects spells. Aven Fogbringer and Rishadan Cutpurse tax mana. Reality Acid bounces permanents repeatedly.',
        keyCards: ['Standard Bearer', 'Reality Acid', 'Spreading Seas', 'Rishadan Cutpurse', 'Stormbound Geist'],
      },
      modern: {
        searchQuery: 'cards that restrict or tax opponents f:modern',
        budgetTip: 'Thalia and Leonin Arbiter are affordable hate bears. Damping Sphere and Rest in Peace shut down specific strategies for pennies.',
        keyCards: ['Thalia, Guardian of Thraben', 'Leonin Arbiter', 'Damping Sphere', 'Drannith Magistrate', 'Archon of Emeria'],
      },
      legacy: {
        searchQuery: 'cards that restrict or tax opponents f:legacy',
        budgetTip: 'Chalice of the Void and Trinisphere are Legacy staples. Thalia and Wasteland provide affordable disruption.',
        keyCards: ['Chalice of the Void', 'Thalia, Guardian of Thraben', 'Trinisphere', 'Wasteland', 'Rishadan Port'],
      },
    },
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
    searchQuery: 'cards that mill opponents or put cards from library into graveyard for commander',
    tagline: 'Win by emptying their libraries',
    description:
      'Mill decks attack the library instead of life totals, putting cards directly from opponents\' decks into their graveyards. In Commander, you need to mill 3 opponents, so efficient repeatable mill is key.',
    keyCards: ['Bruvac the Grandiloquent', 'Maddening Cacophony', 'Traumatize', 'Fleet Swallower', 'Altar of Dementia'],
    budgetTip: 'Maddening Cacophony, Ruin Crab, and Hedron Crab are cheap and effective. Altar of Dementia does double duty as a sacrifice outlet.',
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that mill opponents f:pauper',
        budgetTip: 'Thought Scour, Tome Scour, and Jace\'s Erasure are common mill pieces. Persistent Petitioners is a build-around option.',
        keyCards: ['Thought Scour', 'Jace\'s Erasure', 'Tome Scour', 'Persistent Petitioners', 'Compelling Argument'],
      },
      modern: {
        searchQuery: 'cards that mill opponents f:modern',
        budgetTip: 'Hedron Crab, Ruin Crab, and Fractured Sanity are affordable mill engines. Maddening Cacophony can close games quickly.',
        keyCards: ['Hedron Crab', 'Ruin Crab', 'Archive Trap', 'Fractured Sanity', 'Maddening Cacophony'],
      },
    },
  },
  {
    slug: 'landfall',
    name: 'Landfall',
    colors: ['G', 'R'],
    searchQuery: 'landfall cards legal in commander',
    tagline: 'Turn every land drop into a threat',
    description:
      'Landfall decks trigger powerful abilities every time a land enters the battlefield. Extra land drops, fetch lands, and land recursion multiply these triggers for explosive turns.',
    keyCards: ['Avenger of Zendikar', 'Omnath, Locus of Rage', 'Scute Swarm', 'Oracle of Mul Daya', 'Exploration'],
    budgetTip: 'Rampaging Baloths, Moraug, and Evolution Sage are affordable landfall payoffs. Evolving Wilds and Terramorphic Expanse trigger landfall twice.',
    formatOverrides: {
      pauper: {
        searchQuery: 'landfall cards f:pauper',
        budgetTip: 'Adventuring Gear, Steppe Lynx, and Akoum Hellhound are common landfall creatures. Khalni Heart Expedition ramps and triggers landfall.',
        keyCards: ['Steppe Lynx', 'Akoum Hellhound', 'Adventuring Gear', 'Khalni Heart Expedition', 'Murasa Behemoth'],
      },
      modern: {
        searchQuery: 'landfall cards f:modern',
        budgetTip: 'Scute Swarm, Felidar Retreat, and Ruin Crab are affordable Modern landfall cards. Fetch lands maximize triggers.',
        keyCards: ['Scute Swarm', 'Felidar Retreat', 'Omnath, Locus of Creation', 'Ruin Crab', 'Tireless Provisioner'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that gain life or trigger on lifegain f:pauper',
        budgetTip: 'Soul Warden, Soul\'s Attendant, and Syndic of Tithes are common lifegain pieces. Basilica Guards has extort for incremental drain.',
        keyCards: ['Soul Warden', 'Soul\'s Attendant', 'Basilica Guards', 'Suture Priest', 'Lone Missionary'],
      },
      modern: {
        searchQuery: 'cards that gain life or have lifegain payoffs f:modern',
        budgetTip: 'Soul Warden, Ajani\'s Pridemate, and Speaker of the Heavens are budget Modern lifegain cards. Heliod, Sun-Crowned is the premium payoff.',
        keyCards: ['Soul Warden', 'Ajani\'s Pridemate', 'Heliod, Sun-Crowned', 'Speaker of the Heavens', 'Voice of the Blessed'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'creatures that use +1/+1 counters f:pauper',
        budgetTip: 'Travel Preparations, Hunger of the Howlpack, and Experiment One are common counter cards. Ivy Lane Denizen generates counters repeatedly.',
        keyCards: ['Travel Preparations', 'Hunger of the Howlpack', 'Experiment One', 'Ivy Lane Denizen', 'Stormbound Geist'],
      },
      modern: {
        searchQuery: 'creatures that add or care about +1/+1 counters f:modern',
        budgetTip: 'Hardened Scales, Experiment One, and Avatar of the Resolute are affordable Modern counter cards. Conclave Mentor doubles counters.',
        keyCards: ['Hardened Scales', 'Walking Ballista', 'Arcbound Ravager', 'Conclave Mentor', 'Experiment One'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that exile and return creatures or have ETB effects f:pauper',
        budgetTip: 'Ephemerate and Ghostly Flicker are Pauper blink staples. Mulldrifter, Sea Gate Oracle, and Kor Skyfisher provide common ETB value.',
        keyCards: ['Ephemerate', 'Ghostly Flicker', 'Mulldrifter', 'Kor Skyfisher', 'Sea Gate Oracle'],
      },
      modern: {
        searchQuery: 'cards that exile and return permanents or have ETB effects f:modern',
        budgetTip: 'Ephemerate and Restoration Angel are affordable blink spells. Solitude and Fury are premium but Mulldrifter and Eternal Witness are budget-friendly.',
        keyCards: ['Ephemerate', 'Restoration Angel', 'Soulherder', 'Solitude', 'Eternal Witness'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that recur from graveyard or benefit from dying f:pauper',
        budgetTip: 'Unearth, Ghastly Demise, and Tortured Existence are Pauper graveyard staples. Gurmag Angler is the premier common delve threat.',
        keyCards: ['Gurmag Angler', 'Unearth', 'Tortured Existence', 'Stinkweed Imp', 'Satyr Wayfinder'],
      },
      modern: {
        searchQuery: 'cards that recur from graveyard or benefit from dying f:modern',
        budgetTip: 'Satyr Wayfinder, Grisly Salvage, and Unearth are cheap graveyard enablers. Kroxa and Lurrus are strong but pricier payoffs.',
        keyCards: ['Kroxa, Titan of Death\'s Hunger', 'Lurrus of the Dream-Den', 'Satyr Wayfinder', 'Unearth', 'Grisly Salvage'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'enchantments or auras f:pauper',
        budgetTip: 'Abundant Growth, Utopia Sprawl, and Wild Growth are common enchantment staples. Heliod\'s Pilgrim tutors for auras.',
        keyCards: ['Abundant Growth', 'Utopia Sprawl', 'Wild Growth', 'Heliod\'s Pilgrim', 'Ethereal Armor'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'creatures with infect or proliferate f:pauper',
        budgetTip: 'Glistener Elf, Blight Mamba, and Ichorclaw Myr are common infect creatures. Mutagenic Growth and Groundswell are free or cheap pump spells.',
        keyCards: ['Glistener Elf', 'Blight Mamba', 'Ichorclaw Myr', 'Mutagenic Growth', 'Groundswell'],
      },
      modern: {
        searchQuery: 'creatures with infect or proliferate f:modern',
        budgetTip: 'Glistener Elf, Blighted Agent, and Inkmoth Nexus form the Modern infect core. Mutagenic Growth, Groundswell, and Might of Old Krosa are cheap pump.',
        keyCards: ['Glistener Elf', 'Blighted Agent', 'Inkmoth Nexus', 'Might of Old Krosa', 'Become Immense'],
      },
    },
  },
  {
    slug: 'treasure',
    name: 'Treasure',
    colors: ['R', 'B'],
    searchQuery: 'treasure token cards legal in commander',
    tagline: 'Generate treasure tokens for explosive mana',
    description:
      'Treasure decks create massive amounts of treasure tokens, then leverage them for mana acceleration, sacrifice synergies, or win conditions that care about artifact count.',
    keyCards: ['Dockside Extortionist', 'Smothering Tithe', 'Revel in Riches', 'Goldspan Dragon', 'Academy Manufactor'],
    budgetTip: 'Sticky Fingers, Big Score, and Unexpected Windfall generate treasures cheaply. Magda, Brazen Outlaw and Professional Face-Breaker are affordable treasure engines.',
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that create treasure tokens f:pauper',
        budgetTip: 'Sticky Fingers, Jewel Thief, and Unexpected Windfall are common treasure makers. Deadly Dispute sacrifices a treasure to draw two cards.',
        keyCards: ['Deadly Dispute', 'Sticky Fingers', 'Jewel Thief', 'Unexpected Windfall', 'Treasure Vault'],
      },
      modern: {
        searchQuery: 'treasure token cards f:modern',
        budgetTip: 'Deadly Dispute, Big Score, and Fable of the Mirror-Breaker generate treasures in Modern. Goldspan Dragon is a strong but pricier option.',
        keyCards: ['Fable of the Mirror-Breaker', 'Deadly Dispute', 'Goldspan Dragon', 'Big Score', 'Professional Face-Breaker'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'cards with storm or that copy spells f:pauper',
        budgetTip: 'Galvanic Relay, Weather the Storm, and Chatterstorm are Pauper storm options. Rituals like Dark Ritual and Rite of Flame fuel the count.',
        keyCards: ['Galvanic Relay', 'Dark Ritual', 'Rite of Flame', 'Chatterstorm', 'Weather the Storm'],
      },
      modern: {
        searchQuery: 'cards with storm or that copy or reduce spell costs f:modern',
        budgetTip: 'Grapeshot and Empty the Warrens are cheap storm finishers. Baral, Goblin Electromancer, and Desperate Ritual enable the chain.',
        keyCards: ['Grapeshot', 'Empty the Warrens', 'Baral, Chief of Compliance', 'Gifts Ungiven', 'Past in Flames'],
      },
    },
  },
  {
    slug: 'chaos',
    name: 'Chaos',
    colors: ['R'],
    searchQuery: 'chaos cards legal in commander',
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
    searchQuery: 'tribal lords legal in commander',
    tagline: 'Build around your favorite creature type',
    description:
      'Tribal decks pick a creature type — elves, goblins, zombies, dragons — and fill the deck with lords, synergy pieces, and tribal payoffs. Strength in numbers and shared abilities define the strategy.',
    keyCards: ['Coat of Arms', 'Vanquisher\'s Banner', 'Herald\'s Horn', 'Kindred Discovery', 'Door of Destinies'],
    budgetTip: 'Herald\'s Horn and Vanquisher\'s Banner work in any tribe. Most tribal lords for common types (elves, goblins, zombies) are very affordable.',
    formatOverrides: {
      pauper: {
        searchQuery: 'tribal lords or tribal payoffs f:pauper',
        budgetTip: 'Elves (Timberwatch Elf, Priest of Titania) and Goblins (Goblin Sledder, Sparksmith) have strong common tribal support.',
        keyCards: ['Timberwatch Elf', 'Priest of Titania', 'Sparksmith', 'Goblin Sledder', 'Spidersilk Armor'],
      },
      modern: {
        searchQuery: 'tribal lords or tribal payoffs f:modern',
        budgetTip: 'Most tribal lords are affordable: Elvish Archdruid, Lord of Atlantis, Goblin Chieftain. Collected Company is the premium tribal spell.',
        keyCards: ['Collected Company', 'Elvish Archdruid', 'Lord of Atlantis', 'Goblin Chieftain', 'Champion of the Parish'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'enchantments or creatures that prevent or tax attacks f:pauper',
        budgetTip: 'Holy Light, Moment of Silence, and Palace Guard are common defensive tools. Fog effects provide tempo-positive protection.',
        keyCards: ['Palace Guard', 'Stonehorn Dignitary', 'Holy Light', 'Prismatic Strands', 'Moment\'s Peace'],
      },
    },
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
    formatOverrides: {
      pauper: {
        searchQuery: 'counterspells or removal spells f:pauper',
        budgetTip: 'Counterspell, Essence Scatter, and Prohibit are Pauper-legal counters. Cast Down, Doom Blade, and Snuff Out are premium common removal.',
        keyCards: ['Counterspell', 'Cast Down', 'Snuff Out', 'Doom Blade', 'Exclude'],
        description: 'Pauper control decks leverage the format\'s best commons — efficient counters, cheap removal, and card draw engines like Preordain and Brainstorm — to grind out opponents.',
      },
      modern: {
        searchQuery: 'counterspells or board wipes or removal f:modern',
        budgetTip: 'Counterspell, Mana Leak, and Fatal Push are affordable Modern answers. Supreme Verdict and Wrath of God are budget board wipes.',
        keyCards: ['Counterspell', 'Fatal Push', 'Supreme Verdict', 'Teferi, Hero of Dominaria', 'Archmage\'s Charm'],
      },
      standard: {
        searchQuery: 'counterspells or board wipes or removal f:standard',
        budgetTip: 'Check current Standard sets for the latest counterspells, removal, and board wipes. Prices rotate with the meta.',
        keyCards: ['No More Lies', 'Get Lost', 'Sunfall', 'Make Disappear', 'Cut Down'],
      },
      pioneer: {
        searchQuery: 'counterspells or board wipes or removal f:pioneer',
        budgetTip: 'Supreme Verdict, Absorb, and Fateful Absence are affordable Pioneer control cards. Shark Typhoon is a flexible finisher.',
        keyCards: ['Supreme Verdict', 'Absorb', 'Fateful Absence', 'Shark Typhoon', 'The Wandering Emperor'],
      },
      legacy: {
        searchQuery: 'counterspells or board wipes or removal f:legacy',
        budgetTip: 'Force of Will is the premium counter, but Daze, Spell Pierce, and Swords to Plowshares are budget-friendly Legacy staples.',
        keyCards: ['Force of Will', 'Swords to Plowshares', 'Terminus', 'Daze', 'Council\'s Judgment'],
      },
      premodern: {
        searchQuery: 'counterspells or board wipes or removal f:premodern',
        budgetTip: 'Counterspell, Wrath of God, and Swords to Plowshares define Premodern control. Fact or Fiction and Accumulated Knowledge provide card advantage.',
        keyCards: ['Counterspell', 'Wrath of God', 'Swords to Plowshares', 'Fact or Fiction', 'Accumulated Knowledge'],
      },
    },
  },
  {
    slug: 'aggro',
    name: 'Aggro',
    colors: ['R'],
    searchQuery: 'aggressive creatures with haste or high power for low cost for commander',
    tagline: 'Win fast with efficient creatures and burn',
    description:
      'Aggro decks aim to end the game quickly with efficient creatures and direct damage. Speed is the primary weapon — kill opponents before they can set up.',
    keyCards: ['Goblin Guide', 'Monastery Swiftspear', 'Lightning Bolt', 'Eidolon of the Great Revel', 'Ragavan, Nimble Pilferer'],
    budgetTip: 'Monastery Swiftspear, Lightning Bolt, and Goblin Guide are cheap and effective. Burn spells like Lava Spike and Rift Bolt close games fast.',
    formatOverrides: {
      pauper: {
        searchQuery: 'aggressive creatures with haste or burn spells f:pauper',
        budgetTip: 'Monastery Swiftspear, Goblin Blast-Runner, and Kessig Flamebreather are Pauper aggro staples. Lightning Bolt and Chain Lightning are premium common burn.',
        keyCards: ['Monastery Swiftspear', 'Lightning Bolt', 'Chain Lightning', 'Goblin Blast-Runner', 'Kessig Flamebreather'],
      },
      modern: {
        searchQuery: 'aggressive creatures with haste or burn spells f:modern',
        budgetTip: 'Monastery Swiftspear, Goblin Guide, and Lightning Bolt are the Burn core. Lava Spike and Rift Bolt are cheap finishers.',
        keyCards: ['Goblin Guide', 'Monastery Swiftspear', 'Lightning Bolt', 'Eidolon of the Great Revel', 'Lava Spike'],
      },
      standard: {
        searchQuery: 'aggressive creatures with haste or direct damage f:standard',
        budgetTip: 'Check current Standard for the latest efficient creatures and burn spells. Red aggro is usually budget-friendly.',
      },
      pioneer: {
        searchQuery: 'aggressive creatures with haste or burn spells f:pioneer',
        budgetTip: 'Monastery Swiftspear, Soul-Scar Mage, and Lightning Strike are Pioneer aggro staples.',
        keyCards: ['Monastery Swiftspear', 'Soul-Scar Mage', 'Lightning Strike', 'Kumano Faces Kakkazan', 'Play with Fire'],
      },
    },
  },
  {
    slug: 'combo',
    name: 'Combo',
    colors: ['U', 'B'],
    searchQuery: 'combo pieces or cards that enable infinite combos for commander',
    tagline: 'Assemble the pieces and win instantly',
    description:
      'Combo decks search for specific card combinations that win the game on the spot. Tutors, card draw, and protection spells ensure you find and resolve your combo.',
    keyCards: ['Thassa\'s Oracle', 'Demonic Consultation', 'Thoracle', 'Dramatic Reversal', 'Isochron Scepter'],
    budgetTip: 'Many two-card combos use affordable pieces. Dramatic Reversal + Isochron Scepter, Peregrine Drake + Ghostly Flicker, and Exquisite Blood + Sanguine Bond are accessible.',
    formatOverrides: {
      pauper: {
        searchQuery: 'combo pieces or cards that enable combos f:pauper',
        budgetTip: 'Ghostly Flicker + Mnemonic Wall + a land-untapper creates infinite mana. Freed from the Real + Axebane Guardian is another common Pauper combo.',
        keyCards: ['Ghostly Flicker', 'Mnemonic Wall', 'Freed from the Real', 'Axebane Guardian', 'Peregrine Drake'],
      },
      modern: {
        searchQuery: 'combo pieces or cards that enable combos f:modern',
        budgetTip: 'Devoted Druid + Vizier of Remedies makes infinite mana. Thassa\'s Oracle + Tainted Pact is compact. Many combo creatures are affordable.',
        keyCards: ['Devoted Druid', 'Vizier of Remedies', 'Thassa\'s Oracle', 'Collected Company', 'Yawgmoth, Thran Physician'],
      },
    },
  },
  {
    slug: 'ramp',
    name: 'Ramp',
    colors: ['G'],
    searchQuery: 'green cards that ramp or search for lands for commander',
    tagline: 'Accelerate your mana and cast big spells first',
    description:
      'Ramp decks prioritize mana acceleration to cast expensive threats ahead of schedule. Land-searching, mana dorks, and mana rocks let you deploy haymakers while opponents are still developing.',
    keyCards: ['Cultivate', 'Kodama\'s Reach', 'Sol Ring', 'Rampant Growth', 'Nature\'s Lore'],
    budgetTip: 'Cultivate, Kodama\'s Reach, and Rampant Growth are extremely cheap ramp spells. Llanowar Elves and Elvish Mystic are pennies.',
    formatOverrides: {
      pauper: {
        searchQuery: 'cards that ramp or search for lands f:pauper',
        budgetTip: 'Llanowar Elves, Arbor Elf, and Wild Growth are common mana accelerants. Cultivate and Kodama\'s Reach are Pauper-legal at common.',
        keyCards: ['Llanowar Elves', 'Arbor Elf', 'Wild Growth', 'Utopia Sprawl', 'Cultivate'],
      },
      modern: {
        searchQuery: 'cards that ramp or search for lands f:modern',
        budgetTip: 'Utopia Sprawl, Arbor Elf, and Llanowar Elves are cheap Modern ramp. Primeval Titan is the premier payoff.',
        keyCards: ['Utopia Sprawl', 'Arbor Elf', 'Primeval Titan', 'Amulet of Vigor', 'Dryad of the Ilysian Grove'],
      },
    },
  },
];
