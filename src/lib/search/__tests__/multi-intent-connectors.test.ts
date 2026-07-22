/**
 * Regression tests for multi-intent hate composition with EXTRA connector
 * phrases beyond the canonical `and` / `plus` / `also` / `as well`.
 *
 * The concern: connector tokens like "along with", "together with",
 * "combined with", "on top of", "besides" — if not recognized as glue —
 * can leak into the residual query and end up inside an `o:"..."` oracle
 * clause, poisoning the Scryfall search with garbage keywords.
 */

import { describe, it, expect } from 'vitest';
import { buildClientFallbackQuery } from '../fallback';

const EXTRA_CONNECTORS = [
  'along with',
  'together with',
  'combined with',
  'on top of',
  'besides',
  'as well as',
  'in addition to',
  'coupled with',
  'alongside',
  '&',
  ',',
  ';',
  '/',
];

/**
 * Extract every oracle-text literal (`o:"..."`) from a compiled query.
 * We only care about literals, not tag operators like `otag:...`.
 */
function oracleLiterals(q: string): string[] {
  return [...q.matchAll(/o:"([^"]*)"/g)].map((m) => m[1]);
}

/**
 * Words that should never appear as their OWN token inside an oracle
 * literal — they're English glue, not MTG rules text.
 */
const FORBIDDEN_ORACLE_TOKENS = [
  'along',
  'together',
  'combined',
  'besides',
  'coupled',
  'alongside',
  'addition',
  'plus',
  'also',
];

function assertNoConnectorLeak(input: string, q: string) {
  const literals = oracleLiterals(q);
  for (const lit of literals) {
    // Reject any oracle literal that is JUST an English connector.
    expect(
      FORBIDDEN_ORACLE_TOKENS.includes(lit.trim().toLowerCase()),
      `connector "${lit}" leaked into o:"..." for input ${JSON.stringify(input)} → ${q}`,
    ).toBe(false);

    // Reject oracle literals that start or end with a bare connector token
    // (e.g. `o:"along with tokens"`).
    const words = lit.trim().toLowerCase().split(/\s+/);
    const first = words[0];
    const last = words[words.length - 1];
    for (const bad of FORBIDDEN_ORACLE_TOKENS) {
      expect(
        first === bad,
        `oracle literal starts with connector "${bad}": ${q}`,
      ).toBe(false);
      expect(
        last === bad,
        `oracle literal ends with connector "${bad}": ${q}`,
      ).toBe(false);
    }
  }
}

describe('multi-intent hate — extra connectors do not leak into oracle clauses', () => {
  for (const connector of EXTRA_CONNECTORS) {
    it(`joins two hate intents with "${connector}" cleanly`, () => {
      const input = `punish treasure decks ${connector} stop tokens`;
      const q = buildClientFallbackQuery(input);

      // Both intents should still compile.
      expect(q).toContain('artifact');
      expect(q).toMatch(/token/i);

      // No connector garbage in oracle literals.
      assertNoConnectorLeak(input, q);
    });

    it(`joins three hate intents with "${connector}" cleanly`, () => {
      const input = `hate graveyard decks ${connector} stop tokens ${connector} punish lifegain`;
      const q = buildClientFallbackQuery(input);

      assertNoConnectorLeak(input, q);
      // Length budget still respected.
      expect(q.length).toBeLessThanOrEqual(700);
    });
  }

  it('mixed connectors in one query still stay clean', () => {
    const input =
      'punish treasure decks along with stop tokens; hate graveyard, besides shut down storm';
    const q = buildClientFallbackQuery(input);
    assertNoConnectorLeak(input, q);
    expect(q.length).toBeLessThanOrEqual(700);
  });

  it('connector-only residue never becomes a standalone oracle clause', () => {
    // "along with" appears BETWEEN intents; after the hate patterns consume
    // the intent phrases, only glue should remain in residual — and glue
    // must not produce o:"along" / o:"with".
    const input = 'punish tokens along with hate lifegain';
    const q = buildClientFallbackQuery(input);

    expect(q).not.toMatch(/o:"along"/);
    expect(q).not.toMatch(/o:"with"/);
    expect(q).not.toMatch(/o:"along with"/);
  });
});
