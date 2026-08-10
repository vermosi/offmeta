import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../providers', () => ({
  trackExternalEvent: vi.fn(),
}));

import { trackExternalEvent } from '../providers';
import { trackTourEvent } from '../tour';

describe('trackTourEvent', () => {
  beforeEach(() => {
    vi.mocked(trackExternalEvent).mockClear();
  });

  it('attaches a stable tour_id', () => {
    trackTourEvent('tour_started', { total_steps: 4 });
    expect(trackExternalEvent).toHaveBeenCalledWith('tour_started', {
      tour_id: 'homepage',
      total_steps: 4,
    });
  });

  it('drops undefined properties', () => {
    trackTourEvent('tour_skipped', { step_title: undefined, step_index: 2 });
    expect(trackExternalEvent).toHaveBeenCalledWith('tour_skipped', {
      tour_id: 'homepage',
      step_index: 2,
    });
  });
});
