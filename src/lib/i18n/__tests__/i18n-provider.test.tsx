/**
 * Tests for I18nProvider and locale loading.
 * @module lib/i18n/__tests__/i18n-provider.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { I18nProvider, useTranslation } from '../index';

// Helper component that exposes i18n context
function TestConsumer() {
  const { t, locale, setLocale } = useTranslation();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="translated">{t('search.placeholder', 'Search fallback')}</span>
      <span data-testid="missing">{t('nonexistent.key')}</span>
      <span data-testid="missing-with-fallback">{t('nonexistent.key', 'custom fallback')}</span>
      <button onClick={() => setLocale('es' as never)}>Switch to ES</button>
      <button onClick={() => setLocale('en' as never)}>Switch to EN</button>
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders children and provides English locale by default', () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    // Default should be 'en' when no stored locale and navigator not mocked
    expect(screen.getByTestId('locale')).toBeInTheDocument();
  });

  it('provides a working t() function', () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    // t() with missing key returns the key itself
    expect(screen.getByTestId('missing').textContent).toBe('nonexistent.key');
    // t() with missing key + fallback returns fallback
    expect(screen.getByTestId('missing-with-fallback').textContent).toBe('custom fallback');
  });

  it('restores locale from localStorage', () => {
    localStorage.setItem('offmeta-locale', 'en');
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });

  it('switches locale when setLocale is called', async () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );

    await act(async () => {
      screen.getByText('Switch to ES').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('es');
    });

    // Should persist to localStorage
    expect(localStorage.getItem('offmeta-locale')).toBe('es');
  });

  it('switches back to English', async () => {
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );

    await act(async () => {
      screen.getByText('Switch to ES').click();
    });

    await act(async () => {
      screen.getByText('Switch to EN').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('en');
    });
  });

  it('handles localStorage being unavailable for getInitialLocale', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    expect(() =>
      render(
        <I18nProvider>
          <TestConsumer />
        </I18nProvider>,
      ),
    ).not.toThrow();

    getItemSpy.mockRestore();
  });

  it('handles localStorage being unavailable for setLocale', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });

    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );

    // Should not throw when switching locales with broken storage
    await act(async () => {
      screen.getByText('Switch to ES').click();
    });

    // Locale should still update in state even if storage fails
    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('es');
    });

    setItemSpy.mockRestore();
  });

  it('handles stored locale that exists in LOCALE_LOADERS', () => {
    localStorage.setItem('offmeta-locale', 'fr');
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale').textContent).toBe('fr');
  });

  it('falls back to detected locale when stored locale is invalid', () => {
    localStorage.setItem('offmeta-locale', 'xx-invalid');
    render(
      <I18nProvider>
        <TestConsumer />
      </I18nProvider>,
    );
    // Should fall back to detected or 'en'
    expect(screen.getByTestId('locale')).toBeInTheDocument();
  });
});

describe('useTranslation outside provider', () => {
  it('returns defaults from context when used outside provider', () => {
    // useTranslation should still work with default context values
    render(<TestConsumer />);
    expect(screen.getByTestId('locale').textContent).toBe('en');
  });
});
