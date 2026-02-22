import { describe, it, expect } from 'vitest';
import { getEdhrecPercentile, getEdhrecTier } from '../edhrec';

describe('getEdhrecPercentile', () => {
  it('returns "Top 1%" for very popular cards', () => {
    expect(getEdhrecPercentile(100)).toBe('Top 1%');
    expect(getEdhrecPercentile(300)).toBe('Top 1%');
  });

  it('returns correct percentile for popular cards', () => {
    expect(getEdhrecPercentile(600)).toBe('Top 2%');
    expect(getEdhrecPercentile(1500)).toBe('Top 5%');
  });

  it('returns correct percentile for mid-range cards', () => {
    expect(getEdhrecPercentile(3000)).toBe('Top 10%');
    expect(getEdhrecPercentile(7500)).toBe('Top 25%');
  });

  it('returns "N/A" for invalid ranks', () => {
    expect(getEdhrecPercentile(0)).toBe('N/A');
    expect(getEdhrecPercentile(-1)).toBe('N/A');
  });
});

describe('getEdhrecTier', () => {
  it('returns "staple" for top 1% cards', () => {
    expect(getEdhrecTier(100)).toBe('staple');
    expect(getEdhrecTier(300)).toBe('staple');
  });

  it('returns "popular" for top 5% cards', () => {
    expect(getEdhrecTier(500)).toBe('popular');
    expect(getEdhrecTier(1500)).toBe('popular');
  });

  it('returns "common" for top 20% cards', () => {
    expect(getEdhrecTier(3000)).toBe('common');
    expect(getEdhrecTier(6000)).toBe('common');
  });

  it('returns "niche" for top 50% cards', () => {
    expect(getEdhrecTier(10000)).toBe('niche');
  });

  it('returns "obscure" for low-ranked cards', () => {
    expect(getEdhrecTier(20000)).toBe('obscure');
    expect(getEdhrecTier(0)).toBe('obscure');
  });
});
