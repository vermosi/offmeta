/**
 * Curated keyword-to-suggestion mappings for "Similar Searches" feature.
 * Each keyword maps to an array of related natural-language queries.
 */

export interface SuggestionEntry {
  label: string;
  query: string;
  /** Optional guide page link */
  guidePath?: string;
}

const KEYWORD_SUGGESTIONS: Record<string, SuggestionEntry[]> = {
  ramp: [
    { label: 'Mana dorks', query: 'creatures that tap for mana' },
    { label: 'Land fetch', query: 'spells that search for lands' },
    { label: 'Cost reduction', query: 'cards that reduce spell costs' },
    { label: 'Green ramp guide', query: 'best green ramp cards', guidePath: '/guides/best-green-ramp-cards' },
  ],
  treasure: [
    { label: 'Token doublers', query: 'cards that double tokens' },
    { label: 'Artifact sacrifice', query: 'cards that benefit from sacrificing artifacts' },
    { label: 'Treasure makers', query: 'creatures that create treasure tokens', guidePath: '/guides/best-treasure-token-cards' },
    { label: 'Pirate tribal', query: 'pirate tribal commander cards' },
  ],
  removal: [
    { label: 'Board wipes', query: 'budget board wipes', guidePath: '/guides/budget-board-wipes' },
    { label: 'Spot removal', query: 'instant speed creature removal' },
    { label: 'Exile effects', query: 'cards that exile permanents' },
    { label: 'Enchantment removal', query: 'cards that destroy enchantments' },
  ],
  draw: [
    { label: 'Card advantage', query: 'best card draw spells', guidePath: '/guides/best-card-draw-spells' },
    { label: 'Cantrips', query: 'one mana cantrip spells' },
    { label: 'Draw engines', query: 'enchantments that draw cards each turn' },
    { label: 'Wheels', query: 'wheel effects that make everyone draw' },
  ],
  commander: [
    { label: 'Budget staples', query: 'budget commander staples', guidePath: '/guides/budget-commander-staples' },
    { label: 'Sol Ring alternatives', query: 'mana rocks under $2' },
    { label: 'Commander protection', query: 'cards that protect your commander' },
    { label: 'Lands for EDH', query: 'budget dual lands for commander' },
  ],
  sacrifice: [
    { label: 'Aristocrats', query: 'cards that drain when creatures die' },
    { label: 'Token generators', query: 'cheap creatures that make tokens' },
    { label: 'Death triggers', query: 'creatures with death triggers' },
    { label: 'Sac outlets', query: 'free sacrifice outlets' },
  ],
  token: [
    { label: 'Token doublers', query: 'cards that double token creation' },
    { label: 'Go wide', query: 'cards that make many creature tokens' },
    { label: 'Populate', query: 'populate cards that copy tokens' },
    { label: 'Treasure tokens', query: 'best treasure token cards', guidePath: '/guides/best-treasure-token-cards' },
  ],
  graveyard: [
    { label: 'Reanimation', query: 'spells that return creatures from graveyard' },
    { label: 'Self-mill', query: 'cards that mill yourself' },
    { label: 'Graveyard hate', query: 'cards that exile graveyards' },
    { label: 'Flashback', query: 'powerful flashback spells' },
  ],
  counter: [
    { label: 'Counterspells', query: 'best budget counterspells' },
    { label: '+1/+1 counters', query: 'cards that add +1/+1 counters' },
    { label: 'Proliferate', query: 'proliferate cards' },
    { label: 'Counter synergy', query: 'creatures that enter with counters' },
  ],
  tutor: [
    { label: 'Budget tutors', query: 'cheap tutor spells under $5' },
    { label: 'Creature tutors', query: 'cards that search for creatures' },
    { label: 'Land tutors', query: 'spells that search for any land' },
    { label: 'Artifact tutors', query: 'cards that search for artifacts' },
  ],
  stax: [
    { label: 'Tax effects', query: 'cards that tax opponents spells' },
    { label: 'Hate bears', query: 'small creatures with disruptive abilities' },
    { label: 'Resource denial', query: 'cards that limit opponents resources' },
    { label: 'Static hate', query: 'enchantments that slow opponents down' },
  ],
  land: [
    { label: 'Dual lands', query: 'budget dual lands for commander' },
    { label: 'Utility lands', query: 'lands with useful activated abilities' },
    { label: 'Fetch lands', query: 'budget fetch land alternatives' },
    { label: 'Land destruction', query: 'cards that destroy nonbasic lands' },
  ],
  enchantment: [
    { label: 'Enchantress', query: 'cards that draw when you cast enchantments' },
    { label: 'Auras', query: 'powerful creature auras' },
    { label: 'Enchantment removal', query: 'cards that destroy enchantments' },
    { label: 'Constellation', query: 'constellation trigger cards' },
  ],
  artifact: [
    { label: 'Mana rocks', query: 'best mana rocks for commander' },
    { label: 'Equipment', query: 'powerful equipment cards' },
    { label: 'Artifact synergy', query: 'cards that benefit from artifacts' },
    { label: 'Artifact removal', query: 'cards that destroy artifacts' },
  ],
  burn: [
    { label: 'Direct damage', query: 'spells that deal damage to any target' },
    { label: 'Damage doublers', query: 'cards that double damage' },
    { label: 'Ping effects', query: 'creatures that deal 1 damage repeatedly' },
    { label: 'X spells', query: 'red X damage spells' },
  ],
  lifegain: [
    { label: 'Soul sisters', query: 'creatures that gain life when creatures enter' },
    { label: 'Lifegain payoffs', query: 'cards that benefit from gaining life' },
    { label: 'Drain effects', query: 'cards that drain opponents life' },
    { label: 'Life doublers', query: 'cards that double life gain' },
  ],
  mill: [
    { label: 'Self-mill', query: 'cards that mill yourself' },
    { label: 'Mill opponents', query: 'cards that mill opponents libraries' },
    { label: 'Mill payoffs', query: 'cards that benefit from milling' },
    { label: 'Graveyard recursion', query: 'cards that return cards from graveyard' },
  ],
  tribal: [
    { label: 'Lords', query: 'creatures that buff their tribe' },
    { label: 'Changelings', query: 'changeling creatures all types' },
    { label: 'Tribal support', query: 'cards that support any creature type' },
    { label: 'Cost reducers', query: 'creatures that reduce tribal spell costs' },
  ],
  budget: [
    { label: 'Under $1', query: 'powerful cards under $1' },
    { label: 'Budget staples', query: 'budget commander staples', guidePath: '/guides/budget-commander-staples' },
    { label: 'Budget wipes', query: 'budget board wipes', guidePath: '/guides/budget-board-wipes' },
    { label: 'Budget draw', query: 'cheap card draw spells' },
  ],
  protection: [
    { label: 'Hexproof', query: 'creatures with hexproof' },
    { label: 'Indestructible', query: 'cards that give indestructible' },
    { label: 'Ward', query: 'creatures with ward' },
    { label: 'Counterspells', query: 'best budget counterspells' },
  ],
};

/**
 * Given a natural-language search query, return 3-5 related suggestions.
 */
export function getSimilarSearches(query: string): SuggestionEntry[] {
  if (!query) return [];
  const lower = query.toLowerCase();

  const matched = new Map<string, SuggestionEntry>();

  for (const [keyword, suggestions] of Object.entries(KEYWORD_SUGGESTIONS)) {
    if (lower.includes(keyword)) {
      for (const s of suggestions) {
        // Don't suggest what they already searched
        if (s.query.toLowerCase() !== lower && !matched.has(s.label)) {
          matched.set(s.label, s);
        }
      }
    }
  }

  // If we got matches, return up to 5
  if (matched.size > 0) {
    return Array.from(matched.values()).slice(0, 5);
  }

  // Fallback: return popular/general suggestions
  return [
    { label: 'Budget staples', query: 'budget commander staples', guidePath: '/guides/budget-commander-staples' },
    { label: 'Best draw spells', query: 'best card draw spells', guidePath: '/guides/best-card-draw-spells' },
    { label: 'Board wipes', query: 'budget board wipes', guidePath: '/guides/budget-board-wipes' },
    { label: 'Treasure makers', query: 'best treasure token cards', guidePath: '/guides/best-treasure-token-cards' },
  ];
}
