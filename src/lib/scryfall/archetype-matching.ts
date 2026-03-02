/**
 * Match a card's oracle text and type line against known Commander archetypes.
 * Returns matching archetype slugs for display as chips.
 * @module lib/scryfall/archetype-matching
 */

import { ARCHETYPES, type Archetype } from '@/data/archetypes';

/** Keywords that signal a card fits a given archetype */
const ARCHETYPE_SIGNALS: Record<string, string[]> = {
  voltron: ['equip', 'equipped', 'aura', 'enchanted creature', 'attach', 'double strike', 'hexproof'],
  aristocrats: ['when', 'dies', 'sacrifice', 'drain', 'blood artist', 'whenever a creature dies'],
  spellslinger: ['instant', 'sorcery', 'magecraft', 'whenever you cast', 'copy', 'storm'],
  tokens: ['create', 'token', 'populate', 'go wide'],
  reanimator: ['return', 'graveyard', 'battlefield', 'reanimate', 'unearth'],
  stax: ['can\'t', 'tax', 'each opponent', 'nonland', 'additional cost'],
  'group-hug': ['each player draws', 'all players', 'each player may'],
  mill: ['mill', 'into their graveyard', 'library', 'top cards'],
  landfall: ['landfall', 'land enters', 'whenever a land'],
  lifegain: ['gain life', 'lifelink', 'whenever you gain life'],
  counters: ['+1/+1 counter', 'proliferate', 'counter on'],
  blink: ['exile', 'return', 'enters the battlefield', 'flicker'],
  wheels: ['discard', 'draw', 'each player discards', 'wheel'],
  graveyard: ['graveyard', 'mill', 'dredge', 'flashback', 'escape'],
  superfriends: ['planeswalker', 'loyalty', 'proliferate'],
  enchantress: ['enchantment', 'whenever you cast an enchantment', 'constellation'],
  infect: ['infect', 'poison counter', 'toxic', 'proliferate'],
  treasure: ['treasure', 'treasure token', 'create a treasure'],
  storm: ['storm', 'cast', 'copy', 'mana cost', 'cost less'],
  chaos: ['random', 'coin', 'flip', 'chaos'],
  tribal: ['lord', 'creature type', 'same type', 'chosen type'],
  pillowfort: ['can\'t attack', 'must pay', 'ghostly prison', 'propaganda'],
  control: ['counter target', 'destroy all', 'exile all', 'return all'],
};

/**
 * Find archetypes that match a card's text.
 *
 * @param oracleText - The card's oracle/rules text
 * @param typeLine - The card's type line
 * @returns Matched archetypes (max 4)
 */
export function matchArchetypes(
  oracleText: string | undefined,
  typeLine: string,
): Archetype[] {
  if (!oracleText && !typeLine) return [];

  const searchText = `${oracleText ?? ''} ${typeLine}`.toLowerCase();
  const matches: { archetype: Archetype; score: number }[] = [];

  for (const archetype of ARCHETYPES) {
    const signals = ARCHETYPE_SIGNALS[archetype.slug];
    if (!signals) continue;

    let score = 0;
    for (const signal of signals) {
      if (searchText.includes(signal)) {
        score++;
      }
    }

    // Require at least 2 keyword matches to avoid false positives
    if (score >= 2) {
      matches.push({ archetype, score });
    }
  }

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((m) => m.archetype);
}
