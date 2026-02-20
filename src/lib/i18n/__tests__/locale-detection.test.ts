/**
 * Unit tests for browser locale auto-detection and localStorage priority.
 * @module lib/i18n/__tests__/locale-detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectBrowserLocale } from '../detect-locale';
import * as React from 'react';

// Helper: override navigator.languages for a single test
function setNavigatorLanguages(langs: string[]) {
  Object.defineProperty(navigator, 'languages', {
    configurable: true,
    get: () => langs,
  });
}

describe('detectBrowserLocale()', () => {
  afterEach(() => {
    // Reset to a neutral value so later tests start clean
    setNavigatorLanguages(['en-US']);
  });

  it('maps fr-FR → fr', () => {
    setNavigatorLanguages(['fr-FR']);
    expect(detectBrowserLocale()).toBe('fr');
  });

  it('maps zh-TW → zht', () => {
    setNavigatorLanguages(['zh-TW']);
    expect(detectBrowserLocale()).toBe('zht');
  });

  it('maps zh-CN → zhs', () => {
    setNavigatorLanguages(['zh-CN']);
    expect(detectBrowserLocale()).toBe('zhs');
  });

  it('maps de-AT → de', () => {
    setNavigatorLanguages(['de-AT']);
    expect(detectBrowserLocale()).toBe('de');
  });

  it('maps zh-Hant-HK → zht (Hant prefix)', () => {
    setNavigatorLanguages(['zh-Hant-HK']);
    expect(detectBrowserLocale()).toBe('zht');
  });

  it('maps zh-Hans-CN → zhs (Hans prefix)', () => {
    setNavigatorLanguages(['zh-Hans-CN']);
    expect(detectBrowserLocale()).toBe('zhs');
  });

  it('returns null for an unknown locale', () => {
    setNavigatorLanguages(['xx-XX']);
    expect(detectBrowserLocale()).toBeNull();
  });

  it('returns null when languages list is empty', () => {
    setNavigatorLanguages([]);
    // navigator.language fallback will also be checked; ensure a neutral value
    Object.defineProperty(navigator, 'language', {
      configurable: true,
      get: () => 'xx',
    });
    expect(detectBrowserLocale()).toBeNull();
  });

  it('picks the first matching language when multiple are listed', () => {
    // First language unknown, second is German
    setNavigatorLanguages(['xx-XX', 'de-DE']);
    expect(detectBrowserLocale()).toBe('de');
  });

  it('maps ja-JP → ja', () => {
    setNavigatorLanguages(['ja-JP']);
    expect(detectBrowserLocale()).toBe('ja');
  });

  it('maps pt-BR → pt', () => {
    setNavigatorLanguages(['pt-BR']);
    expect(detectBrowserLocale()).toBe('pt');
  });
});

describe('localStorage override takes priority over browser detection', () => {
  const STORAGE_KEY = 'offmeta-locale';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    setNavigatorLanguages(['en-US']);
  });

  it('stored locale wins even when browser reports a different language', async () => {
    // Store 'es' explicitly
    localStorage.setItem(STORAGE_KEY, 'es');
    // Browser reports French
    setNavigatorLanguages(['fr-FR']);

    const { I18nProvider } = await import('../index');
    const { I18nContext } = await import('../context');
    const { render, screen } = await import('@testing-library/react');

    // Render a Consumer that writes the locale as DOM text — no outer variable
    // mutation inside render, satisfying react-hooks/immutability.
    function Consumer() {
      const ctx = React.useContext(I18nContext);
      return React.createElement('span', { 'data-testid': 'locale' }, ctx?.locale ?? '');
    }

    render(
      React.createElement(I18nProvider, null, React.createElement(Consumer)),
    );

    expect(screen.getByTestId('locale').textContent).toBe('es');
  });

  it('auto-detected locale is persisted to localStorage on first visit', async () => {
    // No stored preference
    localStorage.removeItem(STORAGE_KEY);
    setNavigatorLanguages(['de-DE']);

    const { I18nProvider } = await import('../index');
    const { render } = await import('@testing-library/react');

    render(React.createElement(I18nProvider, null, null));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('de');
  });

  it('falls back to "en" and persists it when browser locale is unknown', async () => {
    localStorage.removeItem(STORAGE_KEY);
    setNavigatorLanguages(['xx-XX']);

    const { I18nProvider } = await import('../index');
    const { render } = await import('@testing-library/react');

    render(React.createElement(I18nProvider, null, null));

    expect(localStorage.getItem(STORAGE_KEY)).toBe('en');
  });
});
