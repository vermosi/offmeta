import { beforeEach, describe, expect, it, vi } from 'vitest';

const trackExternalEvent = vi.fn();
const registerExternalSuperProperties = vi.fn();
const setExternalPersonProperties = vi.fn();

vi.mock('@/lib/analytics/providers', () => ({
  trackExternalEvent,
  registerExternalSuperProperties,
  setExternalPersonProperties,
}));

describe('analytics funnels', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('derives a Monday-anchored cohort week', async () => {
    const { toCohortWeek } = await import('../funnels');
    // 2026-08-04 is a Tuesday -> cohort should be Monday 2026-08-03.
    expect(toCohortWeek(Date.UTC(2026, 7, 4, 12))).toBe('2026-08-03');
    expect(toCohortWeek(Date.UTC(2026, 7, 3, 0))).toBe('2026-08-03');
  });

  it('persists a stable onboarding cohort', async () => {
    const { getOnboardingCohort } = await import('../funnels');
    const first = getOnboardingCohort();
    expect(getOnboardingCohort()).toBe(first);
    expect(localStorage.getItem('offmeta_onboarding_cohort')).toBe(first);
  });

  it('emits funnel step events with cohort context', async () => {
    const { trackFunnelStep } = await import('../funnels');
    trackFunnelStep('card_view', { card_name: 'Panharmonicon' });

    const call = trackExternalEvent.mock.calls.find(
      ([name]) => name === 'funnel_card_view',
    );
    expect(call).toBeDefined();
    expect(call?.[1]).toMatchObject({
      card_name: 'Panharmonicon',
      funnel_step: 3,
      funnel_step_name: 'card_view',
      onboarding_day: 0,
    });
    expect(call?.[1].onboarding_cohort).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('emits retention_active at most once per day', async () => {
    const { trackRetentionActivity } = await import('../funnels');
    trackRetentionActivity();
    trackRetentionActivity();
    const pings = trackExternalEvent.mock.calls.filter(
      ([name]) => name === 'retention_active',
    );
    expect(pings).toHaveLength(1);
  });

  it('registers cohort super and person properties on init', async () => {
    const { initFunnelTracking } = await import('../funnels');
    initFunnelTracking();
    expect(registerExternalSuperProperties).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_cohort: expect.any(String) }),
    );
    expect(setExternalPersonProperties).toHaveBeenCalledWith(
      expect.objectContaining({ first_visit_at: expect.any(String) }),
    );
  });
});
