/**
 * Performance and length-budget tests for multi-intent hate composition.
 *
 * Guarantees that as the number of hate intents grows, buildClientFallbackQuery:
 *   1. Stays within Scryfall's 700-character query ceiling.
 *   2. Compiles in bounded time (no pathological regex backtracking).
 *   3. Scales roughly linearly — per-intent cost stays reasonable.
 */

import { describe, it, expect } from 'vitest';
import { buildClientFallbackQuery } from '../fallback';

const INTENTS = [
  'treasure decks',
  'graveyard decks',
  'tokens',
  'lifegain',
  'storm',
  'control decks',
  'discard decks',
  'planeswalkers',
  'landfall',
  'aristocrats',
];

function compose(count: number, connector = ' and '): string {
  return Array.from({ length: count })
    .map((_, i) => `punish ${INTENTS[i % INTENTS.length]}`)
    .join(connector);
}

function timeMs(fn: () => void): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe('multi-intent hate — length budget', () => {
  for (const n of [2, 3, 5, 8, 10, 15, 20]) {
    it(`stays under 700 chars with ${n} intents`, () => {
      const q = buildClientFallbackQuery(compose(n));
      expect(q.length, `oversized query (${q.length} chars): ${q}`).toBeLessThanOrEqual(700);
    });
  }

  it('long connector variants (as well as / in addition to) stay in budget', () => {
    const q = buildClientFallbackQuery(compose(8, ' as well as '));
    expect(q.length).toBeLessThanOrEqual(700);
  });

  it('mixed connectors across 12 intents stay in budget', () => {
    const conns = [' and ', ' plus ', ' along with ', '; ', ', '];
    const phrase = Array.from({ length: 12 })
      .map((_, i) => `hate ${INTENTS[i % INTENTS.length]}`)
      .reduce((acc, cur, i) => (i === 0 ? cur : acc + conns[i % conns.length] + cur), '');
    const q = buildClientFallbackQuery(phrase);
    expect(q.length).toBeLessThanOrEqual(700);
  });

  it('50 repeated intents dedupe down to at most 10 unique clauses', () => {
    const q = buildClientFallbackQuery(compose(50));
    // Each intent maps to a group like `(...)` — at most 10 distinct groups.
    const orGroups = (q.match(/\(/g) ?? []).length;
    expect(orGroups).toBeLessThanOrEqual(INTENTS.length + 2);
    expect(q.length).toBeLessThanOrEqual(700);
  });
});

describe('multi-intent hate — compile performance', () => {
  it('compiles a 5-intent query in under 50ms', () => {
    const elapsed = timeMs(() => buildClientFallbackQuery(compose(5)));
    expect(elapsed, `too slow: ${elapsed.toFixed(2)}ms`).toBeLessThan(50);
  });

  it('compiles a 10-intent query in under 100ms', () => {
    const elapsed = timeMs(() => buildClientFallbackQuery(compose(10)));
    expect(elapsed, `too slow: ${elapsed.toFixed(2)}ms`).toBeLessThan(100);
  });

  it('compiles a 20-intent query in under 200ms', () => {
    const elapsed = timeMs(() => buildClientFallbackQuery(compose(20)));
    expect(elapsed, `too slow: ${elapsed.toFixed(2)}ms`).toBeLessThan(200);
  });

  it('scales sub-quadratically from 5 to 20 intents', () => {
    // Warm-up so first-run regex compilation doesn't skew ratios.
    buildClientFallbackQuery(compose(5));

    const avg = (n: number, iters = 5) => {
      let total = 0;
      for (let i = 0; i < iters; i++) total += timeMs(() => buildClientFallbackQuery(compose(n)));
      return total / iters;
    };

    const t5 = avg(5);
    const t20 = avg(20);
    // 4x intents shouldn't take >16x time (quadratic). Guard against pathological
    // backtracking / accidental O(n²) growth in the pattern loop.
    const ratio = t20 / Math.max(t5, 0.01);
    expect(
      ratio,
      `super-quadratic growth: t5=${t5.toFixed(2)}ms t20=${t20.toFixed(2)}ms ratio=${ratio.toFixed(2)}`,
    ).toBeLessThan(16);
  });

  it('adversarial input with heavy repetition compiles in under 250ms', () => {
    // 100 hate verbs against the same intent — dedup + regex must stay linear.
    const phrase = Array.from({ length: 100 }).map(() => 'punish tokens').join(' and ');
    const elapsed = timeMs(() => buildClientFallbackQuery(phrase));
    expect(elapsed, `slow adversarial compile: ${elapsed.toFixed(2)}ms`).toBeLessThan(250);
  });
});
