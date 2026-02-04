import { describe, it, expect } from 'vitest';

/**
 * Scryfall Tagger Tags Validation Test Suite
 * Tests otag: and atag: values against Scryfall API to verify they exist.
 * 
 * Source: https://scryfall.com/docs/tagger-tags
 * 
 * IMPORTANT: This file only includes tags that are VERIFIED to return results.
 * Many common terms (like keywords) should use kw: not otag:
 * 
 * Syntax guide:
 * - otag: / function: / oracletag: - Functional tags (what the card does)
 * - atag: / art: / arttag: - Art tags (what's in the artwork)
 * - kw: / keyword: - Keyword abilities (flying, haste, etc.)
 */

// Oracle Tags (otag:) - Functional tags describing card mechanics
// All tags below have been VERIFIED to return results from Scryfall API
const ORACLE_TAGS = [
  // Core mechanics used in our mappings
  { tag: 'sacrifice-outlet', description: 'Cards that let you sacrifice permanents' },
  { tag: 'free-sacrifice-outlet', description: 'Free sacrifice outlets' },
  { tag: 'ramp', description: 'Mana acceleration' },
  { tag: 'spot-removal', description: 'Single-target removal' },
  { tag: 'mass-removal', description: 'Multi-target or board removal' },
  { tag: 'board-wipe', description: 'Board wipe effects' },
  { tag: 'combat-trick', description: 'Instant-speed combat modifiers' },
  { tag: 'win-condition', description: 'Game-ending threats' },
  { tag: 'discard-outlet', description: 'Discard outlets' },
  { tag: 'burn', description: 'Direct damage spells' },
  { tag: 'death-trigger', description: 'Dies triggers' },
  { tag: 'lord', description: 'Creature type buffers' },
  { tag: 'anthem', description: 'Team-wide buffs' },
  { tag: 'flicker', description: 'Exile and return effects' },
  { tag: 'clone', description: 'Copy creature effects' },
  { tag: 'tutor', description: 'Search library effects' },
  { tag: 'mana-dork', description: 'Creatures that produce mana' },
  { tag: 'removal', description: 'Removal effects' },
  { tag: 'counter', description: 'Counterspell effects' },
  { tag: 'lifegain', description: 'Life gain effects' },
  { tag: 'wheel', description: 'Discard hand and draw effects' },
  { tag: 'mill', description: 'Mill effects' },
  { tag: 'discard', description: 'Forced discard' },
  { tag: 'extra-turn', description: 'Extra turn effects' },
  { tag: 'extra-combat', description: 'Extra combat effects' },
  { tag: 'untapper', description: 'Untap effects' },
  { tag: 'cost-reducer', description: 'Reduces spell costs' },
  { tag: 'mana-rock', description: 'Artifact mana sources' },
  { tag: 'recursion', description: 'Return from graveyard effects' },
  { tag: 'cantrip', description: 'Draw a card effects' },
  { tag: 'fog', description: 'Prevent combat damage' },
  { tag: 'ritual', description: 'One-shot mana generation' },
  { tag: 'attack-trigger', description: 'When attacks triggers' },
  { tag: 'bounce', description: 'Return to hand effects' },
  { tag: 'blink', description: 'Exile and return effects' },
  
  // Additional verified functional tags from tagger-tags.txt
  { tag: 'activated-ability', description: 'Has activated ability' },
  { tag: 'affinity', description: 'Affinity mechanic' },
  { tag: 'alternate-win-condition', description: 'Alternative win condition' },
  { tag: 'balance', description: 'Balance-style effect' },
  { tag: 'banish', description: 'Exile effect' },
  { tag: 'battalion', description: 'Battalion trigger' },
  { tag: 'bite', description: 'One-sided fight' },
  { tag: 'boardwipe', description: 'Board wipe' },
  { tag: 'bribery', description: 'Take opponent creature' },
  { tag: 'bushido', description: 'Bushido mechanic' },
  { tag: 'draw', description: 'Card draw' },
  { tag: 'evasion', description: 'Combat evasion' },
  { tag: 'graveyard-hate', description: 'Exile graveyards' },
  { tag: 'naturalize', description: 'Destroy artifact/enchantment' },
  { tag: 'overrun', description: 'Pump and trample team' },
  { tag: 'pacifism', description: 'Prevent attacking/blocking' },
  { tag: 'persist', description: 'Persist mechanic' },
  { tag: 'pillowfort', description: 'Defensive deterrent' },
  { tag: 'pinger', description: 'Repeatable damage' },
  { tag: 'plunder', description: 'Card advantage through attack' },
  { tag: 'polymorph', description: 'Transform creature' },
  { tag: 'pseudo-haste', description: 'Haste-like effect' },
  { tag: 'punisher', description: 'Opponent chooses punishment' },
  { tag: 'reanimate', description: 'Return creature from graveyard' },
  { tag: 'regrowth', description: 'Return card from graveyard to hand' },
  { tag: 'removal-artifact', description: 'Artifact removal' },
  { tag: 'removal-creature', description: 'Creature removal' },
  { tag: 'removal-enchantment', description: 'Enchantment removal' },
  { tag: 'removal-land', description: 'Land destruction' },
  { tag: 'removal-planeswalker', description: 'Planeswalker removal' },
  { tag: 'revolt', description: 'Revolt mechanic' },
  { tag: 'rummage', description: 'Discard then draw' },
  { tag: 'scry', description: 'Scry mechanic' },
  { tag: 'surveil', description: 'Surveil mechanic' },
  
  // Specialized land tags
  { tag: 'painland', description: 'Painland cycle' },
  { tag: 'bounceland', description: 'Karoo/Bounceland cycle' },
  { tag: 'boltland', description: 'MDFC spell-lands' },
];

