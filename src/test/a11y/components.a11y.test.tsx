/**
 * Automated axe-core accessibility checks for shared chrome components.
 * These guard against unlabeled controls and broken skip links on any page
 * that reuses the header/footer/skip-link shell.
 */

import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expectNoA11yViolations } from '@/test/a11y';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    displayName: null,
    avatarUrl: null,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/useUserRole', () => ({
  useUserRole: () => ({ hasRole: false }),
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    locale: 'en',
  }),
}));

vi.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
    locale: 'en',
  }),
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => (
    <button type="button" aria-label="Toggle theme">
      Theme
    </button>
  ),
}));

vi.mock('@/components/LanguageSelector', () => ({
  LanguageSelector: () => (
    <button type="button" aria-label="Change language">
      Language
    </button>
  ),
}));

vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('@/components/AuthModal', () => ({
  AuthModal: () => <div data-testid="auth-modal" />,
}));

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';

describe('shared chrome accessibility (axe)', () => {
  it('Header has no violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );
    await expectNoA11yViolations(container);
  });

  it('Footer has no violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    await expectNoA11yViolations(container);
  });

  it('SkipLinks point at real targets and have no violations', async () => {
    const { container } = render(
      <MemoryRouter>
        <>
          <SkipLinks showSearchLink />
          <input id="search-input" aria-label="Search cards" />
          <main id="main-content">content</main>
        </>
      </MemoryRouter>,
    );

    const links = Array.from(container.querySelectorAll('a[href^="#"]'));
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const targetId = link.getAttribute('href')!.slice(1);
      expect(
        container.querySelector(`#${targetId}`),
        `skip link target #${targetId} must exist`,
      ).not.toBeNull();
    }

    await expectNoA11yViolations(container);
  });
});
