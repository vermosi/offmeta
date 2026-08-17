/**
 * Regression tests pinned to the exact queries that appeared in the
 * zero-result production logs:
 *
 *   - "budget alternatives to rhystic study"  → alternatives intent
 *   - "cards like eternal witness"            → alternatives intent
 *   - "slickshot show off"                    → fuzzy card-name recovery
 *
 * Each of these previously degraded to a terminal exact-name search for the
 * whole sentence (`!"budget alternatives to rhystic study"`), which can never
 * match a card. These tests exercise the real detection/fallback/telemetry
 * modules and mock only the network boundaries (Scryfall + edge function), so
 * a regression in the pipeline fails here rather than in production.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCardByName = vi.fn();
const resolveFuzzyCardName = vi.fn();
const invoke = vi.fn();

vi.mock('@/lib/scryfall/client', () => ({
  getCardByName: (...args: unknown[]) => getCardByName(...args),
  resolveFuzzyCardName: (...args: unknown[]) => resolveFuzzyCardName(...args),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

import {
  detectAlternativesIntent,
  resolveAlternativesQuery,
} from '../alternatives';
import {
  buildClientFallbackQuery,
  extractCardNameCandidate,
} from '../fallback';
import {
  clearRecoveryAttempts,
  getRecoveryAttempt,
} from '../recoveryTelemetry';
import { handleZeroResultRecovery } from '@/hooks/searchRecovery';

/** Minimal Scryfall card shape used by the alternatives resolver. */
function card(name: string, overrides: Record<string, unknown> = {}) {
  return {
    name,
    type_line: 'Enchantment',
    oracle_text: 'Whenever an opponent casts a spell...',
    color_identity: ['U'],
    keywords: [],
    cmc: 3,
    prices: { usd: '35.00' },
    ...overrides,
  };
}

function recoveryContext(originalQuery: string, scryfallQuery: string) {
  return {
    originalQuery,
    currentResult: { scryfallQuery, source: 'deterministic' },
    currentRequestId: 'req-regression',
    scryfallLang: 'en',
    queryClient: { invalidateQueries: vi.fn() } as never,
    setSearchQuery: vi.fn(),
    setLastSearchResult: vi.fn(),
    trackEvent: vi.fn(),
  };
}

