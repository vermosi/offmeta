/**
 * Regression tests for repairs driven by real zero-result search telemetry.
 *
 * Each case maps to a query users typed that returned no cards.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../supabase/functions/semantic-search/client.ts', () => ({
  supabase: { from: () => ({ insert: vi.fn(), select: vi.fn() }) },
  SUPABASE_URL: 'http://localhost',
  SUPABASE_SERVICE_ROLE_KEY: 'test',
  LOVABLE_API_KEY: 'test',
}));

import {
  validateQuery,
  stripBareWordTokens,
} from '../../supabase/functions/semantic-search/validation.ts';
import { buildDeterministicIntent } from '../../supabase/functions/semantic-search/deterministic/index.ts';

describe('stripBareWordTokens', () => {
  it('drops untranslated words when operators are present', () => {
    expect(stripBareWordTokens('c=b id=b lots of black pips')).toBe('c=b id=b');
  });

  it('keeps boolean operators and quoted clauses', () => {
    expect(stripBareWordTokens('(o:"draw" or o:"scry") t:creature')).toBe(
      '(o:"draw" or o:"scry") t:creature',
    );
  });

  it('leaves plain name searches untouched', () => {
    expect(stripBareWordTokens('lightning bolt')).toBe('lightning bolt');
  });
});

describe('validateQuery enters-the-battlefield broadening', () => {
  it('matches modern oracle wording', () => {
    expect(validateQuery('o:"enters the battlefield"').sanitized).toContain(
      'o:"enters"',
    );
  });
});

describe('deterministic repairs', () => {
  it('treats an action object as oracle text, not a card type', () => {
    const { deterministicQuery } = buildDeterministicIntent(
      'goblins that sacrifice artifacts',
    );
    expect(deterministicQuery).toContain('t:goblin');
    expect(deterministicQuery).not.toContain('t:artifact');
  });

  it('does not treat generic descriptor phrases as card names', () => {
    expect(
      buildDeterministicIntent('ritual effects').deterministicQuery,
    ).not.toContain('name:');
    expect(
      buildDeterministicIntent('etb combos').deterministicQuery,
    ).not.toContain('name:');
  });
});
