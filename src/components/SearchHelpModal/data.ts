/**
 * Static data for the Search Help Modal.
 * Examples, tips, confidence levels, and syntax references.
 */

import {
  Lightbulb,
  Sparkles,
  Zap,
  Target,
  Mountain,
  Users,
} from 'lucide-react';

export const EXAMPLE_QUERIES = [
  {
    category: 'Basic Searches',
    icon: Lightbulb,
    examples: [
      {
        query: 'cheap red creatures',
        description: 'Low-cost red creature cards',
      },
      {
        query: 'blue card draw spells',
        description: 'Blue instants/sorceries that draw cards',
      },
      { query: 'green ramp cards', description: 'Green mana acceleration' },
      {
        query: 'black removal',
        description: 'Black creature destruction spells',
      },
    ],
  },
  {
    category: 'Strategy & Synergy',
    icon: Target,
    examples: [
      {
        query: 'sacrifice outlets for commander',
        description: 'Cards that let you sacrifice permanents',
      },
      {
        query: 'cards that make treasure tokens',
        description: 'Treasure token generators',
      },
      {
        query: 'ETB triggers that deal damage',
        description: 'Enter-the-battlefield damage effects',
      },
      {
        query: 'graveyard recursion in white',
        description: 'White cards that return things from graveyard',
      },
    ],
  },
  {
    category: 'Format-Specific',
    icon: Zap,
    examples: [
      {
        query: 'modern legal counterspells',
        description: 'Counter magic playable in Modern',
      },
      {
        query: 'pauper staples for mono blue',
        description: 'Common blue cards for Pauper',
      },
      {
        query: 'commander dragons under $5',
        description: 'Budget legendary dragons',
      },
      {
        query: 'standard legal board wipes',
        description: 'Mass removal in current Standard',
      },
    ],
  },
  {
    category: 'Mana & Colors',
    icon: Mountain,
    examples: [
      {
        query: 'artifacts that produce 2 mana',
        description: 'Mana rocks with high output',
      },
      {
        query: 'red or black creatures under 3 mana',
        description: 'Cheap Rakdos-only creatures',
      },
      {
        query: 'lands that produce any color',
        description: 'Five-color mana fixing',
      },
      {
        query: 'mana dorks that cost 1',
        description: 'One-mana creature ramp',
      },
    ],
  },
  {
    category: 'Tribal / Typal',
    icon: Users,
    examples: [
      { query: 'elf lords', description: 'Elves that buff other elves' },
      {
        query: 'zombie tribal payoffs',
        description: 'Cards that reward playing zombies',
      },
      {
        query: 'dragon commanders under $10',
        description: 'Budget legendary dragons',
      },
      {
        query: 'goblin token generators',
        description: 'Cards that create goblin tokens',
      },
    ],
  },
  {
    category: 'Complex Queries',
    icon: Sparkles,
    examples: [
      {
        query: 'creatures that double ETB effects',
        description: 'Panharmonicon-style effects',
      },
      {
        query: 'artifacts that produce 2 mana and cost 4 or less',
        description: 'Efficient mana rocks',
      },
      {
        query: 'red or black creature that draws cards',
        description: 'Rakdos card advantage creatures',
      },
      {
        query: 'enchantments that draw cards when creatures die',
        description: 'Death trigger card advantage',
      },
    ],
  },
];

export const CONFIDENCE_LEVELS = [
  {
    level: 'High (80-100%)',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
    description:
      'The search engine is very confident it understood your query correctly. Results should closely match what you asked for.',
    examples: ['red creatures', 'blue instants', 'legendary dragons'],
  },
  {
    level: 'Medium (50-79%)',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
    description:
      'The engine made some assumptions about your query. Check the interpretation to see if it matches your intent.',
    examples: ['cards that go infinite', 'combo pieces for Yawgmoth'],
  },
  {
    level: 'Low (<50%)',
    color: 'bg-red-500/10 text-red-600 border-red-500/30',
    description:
      'The engine is uncertain about the translation. Consider rephrasing or using more specific terms.',
    examples: ['that one card from the set with the thing'],
  },
];

