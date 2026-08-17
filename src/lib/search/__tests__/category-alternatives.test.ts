import { describe, expect, it, vi } from 'vitest';

import {
  detectAlternativesIntent,
  resolveAlternativesQuery,
  resolveCategoryQuery,
} from '../alternatives';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

const getCardByName = vi.fn();
vi.mock('@/lib/scryfall/client', () => ({
  getCardByName: (...args: unknown[]) => getCardByName(...args),
}));

describe('category-based alternatives phrases', () => {
  it('detects "budget fetch land alternatives" as a category intent', () => {
    const intent = detectAlternativesIntent('budget fetch land alternatives');
    expect(intent).toMatchObject({
      category: 'fetch land',
      budget: true,
      kind: 'trailing_alternatives',
    });
  });

  it('detects "alternatives to board wipes" as a category intent', () => {
    const intent = detectAlternativesIntent('alternatives to board wipes');
    expect(intent?.category).toBe('board wipe');
    expect(intent?.budget).toBe(false);
  });

  it('applies a price ceiling only for budget phrasing', () => {
    expect(resolveCategoryQuery('fetch land', true)).toContain('usd<=5');
    expect(resolveCategoryQuery('fetch land', false)).not.toContain('usd<=5');
    expect(resolveCategoryQuery('fetch land', false)).toContain('game:paper');
  });

  it('preserves an explicit format as a hard Scryfall filter', async () => {
    const resolved = await resolveAlternativesQuery(
      'budget fetch land alternatives in commander',
    );

    expect(resolved?.format).toBe('commander');
    expect(resolved?.scryfallQuery).toContain('f:commander');
  });

  it('returns null for phrases that are not categories', () => {
    expect(resolveCategoryQuery('rhystic study', false)).toBeNull();
  });

  it('resolves without any card lookup or similarity call', async () => {
    const resolved = await resolveAlternativesQuery(
      'budget fetch land alternatives',
    );
    expect(getCardByName).not.toHaveBeenCalled();
    expect(resolved?.category).toBe('fetch land');
    expect(resolved?.scryfallQuery).toContain('t:land');
    expect(resolved?.scryfallQuery).toContain('usd<=5');
  });

  it('leaves real card references on the similarity path', () => {
    expect(
      detectAlternativesIntent('budget alternatives to rhystic study'),
    ).toEqual({
      cardName: 'rhystic study',
      budget: true,
      kind: 'alternatives_to',
    });
  });
});
