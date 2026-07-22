import { describe, it, expect, beforeEach } from 'vitest';
import { buildClientFallbackQuery } from '../fallback';
import {
  recentDiagnostics,
  clearDiagnostics,
  friendlySimilarErrorMessage,
  recordSimilarError,
} from '../diagnostics';

describe('search diagnostics', () => {
  beforeEach(() => clearDiagnostics());

  it('records strategy-hate compilation when a hate pattern matches', () => {
    buildClientFallbackQuery('cards that punish treasure decks');
    const events = recentDiagnostics().filter(
      (e) => e.type === 'strategy_hate_compile',
    );
    expect(events.length).toBe(1);
    const [event] = events;
    if (event.type !== 'strategy_hate_compile') throw new Error('bad type');
    expect(event.matched.length).toBeGreaterThan(0);
    expect(event.compiledQuery).toContain('otag:artifact-removal');
    expect(event.query).toBe('cards that punish treasure decks');
  });

  it('does not record strategy-hate events for non-hate queries', () => {
    buildClientFallbackQuery('mono red creatures');
    const events = recentDiagnostics().filter(
      (e) => e.type === 'strategy_hate_compile',
    );
    expect(events.length).toBe(0);
  });

  it('records multi-intent hate compilation with each matched clause', () => {
    buildClientFallbackQuery('punish treasure decks and stop tokens');
    const events = recentDiagnostics().filter(
      (e) => e.type === 'strategy_hate_compile',
    );
    expect(events.length).toBe(1);
    const [event] = events;
    if (event.type !== 'strategy_hate_compile') throw new Error('bad type');
    expect(event.matched.length).toBeGreaterThanOrEqual(2);
  });

  it('caps the ring buffer at 50 events', () => {
    for (let i = 0; i < 60; i++) {
      recordSimilarError(`q${i}`, null, 'boom');
    }
    expect(recentDiagnostics().length).toBe(50);
  });

  describe('friendlySimilarErrorMessage', () => {
    it('maps timeout errors to a retry-friendly message', () => {
      expect(friendlySimilarErrorMessage('Request timed out after 8000ms')).toMatch(
        /too long/i,
      );
    });

    it('maps network errors to a connectivity message', () => {
      expect(friendlySimilarErrorMessage('Failed to fetch')).toMatch(
        /connection|reach/i,
      );
    });

    it('maps missing-source errors to a card-name suggestion', () => {
      expect(friendlySimilarErrorMessage('no source card found')).toMatch(
        /card name/i,
      );
    });

    it('falls back to a generic message for unknown errors', () => {
      expect(friendlySimilarErrorMessage('kaboom 500')).toMatch(
        /temporarily unavailable/i,
      );
    });
  });
});
