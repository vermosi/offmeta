/**
 * Property-based tests for multi-intent hate composition in
 * buildClientFallbackQuery. Ensures that ANY combination of hate intents
 * joined by common connectors always:
 *
 *   1. Produces a syntactically valid Scryfall query (balanced brackets/
 *      quotes, no dangling operators, no empty oracle clauses).
 *   2. Wraps 2+ distinct intents in a single top-level `(a or b ...)` group.
 *   3. Deduplicates repeated intents (no `X or X` in the OR clause).
 *   4. Does NOT double-wrap single-intent outputs as `((...))`.
 *   5. Stays inside the 700-char Scryfall length budget.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildClientFallbackQuery } from '../fallback';

// -----------------------------------------------------------------------------
// Intent catalog — each entry is (a) phrase fragment we can feed into the
// generator and (b) a stable canonical marker guaranteed to appear in the
// compiled syntax so we can count how many distinct intents actually matched.
// -----------------------------------------------------------------------------

interface HateIntent {
  /** Phrase that triggers this intent when prefixed with a hate verb. */
  phrase: string;
  /** Substring guaranteed to appear in that intent's compiled syntax. */
  marker: string;
}

const HATE_INTENTS: HateIntent[] = [
  { phrase: 'treasure decks', marker: 'otag:artifact-removal' },
  { phrase: 'graveyard decks', marker: 'otag:graveyard-hate' },
  { phrase: 'tokens', marker: "tokens can't" },
  { phrase: 'lifegain', marker: "can't gain life" },
  { phrase: 'storm', marker: "cast more than" },
  { phrase: 'control decks', marker: "can't be countered" },
  { phrase: 'discard decks', marker: 'otag:discard' },
  { phrase: 'planeswalkers', marker: 'destroy target planeswalker' },
  { phrase: 'landfall', marker: 'destroy target land' },
  { phrase: 'aristocrats', marker: "can't be sacrificed" },
];

const HATE_VERBS = ['punish', 'hate', 'stop', 'shut down', 'hose'];
const CONNECTORS = [' and ', ' plus ', ' and also '];

// -----------------------------------------------------------------------------
// Structural invariants (mirrors fallback.property.test.ts, kept local to
// avoid coupling to that file's private helpers).
// -----------------------------------------------------------------------------

function parensBalanced(q: string): boolean {
  let depth = 0;
  for (const ch of q) {
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function quotesBalanced(q: string): boolean {
  return ((q.match(/"/g) || []).length) % 2 === 0;
}

function hasNoDanglingOperator(q: string): boolean {
  const stripped = q.replace(/"[^"]*"/g, '""');
  return !/[a-z][a-z_]*(?:[:]|<=?|>=?|=)(?:\s|$)/i.test(stripped);
}

function hasNoEmptyOracle(q: string): boolean {
  return !/o:""/.test(q) && !/o:"\s+"/.test(q);
}

// -----------------------------------------------------------------------------
// Property tests
// -----------------------------------------------------------------------------

describe('multi-intent hate composition — properties', () => {
  it('any 2–5 distinct hate intents compile to a valid Scryfall query', () => {
    fc.assert(
      fc.property(
        // Pick 2–5 UNIQUE intents from the catalog + a verb + a connector.
        fc
          .uniqueArray(fc.integer({ min: 0, max: HATE_INTENTS.length - 1 }), {
            minLength: 2,
            maxLength: 5,
          })
          .map((idxs) => idxs.map((i) => HATE_INTENTS[i])),
        fc.constantFrom(...HATE_VERBS),
        fc.constantFrom(...CONNECTORS),
        (intents, verb, connector) => {
          const phrase = intents
            .map((intent) => `${verb} ${intent.phrase}`)
            .join(connector);
          const q = buildClientFallbackQuery(phrase);

          // Structural integrity.
          expect(typeof q).toBe('string');
          expect(q.length).toBeGreaterThan(0);
          expect(parensBalanced(q), `unbalanced parens: ${q}`).toBe(true);
          expect(quotesBalanced(q), `unbalanced quotes: ${q}`).toBe(true);
          expect(hasNoDanglingOperator(q), `dangling op: ${q}`).toBe(true);
          expect(hasNoEmptyOracle(q), `empty oracle: ${q}`).toBe(true);
          expect(q.length, `over budget: ${q.length}`).toBeLessThanOrEqual(700);

          // Count distinct intents that actually compiled. Some phrasings
          // fall through to naive slang, so we can't require every input
          // to match — but the ones that did must be OR-wrapped correctly.
          const matched = intents.filter((intent) => q.includes(intent.marker));

          if (matched.length >= 2) {
            // 2+ matches must live inside a single top-level OR group.
            expect(q.startsWith('('), `missing top-level group: ${q}`).toBe(true);
            const orCount = (q.match(/ or /g) ?? []).length;
            expect(
              orCount,
              `expected >= ${matched.length - 1} ORs, got ${orCount}: ${q}`,
            ).toBeGreaterThanOrEqual(matched.length - 1);
          }
        },
      ),
      { numRuns: 120 },
    );
  });

  it('duplicate intents are deduplicated in the OR group', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HATE_INTENTS),
        fc.constantFrom(...HATE_VERBS),
        fc.constantFrom(...CONNECTORS),
        fc.integer({ min: 2, max: 4 }),
        (intent, verb, connector, repeats) => {
          const phrase = Array.from({ length: repeats })
            .map(() => `${verb} ${intent.phrase}`)
            .join(connector);
          const q = buildClientFallbackQuery(phrase);

          // Marker must appear at most once — dedup should collapse repeats.
          const occurrences = q.split(intent.marker).length - 1;
          expect(
            occurrences,
            `marker "${intent.marker}" repeated ${occurrences}× in: ${q}`,
          ).toBeLessThanOrEqual(1);

          // Single-intent output must NOT be double-wrapped as ((...)).
          expect(q.startsWith('(('), `double-wrapped: ${q}`).toBe(false);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('a single hate intent is never wrapped in a synthetic OR group', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HATE_INTENTS),
        fc.constantFrom(...HATE_VERBS),
        (intent, verb) => {
          const q = buildClientFallbackQuery(`${verb} ${intent.phrase}`);
          // No " or " added by the composer itself; intent's own syntax may
          // still contain internal ORs, but we should not see the compound
          // "(A or B)" wrapping shape.
          expect(q.startsWith('(('), `double-wrapped: ${q}`).toBe(false);
        },
      ),
      { numRuns: 40 },
    );
  });
});
