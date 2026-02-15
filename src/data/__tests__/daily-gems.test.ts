import { describe, it, expect, vi, afterEach } from 'vitest';
import { DAILY_GEMS, getTodayPickIndex, getTodayPick } from '../daily-gems';

describe('daily-gems', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('DAILY_GEMS has more than 30 entries', () => {
    expect(DAILY_GEMS.length).toBeGreaterThan(30);
  });

  it('every gem has a non-empty name and reason', () => {
    for (const gem of DAILY_GEMS) {
      expect(gem.name.trim().length).toBeGreaterThan(0);
      expect(gem.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it('no duplicate card names', () => {
    const names = DAILY_GEMS.map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('getTodayPickIndex returns a value within bounds', () => {
    const index = getTodayPickIndex();
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(DAILY_GEMS.length);
  });

  it('getTodayPickIndex is deterministic for same date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    const a = getTodayPickIndex();
    const b = getTodayPickIndex();
    expect(a).toBe(b);
  });

  it('getTodayPickIndex changes on different days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    const day1 = getTodayPickIndex();
    vi.setSystemTime(new Date('2025-06-16T12:00:00Z'));
    const day2 = getTodayPickIndex();
    expect(day1).not.toBe(day2);
  });

  it('getTodayPick returns a valid gem', () => {
    const gem = getTodayPick();
    expect(gem).toHaveProperty('name');
    expect(gem).toHaveProperty('reason');
    expect(DAILY_GEMS).toContain(gem);
  });
});
