import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn();
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
  },
}));

describe('hit-rate-tracker', () => {
  beforeEach(async () => {
    vi.resetModules();
    insertMock.mockReset();
    fromMock.mockClear();
    sessionStorage.clear();
    document.dispatchEvent(new Event('visibilitychange'));
    insertMock.mockResolvedValue({ error: null });
  });

  it('flushes pending events when the document becomes hidden', async () => {
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

      expect(fromMock).toHaveBeenCalledWith('analytics_events');
      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          event_type: 'hit_rate',
          event_data: expect.objectContaining({
            source: 'local',
            operation: 'card_by_name',
            count: 2,
          }),
        }),
      ]);
    } finally {
      visibilityStateGetter.mockRestore();
    }
  });
});
