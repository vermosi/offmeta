export interface Archetype {
  id: string;
  name: string;
  description: string;
  gameplan: string;
  colorIdentity: string[];
  offMetaScore: number;
  budgetTier: 'budget' | 'medium' | 'expensive';
  coreCards: string[];
  flexCards: string[];
  tags: string[];
}

export const ARCHETYPES: Archetype[] = [
  // Rakdos
  {
    id: '1',
    name: 'Rakdos Treasure Storm',
    description: 'Generate massive amounts of treasures and convert them into card advantage and damage.',
    gameplan: 'Create treasure tokens, sacrifice them for value with payoffs like Marionette Master and Reckless Fireweaver. Close games with Disciple of the Vault triggers or massive X spells.',
    colorIdentity: ['B', 'R'],
    offMetaScore: 78,
    budgetTier: 'medium',
    coreCards: ['Marionette Master', 'Reckless Fireweaver', 'Disciple of the Vault', 'Pitiless Plunderer', 'Xorn', 'Academy Manufactor', 'Goldspan Dragon', 'Kalain, Reclusive Painter'],
    flexCards: ['Prosper, Tome-Bound', 'Mahadi, Emporium Master', 'Hoarding Ogre', 'Treasure Nabber', 'Deadly Dispute', 'Unexpected Windfall'],
    tags: ['treasures', 'artifacts', 'aristocrats', 'combo'],
  },
  // Simic
  {
    id: '2',
    name: 'Simic Landfall Tempo',
    description: 'Abuse landfall triggers with extra land drops and blink effects.',
    gameplan: 'Play lands, trigger landfall, bounce and replay lands for repeated value. Win through massive creatures or land-based combos.',
    colorIdentity: ['G', 'U'],
    offMetaScore: 65,
    budgetTier: 'budget',
    coreCards: ['Tatyova, Benthic Druid', 'Aesi, Tyrant of Gyre Strait', 'Scute Swarm', 'Avenger of Zendikar', 'Tireless Provisioner', 'Lotus Cobra', 'Oracle of Mul Daya', 'Azusa, Lost but Seeking'],
    flexCards: ['Roil Elemental', 'Rampaging Baloths', 'Retreat to Coralhelm', 'Kodama of the East Tree', 'Khalni Heart Expedition', 'Growth Spiral'],
    tags: ['landfall', 'ramp', 'value', 'tokens'],
  },
  // Jeskai
  {
    id: '3',
    name: 'Jeskai Spellslinger Storm',
    description: 'Cast spells, copy them, and overwhelm opponents with value.',
    gameplan: 'Play instant/sorcery matters cards, copy key spells, and win through spell damage or storm-like finishes.',
    colorIdentity: ['W', 'U', 'R'],
    offMetaScore: 55,
    budgetTier: 'expensive',
    coreCards: ['Thousand-Year Storm', 'Archmage Emeritus', 'Storm-Kiln Artist', 'Veyran, Voice of Duality', 'Guttersnipe', 'Young Pyromancer', 'Monastery Mentor', 'Mizzix of the Izmagnus'],
    flexCards: ['Expressive Iteration', 'Ponder', 'Preordain', 'Brainstorm', 'Seething Song', 'Pirate\'s Pillage'],
    tags: ['spellslinger', 'storm', 'copy', 'tokens'],
  },
  // Mono Black
  {
    id: '4',
    name: 'Mono-Black Reanimator',
    description: 'Fill your graveyard and cheat massive creatures into play.',
    gameplan: 'Use discard and mill to fill graveyard with threats, then reanimate them for lethal attacks or devastating ETB effects.',
    colorIdentity: ['B'],
    offMetaScore: 70,
    budgetTier: 'medium',
    coreCards: ['Reanimate', 'Animate Dead', 'Entomb', 'Buried Alive', 'Vilis, Broker of Blood', 'Razaketh, the Foulblooded', 'K\'rrik, Son of Yawgmoth', 'Gray Merchant of Asphodel'],
    flexCards: ['Victimize', 'Living Death', 'Rise of the Dark Realms', 'Sheoldred, Whispering One', 'Doom Whisperer', 'Chainer, Dementia Master'],
    tags: ['reanimator', 'graveyard', 'combo', 'big-creatures'],
  },
  // Selesnya
  {
    id: '5',
    name: 'Selesnya Enchantress',
    description: 'Draw cards by playing enchantments and overwhelm with constellation triggers.',
    gameplan: 'Play enchantresses to draw cards, build an enchantment-heavy board, and win through massive token generation or aura-based voltron.',
    colorIdentity: ['G', 'W'],
    offMetaScore: 60,
    budgetTier: 'budget',
    coreCards: ['Enchantress\'s Presence', 'Argothian Enchantress', 'Mesa Enchantress', 'Sanctum Weaver', 'Destiny Spinner', 'Sythis, Harvest\'s Hand', 'Setessan Champion', 'Herald of the Pantheon'],
    flexCards: ['Sigil of the Empty Throne', 'Sphere of Safety', 'Greater Auramancy', 'Sterling Grove', 'Mirari\'s Wake', 'Ancestral Mask'],
    tags: ['enchantments', 'card-draw', 'tokens', 'pillowfort'],
  },
  // Golgari
  {
    id: '6',
    name: 'Golgari Dredge Value',
    description: 'Self-mill for value and recur threats from the graveyard repeatedly.',
    gameplan: 'Fill graveyard with dredge and mill effects, then abuse graveyard synergies with Underrealm Lich and Meren.',
    colorIdentity: ['B', 'G'],
    offMetaScore: 72,
    budgetTier: 'medium',
    coreCards: ['Meren of Clan Nel Toth', 'Underrealm Lich', 'Golgari Grave-Troll', 'Life from the Loam', 'Stinkweed Imp', 'World Shaper', 'Splendid Reclamation', 'Ramunap Excavator'],
    flexCards: ['The Gitrog Monster', 'Hogaak, Arisen Necropolis', 'Izoni, Thousand-Eyed', 'Eternal Witness', 'Grisly Salvage', 'Satyr Wayfinder'],
    tags: ['dredge', 'graveyard', 'lands', 'value'],
  },
  // Boros
  {
    id: '7',
    name: 'Boros Equipment Voltron',
    description: 'Suit up creatures with powerful equipment and swing for lethal commander damage.',
    gameplan: 'Use equipment tutors and cost reducers to assemble devastating equipment suites on evasive creatures.',
    colorIdentity: ['R', 'W'],
    offMetaScore: 58,
    budgetTier: 'expensive',
    coreCards: ['Puresteel Paladin', 'Stoneforge Mystic', 'Stonehewer Giant', 'Sigarda\'s Aid', 'Hammer of Nazahn', 'Sword of Feast and Famine', 'Sword of Fire and Ice', 'Colossus Hammer'],
    flexCards: ['Ardenn, Intrepid Archaeologist', 'Wyleth, Soul of Steel', 'Akiri, Fearless Voyager', 'Plate Armor', 'Fighter Class', 'Open the Armory'],
    tags: ['equipment', 'voltron', 'combat', 'artifacts'],
  },
  // Izzet
  {
    id: '8',
    name: 'Izzet Artifact Combo',
    description: 'Combine artifacts with untap effects for infinite mana and card draw.',
    gameplan: 'Assemble artifact combos with pieces like Dramatic Reversal + Isochron Scepter or Basalt Monolith + Rings of Brighthearth.',
    colorIdentity: ['U', 'R'],
    offMetaScore: 68,
    budgetTier: 'expensive',
    coreCards: ['Isochron Scepter', 'Dramatic Reversal', 'Rings of Brighthearth', 'Basalt Monolith', 'Sensei\'s Divining Top', 'Mystic Forge', 'Birgi, God of Storytelling', 'Underworld Breach'],
    flexCards: ['Goblin Engineer', 'Goblin Welder', 'Emry, Lurker of the Loch', 'Urza\'s Saga', 'Whir of Invention', 'Reshape'],
    tags: ['artifacts', 'combo', 'infinite', 'control'],
  },
  // Orzhov
  {
    id: '9',
    name: 'Orzhov Lifegain Drain',
    description: 'Gain massive amounts of life and convert it into damage to opponents.',
    gameplan: 'Use lifegain triggers to fuel payoffs like Vito, Aetherflux Reservoir, and Sanguine Bond for sudden kills.',
    colorIdentity: ['W', 'B'],
    offMetaScore: 52,
    budgetTier: 'budget',
    coreCards: ['Vito, Thorn of the Dusk Rose', 'Sanguine Bond', 'Exquisite Blood', 'Aetherflux Reservoir', 'Soul Warden', 'Soul\'s Attendant', 'Daxos, Blessed by the Sun', 'Ajani\'s Pridemate'],
    flexCards: ['Heliod, Sun-Crowned', 'Archangel of Thune', 'Cleric Class', 'Griffin Aerie', 'Righteous Valkyrie', 'Karlov of the Ghost Council'],
    tags: ['lifegain', 'drain', 'combo', 'aristocrats'],
  },
  // Gruul
  {
    id: '10',
    name: 'Gruul Power Matters',
    description: 'Play big creatures and capitalize on high power for card advantage.',
    gameplan: 'Drop massive threats early with ramp, then draw cards based on creature power. Overwhelm with combat.',
    colorIdentity: ['R', 'G'],
    offMetaScore: 63,
    budgetTier: 'budget',
    coreCards: ['Garruk\'s Uprising', 'Elemental Bond', 'Colossal Majesty', 'Ghalta, Primal Hunger', 'Goreclaw, Terror of Qal Sisma', 'Selvala, Heart of the Wilds', 'Kogla, the Titan Ape', 'Xenagos, God of Revels'],
    flexCards: ['Etali, Primal Storm', 'Quartzwood Crasher', 'Rhythm of the Wild', 'Greater Good', 'Life\'s Legacy', 'Rishkar\'s Expertise'],
    tags: ['stompy', 'big-creatures', 'card-draw', 'combat'],
  },
  // Dimir
  {
    id: '11',
    name: 'Dimir Mill Control',
    description: 'Mill opponents out while controlling the board with removal and counterspells.',
    gameplan: 'Stall the game with removal and counters while gradually milling opponents. Win by decking or Thassa\'s Oracle.',
    colorIdentity: ['U', 'B'],
    offMetaScore: 75,
    budgetTier: 'medium',
    coreCards: ['Bruvac the Grandiloquent', 'Maddening Cacophony', 'Traumatize', 'Fleet Swallower', 'Fraying Sanity', 'Sphinx\'s Tutelage', 'Altar of the Brood', 'Mindcrank'],
    flexCards: ['Consuming Aberration', 'Phenax, God of Deception', 'Zellix, Sanity Flayer', 'Duskmantle Guildmage', 'Archive Trap', 'Glimpse the Unthinkable'],
    tags: ['mill', 'control', 'combo', 'alternate-wincon'],
  },
  // Azorius
  {
    id: '12',
    name: 'Azorius Blink Value',
    description: 'Flicker creatures for repeated ETB triggers and overwhelming value.',
    gameplan: 'Use blink effects on high-value ETB creatures to generate cards, tokens, and board control.',
    colorIdentity: ['W', 'U'],
    offMetaScore: 48,
    budgetTier: 'medium',
    coreCards: ['Brago, King Eternal', 'Yorion, Sky Nomad', 'Soulherder', 'Restoration Angel', 'Mulldrifter', 'Cloudblazer', 'Ephemerate', 'Conjurer\'s Closet'],
    flexCards: ['Thassa, Deep-Dwelling', 'Charming Prince', 'Elite Guardmage', 'Skyclave Apparition', 'Recruiter of the Guard', 'Momentary Blink'],
    tags: ['blink', 'etb', 'value', 'control'],
  },
  // Mono Green
  {
    id: '13',
    name: 'Mono-Green Elfball',
    description: 'Flood the board with elves and generate massive amounts of mana for big finishers.',
    gameplan: 'Deploy mana elves, multiply them with lords and token makers, then sink mana into Craterhoof or similar finishers.',
    colorIdentity: ['G'],
    offMetaScore: 45,
    budgetTier: 'budget',
    coreCards: ['Llanowar Elves', 'Elvish Mystic', 'Priest of Titania', 'Elvish Archdruid', 'Craterhoof Behemoth', 'Ezuri, Renegade Leader', 'Beast Whisperer', 'Elvish Visionary'],
    flexCards: ['Marwyn, the Nurturer', 'Wirewood Symbiote', 'Quirion Ranger', 'Finale of Devastation', 'Chord of Calling', 'Collected Company'],
    tags: ['elves', 'tribal', 'mana-dorks', 'combo'],
  },
  // Mono Red
  {
    id: '14',
    name: 'Mono-Red Goblin Tribal',
    description: 'Swarm the board with goblins and win through sheer numbers or combo kills.',
    gameplan: 'Deploy goblin tokens and lords, then use Skirk Prospector + Muxus or Krenko for explosive finishes.',
    colorIdentity: ['R'],
    offMetaScore: 50,
    budgetTier: 'budget',
    coreCards: ['Krenko, Mob Boss', 'Muxus, Goblin Grandee', 'Goblin Matron', 'Goblin Recruiter', 'Skirk Prospector', 'Goblin Warchief', 'Goblin Chieftain', 'Conspicuous Snoop'],
    flexCards: ['Pashalik Mons', 'Goblin Ringleader', 'Legion Loyalist', 'Goblin Trashmaster', 'Impact Tremors', 'Shared Animosity'],
    tags: ['goblins', 'tribal', 'tokens', 'combo'],
  },
  // Mono White
  {
    id: '15',
    name: 'Mono-White Soldiers',
    description: 'Build an army of soldiers with powerful anthem effects and go wide.',
    gameplan: 'Create soldier tokens, buff them with lords and anthems, then swing for lethal damage.',
    colorIdentity: ['W'],
    offMetaScore: 67,
    budgetTier: 'budget',
    coreCards: ['Adeline, Resplendent Cathar', 'Preeminent Captain', 'Catapult Master', 'Ballyrush Banneret', 'Field Marshal', 'Intrepid Hero', 'Raise the Alarm', 'Deployment Horn'],
    flexCards: ['Valiant Veteran', 'Haazda Marshal', 'Luminarch Aspirant', 'Thalia\'s Lieutenant', 'Coat of Arms', 'Horn of Gondor'],
    tags: ['soldiers', 'tribal', 'tokens', 'go-wide'],
  },
  // Mono Blue
  {
    id: '16',
    name: 'Mono-Blue Sea Creatures',
    description: 'Ramp into massive sea creatures and control the board with bounce and counters.',
    gameplan: 'Use cost reducers like Whelming Wave and Quest for Ula\'s Temple to cheat out krakens and leviathans.',
    colorIdentity: ['U'],
    offMetaScore: 82,
    budgetTier: 'medium',
    coreCards: ['Quest for Ula\'s Temple', 'Serpent of Yawning Depths', 'Slinn Voda, the Rising Deep', 'Stormtide Leviathan', 'Whelming Wave', 'Scourge of Fleets', 'Kiora, the Crashing Wave', 'Thassa\'s Oracle'],
    flexCards: ['Arixmethes, Slumbering Isle', 'Spawning Kraken', 'Inkwell Leviathan', 'Kederekt Leviathan', 'Reef Worm', 'Brainstorm'],
    tags: ['sea-creatures', 'tribal', 'big-creatures', 'control'],
  },
  // Naya
  {
    id: '17',
    name: 'Naya Tokens',
    description: 'Generate massive token armies and pump them for devastating attacks.',
    gameplan: 'Create tokens with spells and creatures, double them with population effects, then buff with anthems for alpha strikes.',
    colorIdentity: ['R', 'G', 'W'],
    offMetaScore: 55,
    budgetTier: 'medium',
    coreCards: ['Jetmir, Nexus of Revels', 'Anointed Procession', 'Parallel Lives', 'Doubling Season', 'Rhys the Redeemed', 'Tendershoot Dryad', 'Ohran Frostfang', 'Beastmaster Ascension'],
    flexCards: ['Purphoros, God of the Forge', 'Impact Tremors', 'Secure the Wastes', 'March of the Multitudes', 'Aura Shards', 'Cathars\' Crusade'],
    tags: ['tokens', 'go-wide', 'combat', 'enchantments'],
  },
  // Esper
  {
    id: '18',
    name: 'Esper Artifacts Control',
    description: 'Control the game with artifact synergies and grind out value.',
    gameplan: 'Use artifact-based removal, card draw, and recursion to outlast opponents while assembling win conditions.',
    colorIdentity: ['W', 'U', 'B'],
    offMetaScore: 62,
    budgetTier: 'expensive',
    coreCards: ['Sharuum the Hegemon', 'Sphinx of the Steel Wind', 'Ethersworn Canonist', 'Time Sieve', 'Thopter Foundry', 'Sword of the Meek', 'Scourglass', 'Baleful Strix'],
    flexCards: ['Tezzeret the Seeker', 'Master Transmuter', 'Phyrexian Metamorph', 'Sculpting Steel', 'Disciple of the Vault', 'Cranial Plating'],
    tags: ['artifacts', 'control', 'combo', 'recursion'],
  },
  // Jund
  {
    id: '19',
    name: 'Jund Sacrifice',
    description: 'Sacrifice creatures for value and drain opponents with death triggers.',
    gameplan: 'Create tokens and sacrifice them to engines like Korvold while triggering Blood Artist effects.',
    colorIdentity: ['B', 'R', 'G'],
    offMetaScore: 48,
    budgetTier: 'medium',
    coreCards: ['Korvold, Fae-Cursed King', 'Mayhem Devil', 'Blood Artist', 'Zulaport Cutthroat', 'Pitiless Plunderer', 'Viscera Seer', 'Goblin Bombardment', 'Skullclamp'],
    flexCards: ['Prossh, Skyraider of Kher', 'Tend the Pests', 'Chatterfang, Squirrel General', 'Dockside Extortionist', 'Ophiomancer', 'Yawgmoth, Thran Physician'],
    tags: ['sacrifice', 'aristocrats', 'tokens', 'value'],
  },
  // Sultai
  {
    id: '20',
    name: 'Sultai Self-Mill Value',
    description: 'Fill your graveyard and use it as a second hand with powerful recursion.',
    gameplan: 'Mill yourself to fuel delve, escape, and recursion effects. Win through graveyard-based combos or value.',
    colorIdentity: ['B', 'G', 'U'],
    offMetaScore: 58,
    budgetTier: 'medium',
    coreCards: ['Sidisi, Brood Tyrant', 'Muldrotha, the Gravetide', 'Tasigur, the Golden Fang', 'Wonder', 'Filth', 'Animate Dead', 'Life from the Loam', 'Hermit Druid'],
    flexCards: ['The Mimeoplasm', 'Syr Konrad, the Grim', 'Splinterfright', 'Golgari Grave-Troll', 'Nyx Weaver', 'Spider Spawning'],
    tags: ['graveyard', 'self-mill', 'value', 'recursion'],
  },
];