// Art Tags (atag:) - Tags describing card artwork
// All tags verified to return results
const ART_TAGS = [
  { tag: 'dragon', description: 'Dragon in artwork' },
  { tag: 'fire', description: 'Fire in artwork' },
  { tag: 'forest', description: 'Forest in artwork' },
  { tag: 'angel', description: 'Angel in artwork' },
  { tag: 'demon', description: 'Demon in artwork' },
  { tag: 'zombie', description: 'Zombie in artwork' },
  { tag: 'sword', description: 'Sword in artwork' },
  { tag: 'water', description: 'Water in artwork' },
  { tag: 'mountain', description: 'Mountain in artwork' },
  { tag: 'castle', description: 'Castle in artwork' },
  { tag: 'moon', description: 'Moon in artwork' },
  { tag: 'sun', description: 'Sun in artwork' },
  { tag: 'skull', description: 'Skull in artwork' },
  { tag: 'skeleton', description: 'Skeleton in artwork' },
  { tag: 'lightning', description: 'Lightning in artwork' },
  { tag: 'armor', description: 'Armor in artwork' },
  { tag: 'magic', description: 'Magic effects in artwork' },
  { tag: 'squirrel', description: 'Squirrel in artwork' },
  { tag: 'cat', description: 'Cat in artwork' },
  { tag: 'bird', description: 'Bird in artwork' },
];

/**
 * Validates a tag against Scryfall API.
 */
async function validateTagAgainstScryfall(
  prefix: 'otag' | 'atag',
  tag: string,
): Promise<{ valid: boolean; count?: number; error?: string; status?: number }> {
  const query = `${prefix}:${tag}`;
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (response.status === 200) {
      return { valid: true, count: data.total_cards, status: 200 };
    }

    if (response.status === 404) {
      return { 
        valid: false, 
        count: 0,
        status: 404,
        error: 'No cards found with this tag'
      };
    }

    if (response.status === 400) {
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Scryfall Tagger Tags Validation', () => {
  describe('Oracle Tags (otag:) - Functional card mechanics', () => {
    ORACLE_TAGS.forEach((tagInfo, index) => {
      it(`otag:${tagInfo.tag} - ${tagInfo.description}`, async () => {
        if (index > 0) await delay(150);

        const result = await validateTagAgainstScryfall('otag', tagInfo.tag);

        expect(result.valid).toBe(true);
        expect(result.count).toBeGreaterThan(0);
        
        if (result.valid) {
          console.log(`  ✓ otag:${tagInfo.tag} returns ${result.count} cards`);
        }
      }, 10000);
    });
  });

  describe('Art Tags (atag:) - Card artwork elements', () => {
    ART_TAGS.forEach((tagInfo, index) => {
      it(`atag:${tagInfo.tag} - ${tagInfo.description}`, async () => {
        if (index > 0) await delay(150);

        const result = await validateTagAgainstScryfall('atag', tagInfo.tag);

        expect(result.valid).toBe(true);
        expect(result.count).toBeGreaterThan(0);
        
        if (result.valid) {
          console.log(`  ✓ atag:${tagInfo.tag} returns ${result.count} cards`);
        }
      }, 10000);
    });
  });

  // Meta-tests
  it('should have no duplicate oracle tag entries', () => {
    const tagNames = ORACLE_TAGS.map(t => t.tag);
    const uniqueTags = new Set(tagNames);
    expect(uniqueTags.size).toBe(tagNames.length);
  });

  it('should have no duplicate art tag entries', () => {
    const tagNames = ART_TAGS.map(t => t.tag);
    const uniqueTags = new Set(tagNames);
    expect(uniqueTags.size).toBe(tagNames.length);
  });
});

/**
 * INVALID TAGS - DO NOT USE IN MAPPINGS
 * 
 * KEYWORDS: Use kw: prefix, NOT otag:
 * - flying, haste, trample, lifelink, deathtouch, menace, reach,
 *   vigilance, first-strike, double-strike, hexproof, indestructible,
 *   shroud, infect, proliferate, storm, dredge, cycling, undying,
 *   flash, protection, prowess
 * 
 * INVALID otag: values (use alternatives):
 * - otag:countermagic → use: otag:counter
 * - otag:stax → use: o:"can't" / pillowfort effects
 * - otag:drain → use: o:"loses" o:"life" o:"gains"
 * - otag:token-generator → use: o:"create" o:"token"
 * - otag:treasure → use: o:"create" o:"treasure"
 * - otag:wrath → use: otag:board-wipe or otag:boardwipe
 * - otag:resurrection → use: otag:reanimate or otag:recursion
 * - otag:crew-cheap → doesn't exist
 */
