import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearRecoveryAttempts,
  getRecoveryAttempt,
  recordRecoveryAttempt,
} from '../recoveryTelemetry';

describe('recoveryTelemetry', () => {
  beforeEach(() => {
    clearRecoveryAttempts();
  });

  it('defaults to "none" for untracked queries', () => {
    expect(getRecoveryAttempt('cheap red treasure cards')).toEqual({
      path: 'none',
    });
  });

  it('records the path and intent labels', () => {
    recordRecoveryAttempt('budget alternatives to rhystic study', {
      path: 'alternatives_similarity',
      alternativesIntent: 'budget_alternatives_to',
      alternativesCard: 'Rhystic Study',
    });

    expect(getRecoveryAttempt('Budget Alternatives To Rhystic Study')).toEqual({
      path: 'alternatives_similarity',
      alternativesIntent: 'budget_alternatives_to',
      alternativesCard: 'Rhystic Study',
    });
  });

  it('keeps earlier intent labels when a later path is recorded', () => {
    recordRecoveryAttempt('cards like eternal witness', {
      path: 'alternatives_unresolved',
      alternativesIntent: 'cards_like',
      alternativesCard: 'eternal witness',
    });
    recordRecoveryAttempt('cards like eternal witness', {
      path: 'client_broadening',
    });

    expect(getRecoveryAttempt('cards like eternal witness')).toEqual({
      path: 'client_broadening',
      alternativesIntent: 'cards_like',
      alternativesCard: 'eternal witness',
    });
  });

  it('bounds the map to 50 entries', () => {
    for (let i = 0; i < 60; i += 1) {
      recordRecoveryAttempt(`query ${i}`, { path: 'fuzzy_failed' });
    }
    expect(getRecoveryAttempt('query 0').path).toBe('none');
    expect(getRecoveryAttempt('query 59').path).toBe('fuzzy_failed');
  });
});
