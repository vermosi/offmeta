/**
 * Static data for the Search Help Modal.
 * The UI resolves labels and descriptions through i18n keys.
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
    categoryKey: 'help.examples.basic',
    icon: Lightbulb,
    examples: [
      { query: 'cheap red creatures', descriptionKey: 'help.examples.basic1' },
      { query: 'blue card draw spells', descriptionKey: 'help.examples.basic2' },
      { query: 'green ramp cards', descriptionKey: 'help.examples.basic3' },
      { query: 'black removal', descriptionKey: 'help.examples.basic4' },
    ],
  },
  {
    categoryKey: 'help.examples.strategy',
    icon: Target,
    examples: [
      { query: 'sacrifice outlets for commander', descriptionKey: 'help.examples.strategy1' },
      { query: 'cards that make treasure tokens', descriptionKey: 'help.examples.strategy2' },
      { query: 'ETB triggers that deal damage', descriptionKey: 'help.examples.strategy3' },
      { query: 'graveyard recursion in white', descriptionKey: 'help.examples.strategy4' },
    ],
  },
  {
    categoryKey: 'help.examples.format',
    icon: Zap,
    examples: [
      { query: 'modern legal counterspells', descriptionKey: 'help.examples.format1' },
      { query: 'pauper staples for mono blue', descriptionKey: 'help.examples.format2' },
      { query: 'commander dragons under $5', descriptionKey: 'help.examples.format3' },
      { query: 'standard legal board wipes', descriptionKey: 'help.examples.format4' },
    ],
  },
  {
    categoryKey: 'help.examples.mana',
    icon: Mountain,
    examples: [
      { query: 'artifacts that produce 2 mana', descriptionKey: 'help.examples.mana1' },
      { query: 'red or black creatures under 3 mana', descriptionKey: 'help.examples.mana2' },
      { query: 'lands that produce any color', descriptionKey: 'help.examples.mana3' },
      { query: 'mana dorks that cost 1', descriptionKey: 'help.examples.mana4' },
    ],
  },
  {
    categoryKey: 'help.examples.tribal',
    icon: Users,
    examples: [
      { query: 'elf lords', descriptionKey: 'help.examples.tribal1' },
      { query: 'zombie tribal payoffs', descriptionKey: 'help.examples.tribal2' },
      { query: 'dragon commanders under $10', descriptionKey: 'help.examples.tribal3' },
      { query: 'goblin token generators', descriptionKey: 'help.examples.tribal4' },
    ],
  },
  {
    categoryKey: 'help.examples.complex',
    icon: Sparkles,
    examples: [
      { query: 'creatures that double ETB effects', descriptionKey: 'help.examples.complex1' },
      { query: 'artifacts that produce 2 mana and cost 4 or less', descriptionKey: 'help.examples.complex2' },
      { query: 'red or black creature that draws cards', descriptionKey: 'help.examples.complex3' },
      { query: 'enchantments that draw cards when creatures die', descriptionKey: 'help.examples.complex4' },
    ],
  },
] as const;

export const CONFIDENCE_LEVELS = [
  {
    levelKey: 'help.confidence.highLevel',
    color: 'bg-success/10 text-success border-success/30',
    descriptionKey: 'help.confidence.highDescription',
    examples: ['red creatures', 'blue instants', 'legendary dragons'],
  },
  {
    levelKey: 'help.confidence.mediumLevel',
    color: 'bg-warning/10 text-warning border-warning/30',
    descriptionKey: 'help.confidence.mediumDescription',
    examples: ['cards that go infinite', 'combo pieces for Yawgmoth'],
  },
  {
    levelKey: 'help.confidence.lowLevel',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
    descriptionKey: 'help.confidence.lowDescription',
    examples: ['that one card from the set with the thing'],
  },
] as const;

export const TIPS = [
  'help.tips.1',
  'help.tips.2',
  'help.tips.3',
  'help.tips.4',
  'help.tips.5',
  'help.tips.6',
  'help.tips.7',
  'help.tips.8',
  'help.tips.9',
  'help.tips.10',
] as const;

export const ADVANCED_FEATURES = [
  {
    categoryKey: 'help.advanced.landTypes',
    items: ['help.advanced.landTypes1', 'help.advanced.landTypes2', 'help.advanced.landTypes3'],
  },
  {
    categoryKey: 'help.advanced.sorting',
    items: ['help.advanced.sorting1', 'help.advanced.sorting2', 'help.advanced.sorting3'],
  },
  {
    categoryKey: 'help.advanced.legality',
    items: ['help.advanced.legality1', 'help.advanced.legality2', 'help.advanced.legality3'],
  },
  {
    categoryKey: 'help.advanced.price',
    items: ['help.advanced.price1', 'help.advanced.price2', 'help.advanced.price3'],
  },
  {
    categoryKey: 'help.advanced.commander',
    items: ['help.advanced.commander1', 'help.advanced.commander2', 'help.advanced.commander3'],
  },
] as const;

export const SCRYFALL_SYNTAX_TIPS = [
  {
    syntax: 'c<=rb',
    meaningKey: 'help.syntax.c1Meaning',
    example: 'help.syntax.c1Example',
    descriptionKey: 'help.syntax.c1Description',
  },
  {
    syntax: 'c>=rb',
    meaningKey: 'help.syntax.c2Meaning',
    example: 'help.syntax.c2Example',
    descriptionKey: 'help.syntax.c2Description',
  },
  {
    syntax: 'c=r',
    meaningKey: 'help.syntax.c3Meaning',
    example: 'help.syntax.c3Example',
    descriptionKey: 'help.syntax.c3Description',
  },
  {
    syntax: 'id<=br',
    meaningKey: 'help.syntax.c4Meaning',
    example: 'help.syntax.c4Example',
    descriptionKey: 'help.syntax.c4Description',
  },
  {
    syntax: 'produces>=2',
    meaningKey: 'help.syntax.c5Meaning',
    example: 'help.syntax.c5Example',
    descriptionKey: 'help.syntax.c5Description',
  },
  {
    syntax: 'produces:g',
    meaningKey: 'help.syntax.c6Meaning',
    example: 'help.syntax.c6Example',
    descriptionKey: 'help.syntax.c6Description',
  },
  {
    syntax: 'mv<=4',
    meaningKey: 'help.syntax.c7Meaning',
    example: 'help.syntax.c7Example',
    descriptionKey: 'help.syntax.c7Description',
  },
  {
    syntax: 'year>=2020',
    meaningKey: 'help.syntax.c8Meaning',
    example: 'help.syntax.c8Example',
    descriptionKey: 'help.syntax.c8Description',
  },
] as const;
