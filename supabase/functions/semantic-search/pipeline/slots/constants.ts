/**
 * Slot Extraction – Constants & Lookup Tables
 * @module pipeline/slots/constants
 */

/** Format aliases → canonical Scryfall format names */
export const FORMAT_MAP: Record<string, string> = {
  commander: 'commander',
  edh: 'commander',
  modern: 'modern',
  standard: 'standard',
  pioneer: 'pioneer',
  legacy: 'legacy',
  vintage: 'vintage',
  pauper: 'pauper',
  historic: 'historic',
  brawl: 'brawl',
  alchemy: 'alchemy',
  explorer: 'explorer',
  timeless: 'timeless',
};

/** Rarity aliases → canonical rarity values */
export const RARITY_MAP: Record<string, string> = {
  common: 'common',
  commons: 'common',
  uncommon: 'uncommon',
  uncommons: 'uncommon',
  rare: 'rare',
  rares: 'rare',
  mythic: 'mythic',
  mythics: 'mythic',
  'mythic rare': 'mythic',
};

/** Common creature/card subtypes to extract */
export const COMMON_SUBTYPES = [
  'elf', 'elves', 'goblin', 'goblins', 'zombie', 'zombies',
  'vampire', 'vampires', 'dragon', 'dragons', 'angel', 'angels',
  'demon', 'demons', 'spirit', 'spirits', 'human', 'humans',
  'wizard', 'wizards', 'warrior', 'warriors', 'soldier', 'soldiers',
  'merfolk', 'elemental', 'elementals', 'sliver', 'slivers',
  'dinosaur', 'dinosaurs', 'knight', 'knights', 'cleric', 'clerics',
  'rogue', 'rogues', 'pirate', 'pirates', 'cat', 'cats',
  'dog', 'dogs', 'bird', 'birds', 'beast', 'beasts',
  'equipment', 'aura', 'auras', 'saga', 'sagas', 'vehicle', 'vehicles',
];
