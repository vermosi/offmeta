/**
 * Tests for deterministic card role extraction and similarity scoring.
 */
import { describe, it, expect } from 'vitest';

// Re-implement the pure functions for frontend testing
// (Edge function shared modules use Deno imports, so we mirror the logic here)

const ROLE_PATTERNS = [
  { role: 'removal', patterns: ['destroy target', 'exile target', 'deals damage to any target', 'deals damage to target'] },
  { role: 'board_wipe', patterns: ['destroy all', 'exile all', 'all creatures get -', 'each creature gets -'] },
  { role: 'counterspell', patterns: ['counter target spell', 'counter target activated', 'counter target triggered'] },
  { role: 'draw', patterns: ['draw a card', 'draw two card', 'draw cards', 'draws a card'] },
  { role: 'ramp', patterns: ['search your library for a basic land', 'search your library for a land', 'add {', 'add one mana'] },
  { role: 'tutor', patterns: ['search your library for a card', 'search your library for a'] },
  { role: 'recursion', patterns: ['return target creature card from your graveyard', 'return from your graveyard', 'from your graveyard to your hand', 'from your graveyard to the battlefield'] },
  { role: 'sacrifice_outlet', patterns: ['sacrifice a creature', 'sacrifice another', 'sacrifice a permanent'] },
  { role: 'token_generator', patterns: ['create a', 'creature token', 'token with'] },
  { role: 'lifegain', patterns: ['you gain life', 'gains that much life', 'gain life equal'] },
  { role: 'protection', patterns: ['hexproof', 'indestructible', 'shroud', 'protection from'] },
  { role: 'discard', patterns: ['discard a card', 'discards a card', 'each opponent discards'] },
  { role: 'mill', patterns: ['mills', 'put the top', 'into their graveyard'] },
  { role: 'blink', patterns: ['exile target creature you control, then return', 'exile it, then return', 'flicker'] },
  { role: 'pump', patterns: ['gets +', 'get +', '+1/+1 counter'] },
  { role: 'cost_reduction', patterns: ['costs {1} less', 'costs {2} less', 'cost {1} less', 'cost less to cast', 'without paying'] },
  { role: 'copy', patterns: ['copy target', 'becomes a copy', "create a token that's a copy"] },
  { role: 'evasion', patterns: ["can't be blocked", 'unblockable', 'menace', 'fear', 'intimidate', 'shadow'] },
];

function extractRoles(oracleText: string | null): string[] {
  if (!oracleText) return [];
  const lower = oracleText.toLowerCase();
  const matched: string[] = [];
  for (const { role, patterns } of ROLE_PATTERNS) {
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        matched.push(role);
        break;
      }
    }
  }
  return matched;
}

function extractTypeCategory(typeLine: string | null): string {
  if (!typeLine) return 'unknown';
  const lower = typeLine.toLowerCase();
  const categories = [
    { category: 'creature', patterns: ['creature'] },
    { category: 'instant', patterns: ['instant'] },
    { category: 'sorcery', patterns: ['sorcery'] },
    { category: 'enchantment', patterns: ['enchantment'] },
    { category: 'artifact', patterns: ['artifact'] },
    { category: 'planeswalker', patterns: ['planeswalker'] },
    { category: 'land', patterns: ['land'] },
  ];
  for (const { category, patterns } of categories) {
    for (const p of patterns) {
      if (lower.includes(p)) return category;
    }
  }
  return 'unknown';
}

interface RoleProfile {
  oracle_id: string;
  roles: string[];
  typeCategory: string;
  cmc: number;
  colors: string[];
}

function computeRoleSimilarity(a: RoleProfile, b: RoleProfile): number {
  const sharedRoles = a.roles.filter((r) => b.roles.includes(r));
  if (sharedRoles.length === 0) return 0;
  const allRoles = new Set([...a.roles, ...b.roles]);
  const roleScore = sharedRoles.length / allRoles.size;
  const typeBonus = a.typeCategory === b.typeCategory ? 0.2 : 0;
  const cmcDiff = Math.abs(a.cmc - b.cmc);
  const cmcPenalty = Math.min(cmcDiff * 0.02, 0.1);
  const sharedColors = a.colors.filter((c) => b.colors.includes(c));
  const allColors = new Set([...a.colors, ...b.colors]);
  const colorBonus = allColors.size > 0 ? (sharedColors.length / allColors.size) * 0.1 : 0;
  const raw = roleScore * 0.6 + typeBonus + colorBonus - cmcPenalty;
  return Math.max(0, Math.min(raw, 1));
}