export const TIPS = [
  'Be specific about colors, formats, and card types when possible',
  "Use common MTG terminology like 'ETB', 'ramp', 'mill', 'voltron'",
  "Mention price constraints like 'under $5' or 'budget'",
  "Specify formats: 'modern legal', 'commander staple', 'pauper playable'",
  "Describe effects: 'draws cards', 'destroys creatures', 'gains life'",
  "Use color combinations: 'Rakdos', 'Simic', 'Esper', 'Naya'",
  "Reference archetypes: 'aristocrats', 'tokens', 'control', 'aggro'",
  "Search land types: 'fetch lands', 'shock lands', 'check lands', 'triomes'",
  "Tribal searches work: 'goblin lords', 'elf tribal', 'zombie payoffs'",
  "Sort results: 'sorted by price', 'cheapest first', 'by popularity'",
];

export const ADVANCED_FEATURES = [
  {
    category: 'Land Type Shortcuts',
    items: [
      'fetch lands, shock lands, check lands, pain lands',
      'fast lands, slow lands, dual lands, triomes',
      'bounce lands, filter lands, MDFCs',
    ],
  },
  {
    category: 'Sorting & Display',
    items: [
      'sorted by price, cheapest first',
      'sorted by popularity (EDHREC rank)',
      'newest printings, oldest printing',
    ],
  },
  {
    category: 'Format Legality',
    items: [
      'banned in commander, restricted in vintage',
      'not legal in modern, legal in pioneer',
      'pauper legal, historic legal',
    ],
  },
  {
    category: 'Price Preferences',
    items: [
      'under $5, budget, cheap',
      'under $1 for pauper, expensive staples',
      'cheapest version, premium printing',
    ],
  },
  {
    category: 'Commander-Specific',
    items: [
      'partner commanders, backgrounds',
      'cEDH staples, casual commander',
      'fast mana, staples for [color]',
    ],
  },
];

export const SCRYFALL_SYNTAX_TIPS = [
  {
    syntax: 'c<=rb',
    meaning: 'Color restricted to red/black only',
    example: '"red or black creature" → c<=rb t:creature',
    description:
      'Excludes Gruul, Grixis, etc. — only mono-red, mono-black, or Rakdos',
  },
  {
    syntax: 'c>=rb',
    meaning: 'Must have BOTH red AND black',
    example: '"red and black creature" → c>=rb t:creature',
    description: 'Requires both colors — includes Rakdos, Grixis, Mardu, etc.',
  },
  {
    syntax: 'c=r',
    meaning: 'Exactly this color only (mono)',
    example: '"mono red creature" → c=r t:creature',
    description: 'Excludes all multicolor cards',
  },
  {
    syntax: 'id<=br',
    meaning: 'Playable in Rakdos commander',
    example: '"fits in Rakdos deck" → id<=br',
    description:
      'Color identity — includes colorless, mono-R, mono-B, and Rakdos',
  },
  {
    syntax: 'produces>=2',
    meaning: 'Produces 2+ mana',
    example: '"artifact that makes 2 mana" → t:artifact produces>=2',
    description: 'Filter by mana production amount',
  },
  {
    syntax: 'produces:g',
    meaning: 'Produces green mana',
    example: '"lands that tap for green" → t:land produces:g',
    description: 'Filter by mana color production',
  },
  {
    syntax: 'mv<=4',
    meaning: 'Mana value 4 or less',
    example: '"cheap dragons" → t:dragon mv<=4',
    description: 'Also: mv=3 (exactly 3), mv>=5 (5+)',
  },
  {
    syntax: 'year>=2020',
    meaning: 'Printed in 2020 or later',
    example: '"recent commanders" → is:commander year>=2020',
    description: 'Filter by release year',
  },
];
