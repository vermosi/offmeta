/**
 * Archetype and strategy mappings for MTG deck themes.
 * Maps common deck strategy terms to appropriate Scryfall syntax.
 * @module mappings/archetypes
 */

/**
 * Deck archetype/strategy mappings
 */
export const ARCHETYPE_MAP: Record<string, string> = {
  sacrifice:
    '(otag:sacrifice-outlet or (o:"whenever" (o:"dies" or o:"sacrifice")))',
  spellslinger:
    '(t:instant or t:sorcery or (o:"whenever you cast" (o:"instant" or o:"sorcery")))',
  tokens: 'o:"create" o:"token"',
  aggro: 't:creature mv<=3 pow>=2',
  voltron:
    '(t:equipment or t:aura or o:"equipped creature" or o:"enchanted creature")',
  aristocrats: '(otag:sacrifice-outlet or (o:"whenever" (o:"dies" or o:"sacrifice")))',
  reanimator: 'otag:reanimate',
  control: '(otag:removal or otag:board-wipe)',
  combo:
    '(o:"infinite" or o:"you win the game" or o:"opponents lose the game")',
  midrange: 't:creature mv>=3 mv<=5',
  lifegain: 'otag:lifegain',
  mill: '(o:"mill" or o:"puts cards from" o:"into" o:"graveyard")',
  discard: '(o:"discard" o:"opponent")',
  graveyard:
    '(otag:reanimate or o:"from your graveyard")',
  tribal: '(otag:lord or otag:anthem)',
  superfriends: 't:planeswalker',
  landfall: '(otag:landfall or otag:extra-land)',
  treasure: '(o:"create" o:"Treasure" or o:"Treasure token")',
  chaos: '(o:"coin" or o:"random" or o:"chaos")',
};