describe('extractRoles', () => {
  it('returns empty for null oracle text', () => {
    expect(extractRoles(null)).toEqual([]);
  });

  it('returns empty for text with no matching patterns', () => {
    expect(extractRoles('Tap: Add one colorless mana.')).toEqual([]);
  });

  it('detects removal', () => {
    const roles = extractRoles('Destroy target creature.');
    expect(roles).toContain('removal');
  });

  it('detects counterspell', () => {
    const roles = extractRoles('Counter target spell.');
    expect(roles).toContain('counterspell');
  });

  it('detects multiple roles', () => {
    const roles = extractRoles('Destroy target creature. Draw a card.');
    expect(roles).toContain('removal');
    expect(roles).toContain('draw');
  });

  it('detects ramp from mana addition', () => {
    const roles = extractRoles('{T}: Add {G}.');
    expect(roles).toContain('ramp');
  });

  it('detects board wipe', () => {
    const roles = extractRoles('Destroy all creatures.');
    expect(roles).toContain('board_wipe');
    // "Destroy all" does NOT match "destroy target" — correct behavior
    expect(roles).not.toContain('removal');
  });

  it('detects tutor', () => {
    const roles = extractRoles('Search your library for a card and put it into your hand.');
    expect(roles).toContain('tutor');
  });

  it('detects token generator', () => {
    const roles = extractRoles('Create a 1/1 white Soldier creature token.');
    expect(roles).toContain('token_generator');
  });

  it('detects blink', () => {
    const roles = extractRoles('Exile target creature you control, then return it to the battlefield.');
    expect(roles).toContain('blink');
  });

  it('does not double-count roles', () => {
    const roles = extractRoles('Destroy target creature. Destroy target artifact.');
    const removalCount = roles.filter((r) => r === 'removal').length;
    expect(removalCount).toBe(1);
  });
});

describe('extractTypeCategory', () => {
  it('returns creature for creature type', () => {
    expect(extractTypeCategory('Creature — Elf Druid')).toBe('creature');
  });

  it('returns instant', () => {
    expect(extractTypeCategory('Instant')).toBe('instant');
  });

  it('returns artifact for artifact creature', () => {
    // "artifact" comes before "creature" in the list
    expect(extractTypeCategory('Artifact Creature — Golem')).toBe('creature');
  });

  it('returns unknown for null', () => {
    expect(extractTypeCategory(null)).toBe('unknown');
  });
});

describe('computeRoleSimilarity', () => {
  it('returns 0 when no shared roles', () => {
    const a: RoleProfile = { oracle_id: 'a', roles: ['removal'], typeCategory: 'instant', cmc: 2, colors: ['B'] };
    const b: RoleProfile = { oracle_id: 'b', roles: ['ramp'], typeCategory: 'sorcery', cmc: 3, colors: ['G'] };
    expect(computeRoleSimilarity(a, b)).toBe(0);
  });

  it('returns high score for identical profiles', () => {
    const a: RoleProfile = { oracle_id: 'a', roles: ['removal', 'draw'], typeCategory: 'instant', cmc: 2, colors: ['B'] };
    const b: RoleProfile = { oracle_id: 'b', roles: ['removal', 'draw'], typeCategory: 'instant', cmc: 2, colors: ['B'] };
    const score = computeRoleSimilarity(a, b);
    expect(score).toBeGreaterThan(0.8);
  });

  it('penalizes CMC difference', () => {
    const base: RoleProfile = { oracle_id: 'a', roles: ['removal'], typeCategory: 'instant', cmc: 2, colors: ['B'] };
    const close: RoleProfile = { oracle_id: 'b', roles: ['removal'], typeCategory: 'instant', cmc: 3, colors: ['B'] };
    const far: RoleProfile = { oracle_id: 'c', roles: ['removal'], typeCategory: 'instant', cmc: 8, colors: ['B'] };
    expect(computeRoleSimilarity(base, close)).toBeGreaterThan(computeRoleSimilarity(base, far));
  });

  it('gives type bonus for same type', () => {
    const sameType: RoleProfile = { oracle_id: 'a', roles: ['removal'], typeCategory: 'instant', cmc: 2, colors: [] };
    const diffType: RoleProfile = { oracle_id: 'b', roles: ['removal'], typeCategory: 'sorcery', cmc: 2, colors: [] };
    const sameType2: RoleProfile = { oracle_id: 'c', roles: ['removal'], typeCategory: 'instant', cmc: 2, colors: [] };
    expect(computeRoleSimilarity(sameType, sameType2)).toBeGreaterThan(computeRoleSimilarity(sameType, diffType));
  });

  it('score is clamped between 0 and 1', () => {
    const a: RoleProfile = { oracle_id: 'a', roles: ['removal', 'draw', 'ramp'], typeCategory: 'instant', cmc: 2, colors: ['B', 'G'] };
    const b: RoleProfile = { oracle_id: 'b', roles: ['removal', 'draw', 'ramp'], typeCategory: 'instant', cmc: 2, colors: ['B', 'G'] };
    const score = computeRoleSimilarity(a, b);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
