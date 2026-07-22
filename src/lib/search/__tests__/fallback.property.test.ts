/**
 * Property-based tests for buildClientFallbackQuery.
 *
 * Goal: for ANY plausible natural-language input the fallback translator
 * must never crash and must produce syntactically valid Scryfall output
 * (balanced brackets/quotes, no dangling operators, no empty oracle
 * clauses, no injectable payloads leaking through, bounded length).
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildClientFallbackQuery } from '../fallback';

// -----------------------------------------------------------------------------
// Invariants
// -----------------------------------------------------------------------------

/** Parentheses are balanced across the entire output. */
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

/** Double-quotes appear in matched pairs. */
function quotesBalanced(q: string): boolean {
  const count = (q.match(/"/g) || []).length;
  return count % 2 === 0;
}

/**
 * No dangling operator token like `c:`, `t:`, `o:`, `mv<`, `usd<=`
 * followed by whitespace or end-of-string with no value.
 */
function hasNoDanglingOperator(q: string): boolean {
  // Match `word:` or `word<`/`<=`/`>`/`>=`/`=` NOT followed by a valid value.
  // Valid value = letter, digit, `"`, `(`, `!`, `-`, `+`, `{`, `$`.
  return !/[a-z][a-z_]*(?:[:]|<=?|>=?|=)(?:\s|$)/i.test(q);
}

/** Never emits an empty quoted oracle clause like `o:""`. */
function hasNoEmptyOracle(q: string): boolean {
  return !/o:""/.test(q) && !/o:"\s+"/.test(q);
}

/** Length must remain within the project's 700-char Scryfall ceiling. */
function withinLengthBudget(q: string): boolean {
  return q.length <= 700;
}

/** No control chars, newlines, or tabs leak through. */
function noControlChars(q: string): boolean {
  // eslint-disable-next-line no-control-regex
  return !/[\u0000-\u001f]/.test(q);
}

/** No consecutive whitespace runs (fallback is expected to normalize). */
function noDoubleSpaces(q: string): boolean {
  return !/\s{2,}/.test(q);
}

/** Result must be trimmed. */
function isTrimmed(q: string): boolean {
  return q === q.trim();
}

/** Aggregate check reused across generators. */
function assertValid(input: string, q: string) {
  expect(typeof q, `input: ${JSON.stringify(input)}`).toBe('string');
  expect(parensBalanced(q), `unbalanced parens for ${JSON.stringify(input)} → ${q}`).toBe(true);
  expect(quotesBalanced(q), `unbalanced quotes for ${JSON.stringify(input)} → ${q}`).toBe(true);
  expect(hasNoDanglingOperator(q), `dangling operator in ${JSON.stringify(input)} → ${q}`).toBe(true);
  expect(hasNoEmptyOracle(q), `empty oracle clause in ${JSON.stringify(input)} → ${q}`).toBe(true);
  expect(withinLengthBudget(q), `over length budget for ${JSON.stringify(input)} → ${q.length}`).toBe(true);
  expect(noControlChars(q), `control chars in output for ${JSON.stringify(input)}`).toBe(true);
  expect(isTrimmed(q), `output not trimmed for ${JSON.stringify(input)}`).toBe(true);
  expect(noDoubleSpaces(q), `double spaces in ${JSON.stringify(input)} → ${q}`).toBe(true);
}

// -----------------------------------------------------------------------------
// Generators
// -----------------------------------------------------------------------------

const HATE_VERBS = ['punish', 'hate', 'stop', 'shut down', 'hose', 'counter'];
const ARCHETYPE_NOUNS = [
  'treasure', 'artifact', 'affinity',
  'graveyard', 'reanimator', 'dredge', 'mill',
  'storm', 'combo', 'spellslinger', 'spells',
  'token', 'tokens',
  'lifegain', 'life gain', 'life',
  'ramp', 'lands', 'mana',
  'tutor', 'tutors',
  'draw', 'card draw', 'wheel',
  'aggro', 'go wide', 'weenie', 'swarm',
  'enchantment', 'enchantments',
  'control', 'counterspell', 'permission',
  'planeswalker', 'superfriends',
  'discard', 'hand',
  'flying', 'flyers', 'dragons', 'angels',
  'humans', 'elves', 'goblins', 'zombies', 'vampires', 'merfolk',
  'eldrazi', 'big mana', 'tron',
  'infect', 'poison',
  'voltron', 'equipment', 'auras',
  'aristocrats', 'sacrifice',
  'blink', 'flicker', 'etb',
  'landfall',
  'extra turns', 'group hug',
  'stax', 'prison', 'mld',
  'enchantress', 'bogles',
  '+1/+1', 'counters',
  'madness', 'cycling',
];

const COLOR_WORDS = ['red', 'blue', 'green', 'white', 'black', 'colorless', 'mono red', 'mono blue', 'azorius', 'gruul', 'jund'];
const TYPE_WORDS = ['creature', 'artifact', 'enchantment', 'instant', 'sorcery', 'land', 'planeswalker', 'equipment'];
const COST_WORDS = ['cheap', 'budget', 'expensive', 'under $10', 'under 3 mana', 'less than 5 mana', '2 or less'];
const FORMAT_WORDS = ['commander', 'modern', 'legacy', 'pioneer', 'standard'];
const FILLER = ['that', 'with', 'the', 'my', 'your', 'for', 'in', 'of', 'a', 'an'];
const CONNECTORS = ['and', 'or', 'that', 'with', ''];

/** Well-formed “cards that <verb> <archetype> decks” phrases. */
const hatePhraseArb = fc
  .tuple(
    fc.constantFrom(...HATE_VERBS),
    fc.constantFrom(...ARCHETYPE_NOUNS),
    fc.constantFrom('decks', 'players', 'strategies', ''),
  )
  .map(([v, n, suffix]) => `cards that ${v} ${n}${suffix ? ` ${suffix}` : ''}`.trim());

/** Composed natural phrases combining colors + types + costs + formats. */
const composedPhraseArb = fc
  .tuple(
    fc.option(fc.constantFrom(...COST_WORDS), { nil: '' }),
    fc.option(fc.constantFrom(...COLOR_WORDS), { nil: '' }),
    fc.constantFrom(...TYPE_WORDS),
    fc.option(fc.constantFrom(...CONNECTORS), { nil: '' }),
    fc.option(fc.constantFrom(...FORMAT_WORDS), { nil: '' }),
    fc.option(fc.constantFrom(...FILLER), { nil: '' }),
  )
  .map((tokens) =>
    tokens
      .filter((t): t is string => Boolean(t))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
  .filter((s) => s.length > 0);

/** Adversarial fuzz: printable characters that might break the parser. */
const adversarialArb = fc.string({
  minLength: 0,
  maxLength: 120,
  // Keep to printable ASCII so failures are diagnosable (fallback must still
  // survive random emoji/unicode — covered separately below).
  unit: fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz0123456789 !@#$%^&*()_+-=[]{};\':",./<>?\\|`~'.split(''),
  ),
});

/** Unicode + whitespace fuzz (emojis, RTL marks, tabs, newlines). */
const unicodeArb = fc.string({ minLength: 0, maxLength: 80 });

// -----------------------------------------------------------------------------
// Properties
// -----------------------------------------------------------------------------

describe('buildClientFallbackQuery — property-based invariants', () => {
  it('never throws on hate phrases and produces valid Scryfall syntax', () => {
    fc.assert(
      fc.property(hatePhraseArb, (input) => {
        const q = buildClientFallbackQuery(input);
        assertValid(input, q);
      }),
      { numRuns: 300 },
    );
  });

  it('never throws on composed color/type/cost/format phrases', () => {
    fc.assert(
      fc.property(composedPhraseArb, (input) => {
        const q = buildClientFallbackQuery(input);
        assertValid(input, q);
      }),
      { numRuns: 300 },
    );
  });

  it('handles adversarial ASCII punctuation without crashing', () => {
    fc.assert(
      fc.property(adversarialArb, (input) => {
        const q = buildClientFallbackQuery(input);
        assertValid(input, q);
      }),
      { numRuns: 400 },
    );
  });

  it('handles arbitrary unicode strings without crashing', () => {
    fc.assert(
      fc.property(unicodeArb, (input) => {
        const q = buildClientFallbackQuery(input);
        assertValid(input, q);
      }),
      { numRuns: 300 },
    );
  });

  it('idempotency: whitespace-only or leading/trailing spaces produce identical output to the trimmed version', () => {
    fc.assert(
      fc.property(
        hatePhraseArb,
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        (input, lead, trail) => {
          const padded = `${' '.repeat(lead)}${input}${' '.repeat(trail)}`;
          expect(buildClientFallbackQuery(padded)).toBe(
            buildClientFallbackQuery(input),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('case-insensitivity: uppercase / mixed-case yields same query as lowercase for hate phrases', () => {
    fc.assert(
      fc.property(hatePhraseArb, (input) => {
        const lower = buildClientFallbackQuery(input.toLowerCase());
        const upper = buildClientFallbackQuery(input.toUpperCase());
        // Both must be valid; and if lowercase produced a compound query,
        // uppercase must produce the same clauses (order-preserving).
        assertValid(input.toUpperCase(), upper);
        expect(upper).toBe(lower);
      }),
      { numRuns: 200 },
    );
  });

  it('empty / whitespace input always returns empty string', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\s*$/), (input) => {
        expect(buildClientFallbackQuery(input)).toBe('');
      }),
      { numRuns: 50 },
    );
  });

  it('hate phrases always yield a compound clause (contains " or " or "!\\"" name-fallback)', () => {
    fc.assert(
      fc.property(hatePhraseArb, (input) => {
        const q = buildClientFallbackQuery(input);
        // Either the strategy-hate layer fired (compound OR clause) or the
        // input was treated as a card name (starts with `!"`).
        const isCompound = /\bor\b/.test(q);
        const isNameFallback = q.startsWith('!"');
        expect(isCompound || isNameFallback, `neither compound nor name-fallback: ${q}`).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('never emits a bare "or" / "and" / "not" as a full clause', () => {
    fc.assert(
      fc.property(
        fc.oneof(hatePhraseArb, composedPhraseArb, adversarialArb),
        (input) => {
          const q = buildClientFallbackQuery(input);
          // Recursively strip all quoted regions and parenthesized groups
          // (Boolean connectives are only allowed inside those regions).
          let stripped = q.replace(/"[^"]*"/g, ' ');
          let prev: string;
          do {
            prev = stripped;
            stripped = stripped.replace(/\([^()]*\)/g, ' ');
          } while (stripped !== prev);
          const tokens = stripped.split(/\s+/).filter(Boolean);
          for (const t of tokens) {
            expect(['or', 'and', 'not'], `bare boolean token in ${q}`).not.toContain(t.toLowerCase());
          }
        },
      ),
      { numRuns: 300 },
    );
  });

});
