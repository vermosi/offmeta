import { describe, expect, it } from 'vitest';
import { createOrUpdateTranslationRule, processFeedbackItem } from './admin-analytics-actions';

describe('admin analytics actions', () => {
  it('exposes helpers', () => {
    expect(typeof createOrUpdateTranslationRule).toBe('function');
    expect(typeof processFeedbackItem).toBe('function');
  });
});
