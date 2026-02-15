import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStoredViewMode, storeViewMode } from './view-mode-storage';

describe('view-mode-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns grid as default when nothing stored', () => {
    expect(getStoredViewMode()).toBe('grid');
  });

  it('stores and retrieves grid mode', () => {
    storeViewMode('grid');
    expect(getStoredViewMode()).toBe('grid');
  });

  it('stores and retrieves list mode', () => {
    storeViewMode('list');
    expect(getStoredViewMode()).toBe('list');
  });

  it('stores and retrieves images mode', () => {
    storeViewMode('images');
    expect(getStoredViewMode()).toBe('images');
  });

  it('returns grid for invalid stored values', () => {
    localStorage.setItem('offmeta_view_mode', 'invalid');
    expect(getStoredViewMode()).toBe('grid');
  });

  it('handles localStorage errors gracefully on get', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(getStoredViewMode()).toBe('grid');
    spy.mockRestore();
  });

  it('handles localStorage errors gracefully on set', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => storeViewMode('list')).not.toThrow();
    spy.mockRestore();
  });
});