describe('zero-result regressions (logged failing queries)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRecoveryAttempts();
    sessionStorage.clear();
  });

  describe('"budget alternatives to rhystic study"', () => {
    const QUERY = 'budget alternatives to rhystic study';

    it('detects a budget alternatives intent for the reference card', () => {
      expect(detectAlternativesIntent(QUERY)).toEqual({
        cardName: 'rhystic study',
        budget: true,
        kind: 'alternatives_to',
      });
    });

    it('never falls through to an exact-name search for the whole sentence', () => {
      expect(buildClientFallbackQuery(QUERY)).not.toContain(`!"${QUERY}"`);
      expect(buildClientFallbackQuery(QUERY)).not.toMatch(/alternatives/i);
    });

    it('resolves to the budget similarity query, excluding the card itself', async () => {
      getCardByName.mockResolvedValue(card('Rhystic Study'));
      invoke.mockResolvedValue({
        data: {
          success: true,
          similarQuery: 'o:"unless that player pays"',
          budgetQuery: 'o:"unless that player pays" usd<5',
        },
        error: null,
      });

      const resolved = await resolveAlternativesQuery(QUERY);

      expect(getCardByName).toHaveBeenCalledWith('rhystic study');
      expect(resolved).not.toBeNull();
      expect(resolved?.cardName).toBe('Rhystic Study');
      expect(resolved?.budget).toBe(true);
      expect(resolved?.kind).toBe('alternatives_to');
      // Budget phrasing must prefer the budget query over the plain one.
      expect(resolved?.scryfallQuery).toContain('usd<5');
      expect(resolved?.scryfallQuery).toContain('-!"Rhystic Study"');
    });

    it('preserves active filters as hard constraints', async () => {
      getCardByName.mockResolvedValue(card('Rhystic Study'));
      invoke.mockResolvedValue({
        data: {
          success: true,
          similarQuery: 'o:"unless that player pays"',
          budgetQuery: 'o:"unless that player pays" usd<5',
        },
        error: null,
      });

      const resolved = await resolveAlternativesQuery(QUERY, {
        format: 'commander',
        colors: ['U', 'R'],
        types: ['enchantment'],
        minManaValue: 2,
        maxManaValue: 4,
      });

      expect(resolved?.scryfallQuery).toContain('f:commander');
      expect(resolved?.scryfallQuery).toContain('id<=UR');
      expect(resolved?.scryfallQuery).toContain('t:enchantment');
      expect(resolved?.scryfallQuery).toContain('mv>=2');
      expect(resolved?.scryfallQuery).toContain('mv<=4');
    });

    it('recovers end-to-end and records alternatives telemetry', async () => {
      getCardByName.mockResolvedValue(card('Rhystic Study'));
      invoke.mockResolvedValue({
        data: {
          success: true,
          similarQuery: 'o:"unless that player pays"',
          budgetQuery: 'o:"unless that player pays" usd<5',
        },
        error: null,
      });

      const ctx = recoveryContext(QUERY, `!"${QUERY}"`);
      const result = await handleZeroResultRecovery(ctx, false);

      expect(result.handled).toBe(true);
      expect(ctx.setSearchQuery).toHaveBeenCalledWith(
        expect.stringContaining('usd<5'),
      );
      expect(getRecoveryAttempt(QUERY)).toMatchObject({
        path: 'alternatives_similarity',
        alternativesIntent: 'budget_alternatives_to',
        alternativesCard: 'Rhystic Study',
      });
    });
  });

  describe('"cards like eternal witness"', () => {
    const QUERY = 'cards like eternal witness';

    it('detects a non-budget "cards like" intent', () => {
      expect(detectAlternativesIntent(QUERY)).toEqual({
        cardName: 'eternal witness',
        budget: false,
        kind: 'cards_like',
      });
    });

    it('extracts the reference card name for fuzzy fallback', () => {
      expect(extractCardNameCandidate(QUERY)).toBe('eternal witness');
    });

    it('resolves to the similarity query rather than the budget query', async () => {
      getCardByName.mockResolvedValue(
        card('Eternal Witness', {
          type_line: 'Creature — Human Shaman',
          oracle_text:
            'When Eternal Witness enters, you may return target card from your graveyard to your hand.',
          color_identity: ['G'],
          cmc: 3,
        }),
      );
      invoke.mockResolvedValue({
        data: {
          success: true,
          similarQuery: 'o:"return target card from your graveyard" t:creature',
          budgetQuery: 'o:"return target card from your graveyard" usd<2',
        },
        error: null,
      });

      const resolved = await resolveAlternativesQuery(QUERY);

      expect(resolved?.budget).toBe(false);
      expect(resolved?.kind).toBe('cards_like');
      expect(resolved?.scryfallQuery).toContain('t:creature');
      expect(resolved?.scryfallQuery).not.toContain('usd<2');
      expect(resolved?.scryfallQuery).toContain('-!"Eternal Witness"');
    });

    it('falls back to fuzzy name recovery when the edge function fails', async () => {
      getCardByName.mockResolvedValue(card('Eternal Witness'));
      invoke.mockResolvedValue({
        data: { success: false, error: 'similarity unavailable' },
        error: null,
      });
      resolveFuzzyCardName.mockResolvedValue('Eternal Witness');

      const ctx = recoveryContext(QUERY, `!"${QUERY}"`);
      const result = await handleZeroResultRecovery(ctx, false);

      expect(result.handled).toBe(true);
      expect(ctx.setSearchQuery).toHaveBeenCalledWith('!"Eternal Witness"');
      // The detected intent is retained even though the fuzzy path rescued it.
      expect(getRecoveryAttempt(QUERY)).toMatchObject({
        path: 'fuzzy_name',
        alternativesIntent: 'cards_like',
        alternativesCard: 'eternal witness',
      });
    });
  });

  describe('"slickshot show off" (misspelled/unhyphenated card name)', () => {
    const QUERY = 'slickshot show off';

    it('is not treated as an alternatives intent', () => {
      expect(detectAlternativesIntent(QUERY)).toBeNull();
    });

    it('is extracted as a bare card-name candidate', () => {
      expect(extractCardNameCandidate(QUERY)).toBe('slickshot show off');
    });

    it('recovers via the fuzzy resolver to the canonical hyphenated name', async () => {
      resolveFuzzyCardName.mockResolvedValue('Slickshot Show-Off');

      const ctx = recoveryContext(QUERY, 'o:"slickshot"');
      const result = await handleZeroResultRecovery(ctx, false);

      expect(result.handled).toBe(true);
      expect(resolveFuzzyCardName).toHaveBeenCalledWith('slickshot show off');
      expect(ctx.setSearchQuery).toHaveBeenCalledWith('!"Slickshot Show-Off"');
      expect(getRecoveryAttempt(QUERY)).toMatchObject({ path: 'fuzzy_name' });
      // No similarity lookup should happen for a plain card-name query.
      expect(invoke).not.toHaveBeenCalled();
    });

    it('records a fuzzy_failed path when Scryfall finds nothing', async () => {
      resolveFuzzyCardName.mockResolvedValue(null);

      const ctx = recoveryContext(QUERY, 'o:"slickshot"');
      await handleZeroResultRecovery(ctx, false);

      expect(getRecoveryAttempt(QUERY).path).not.toBe('fuzzy_name');
    });
  });
});
