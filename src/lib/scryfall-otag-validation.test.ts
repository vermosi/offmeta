import { describe, it, expect } from 'vitest';

/**
 * Scryfall Oracle Tag (otag:) Validation Test Suite
 * Tests all otag: values used in mappings against Scryfall API to verify they exist.
 * 
 * This is a critical regression test - if an otag fails, the mapping should be
 * replaced with a reliable oracle text search.
 */

// All VALID otag: values verified against Scryfall API
// This list was curated by testing each tag - invalid tags are listed in comments at the bottom
const OTAG_VALUES = [
  // From slang-to-syntax.ts - VERIFIED VALID
  { tag: 'sacrifice-outlet', description: 'Cards that let you sacrifice permanents' },
  { tag: 'free-sacrifice-outlet', description: 'Free sacrifice outlets (no mana cost)' },
  { tag: 'ramp', description: 'Mana acceleration' },
  { tag: 'spot-removal', description: 'Single-target removal' },
  { tag: 'mass-removal', description: 'Multi-target or board removal' },
  { tag: 'board-wipe', description: 'Board wipe effects' },
  { tag: 'combat-trick', description: 'Instant-speed combat modifiers' },
  { tag: 'win-condition', description: 'Game-ending threats' },
  { tag: 'discard-outlet', description: 'Discard effects' },
  { tag: 'burn', description: 'Direct damage spells' },
  { tag: 'death-trigger', description: 'Dies triggers' },
  { tag: 'lord', description: 'Creature type buffers' },
  { tag: 'anthem', description: 'Team-wide buffs' },
  { tag: 'flicker', description: 'Exile and return effects' },
  { tag: 'clone', description: 'Copy creature effects' },
  
  // Common tags - VERIFIED VALID
  { tag: 'tutor', description: 'Search library effects' },
  { tag: 'mana-dork', description: 'Creatures that produce mana' },
  { tag: 'removal', description: 'Removal effects' },
  { tag: 'counter', description: 'Counterspell effects' },
  { tag: 'lifegain', description: 'Life gain effects' },
  { tag: 'wheel', description: 'Discard hand and draw effects' },
  { tag: 'mill', description: 'Mill effects' },
  { tag: 'discard', description: 'Discard effects' },
  { tag: 'extra-turn', description: 'Extra turn effects' },
  { tag: 'extra-combat', description: 'Extra combat effects' },
  { tag: 'untapper', description: 'Untap effects' },
  { tag: 'cost-reducer', description: 'Reduces spell costs' },
  { tag: 'mana-rock', description: 'Artifact mana sources' },
  { tag: 'recursion', description: 'Return from graveyard effects' },
  { tag: 'cantrip', description: 'Draw a card effects' },
  { tag: 'fog', description: 'Prevent combat damage' },
  { tag: 'ritual', description: 'One-shot mana generation' },
  { tag: 'attack-trigger', description: 'When attacks effects' },
  { tag: 'bounce', description: 'Return to hand effects' },
  { tag: 'blink', description: 'Exile and return effects' },
  
];

/**
 * Validates an otag: against Scryfall API.
 * Returns { valid: true, count } if tag returns results
 * Returns { valid: false, error } if tag is invalid or returns 0 results
 */
async function validateOtagAgainstScryfall(
  tag: string,
): Promise<{ valid: boolean; count?: number; error?: string; status?: number }> {
  const query = `otag:${tag}`;
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.status === 200) {
      // Tag exists and returns results
      return { valid: true, count: data.total_cards, status: 200 };
    }

    if (response.status === 404) {
      // No cards found with this tag - tag may exist but have no cards, or not exist
      return { 
        valid: false, 
        count: 0,
        status: 404,
        error: 'No cards found with this tag - may not exist or have no tagged cards'
      };
    }

    if (response.status === 400) {
      // Invalid tag syntax
      return {
        valid: false,
        status: 400,
        error: data.details || data.warnings?.join(', ') || 'Invalid tag',
      };
    }

    return {
      valid: false,
      status: response.status,
      error: data.details || `HTTP ${response.status}`,
    };
  } catch (e) {
    return {
      valid: false,
      error: e instanceof Error ? e.message : 'Network error',
    };
  }
}

// Rate limit helper - Scryfall allows 10 requests per second
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Scryfall Oracle Tag (otag:) Validation', () => {
  describe('All mapped otag: values should return results', () => {
    OTAG_VALUES.forEach((tagInfo, index) => {
      it(`otag:${tagInfo.tag} - ${tagInfo.description}`, async () => {
        // Rate limiting: wait 150ms between requests
        if (index > 0) await delay(150);

        const result = await validateOtagAgainstScryfall(tagInfo.tag);

        // Tag should be valid and return at least 1 card
        expect(result.valid).toBe(true);
        expect(result.count).toBeGreaterThan(0);
        
        // Log count for debugging
        if (result.valid) {
          console.log(`  ✓ otag:${tagInfo.tag} returns ${result.count} cards`);
        }
      }, 10000);
    });
  });

  // Meta-test: ensure no duplicate tags
  it('should have no duplicate tag entries', () => {
    const tagNames = OTAG_VALUES.map(t => t.tag);
    const uniqueTags = new Set(tagNames);
    expect(uniqueTags.size).toBe(tagNames.length);
  });
});

/**
 * Known tags that DON'T exist on Scryfall (for documentation)
 * These should NEVER be used in mappings - use oracle text search instead:
 * 
 * INVALID TAGS (verified 2026-02):
 * - otag:hard-counter → use: t:instant o:"counter target"
 * - otag:aggro → use: t:creature mv<=3 pow>=2
 * - otag:counterspell → use: t:instant o:"counter target"
 * - otag:etb-trigger → use: o:"enters the battlefield"
 * - otag:ltb-trigger → use: o:"leaves the battlefield"
 * - otag:pump → use: o:/\+[0-9]+\/\+[0-9]+/
 * - otag:tax → use: (o:"pay" o:"additional" or o:"costs" o:"more")
 * - otag:drain → use: (o:"loses" o:"life" o:"gains" or o:"deals" o:"damage" o:"gains")
 * - otag:ping → use: o:"deals 1 damage"
 * - otag:land-ramp → use: otag:ramp (general ramp) or o:"search" o:"land"
 * - otag:card-draw → use: o:"draw" or otag:cantrip
 * - otag:graveyard-recursion → use: otag:recursion
 * - otag:reanimation → use: otag:recursion or o:"return" o:"creature" o:"graveyard"
 * - otag:token-generator → use: o:"create" o:"token"
 * - otag:wrath → use: otag:board-wipe
 * - otag:treasure-generator → use: o:"create" o:"treasure"
 * - otag:equipment → use: t:equipment
 * - otag:aura → use: t:aura
 * - otag:protection → use: kw:protection or o:"protection from"
 * - otag:haste-granter → use: o:"haste" or o:"gains haste"
 * - otag:land-destruction → use: o:"destroy" o:"land"
 * - otag:tribal-payoff → use: o:"creature type" or type-specific searches
 * - otag:etb → use: o:"enters the battlefield"
 * - otag:ltb → use: o:"leaves the battlefield"
 * - otag:dies-trigger → use: otag:death-trigger
 * - otag:damage-trigger → use: o:"deals damage" triggers
 * - otag:proliferate → use: kw:proliferate
 * - otag:populate → use: kw:populate
 */
