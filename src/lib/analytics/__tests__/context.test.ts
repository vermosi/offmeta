import { beforeEach, describe, expect, it } from 'vitest';
import {
  classifyReferrer,
  parseAttributionParams,
  resolveAttribution,
} from '../context';

describe('analytics context', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('parses utm and click ids', () => {
    const parsed = parseAttributionParams(
      '?utm_source=reddit&utm_medium=social&rdt_cid=abc&ignored=1',
    );
    expect(parsed).toEqual({
      utm_source: 'reddit',
      utm_medium: 'social',
      rdt_cid: 'abc',
    });
  });

  it('sanitizes dangerous characters', () => {
    expect(parseAttributionParams('?utm_campaign=<script>x')).toEqual({
      utm_campaign: 'scriptx',
    });
  });

  it('classifies referrers into channels', () => {
    expect(classifyReferrer('', 'offmeta.app')).toBe('direct');
    expect(classifyReferrer('https://www.google.com/', 'offmeta.app')).toBe('search');
    expect(classifyReferrer('https://www.reddit.com/r/edh', 'offmeta.app')).toBe('social');
    expect(classifyReferrer('https://chatgpt.com/', 'offmeta.app')).toBe('ai_assistant');
    expect(classifyReferrer('https://mtgsalvation.com/', 'offmeta.app')).toBe('referral');
    expect(classifyReferrer('https://offmeta.app/x', 'offmeta.app')).toBe('internal');
  });

  it('persists first-touch attribution across sessions', () => {
    localStorage.setItem(
      'offmeta_attribution_first_touch',
      JSON.stringify({ utm_source: 'reddit' }),
    );
    sessionStorage.setItem(
      'offmeta_attribution',
      JSON.stringify({ utm_source: 'google' }),
    );

    const { session, firstTouch } = resolveAttribution();
    expect(session.utm_source).toBe('google');
    expect(firstTouch.utm_source).toBe('reddit');
  });
});
