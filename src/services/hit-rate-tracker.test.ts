import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('hit-rate-tracker', () => {
  beforeEach(async () => {
    vi.resetModules();
    sessionStorage.clear();
    document.dispatchEvent(new Event('visibilitychange'));
  });

  it('clears pending events when the document becomes hidden', async () => {
    const visibilityStateGetter = vi.spyOn(
      Document.prototype,
      'visibilityState',
      'get',
    );

    try {
      visibilityStateGetter.mockReturnValue('hidden');

      const { recordHit } = await import('@/services/hit-rate-tracker');

      recordHit('local', 'card_by_name', 2);
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();

      const { forceFlushHitRates } =
        await import('@/services/hit-rate-tracker');
      await expect(forceFlushHitRates()).resolves.toBeUndefined();
    } finally {
      visibilityStateGetter.mockRestore();
    }
  });
});
