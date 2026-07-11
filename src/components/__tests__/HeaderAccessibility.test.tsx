import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
  }),
}));

vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock('@/components/LanguageSelector', () => ({
  LanguageSelector: () => <button type="button">Language</button>,
}));

vi.mock('@/components/Logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

vi.mock('@/components/AuthModal', () => ({
  AuthModal: () => <div data-testid="auth-modal" />,
}));

import { Header } from '@/components/Header';

describe('Header accessibility', () => {
  it('labels the main nav trigger and mobile menu toggle', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('button', { name: 'Decks' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'header.openMenu' }),
    ).toBeInTheDocument();
  });
});
