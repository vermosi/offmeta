import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';
import { AuthProvider } from '@/components/AuthProvider';

// Mock Supabase client so auth resolves synchronously (prevents act warnings)
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (_cb: unknown) => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) }),
  },
}));

// Mock ThemeToggle
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle</button>,
}));

// Mock NotificationBell
vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => null,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

async function renderHeader(initialRoute = '/') {
  const result = render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Header />
      </AuthProvider>
    </MemoryRouter>,
  );
  // Flush the auth getSession promise
  await waitFor(() => {});
  return result;
}


describe('Header', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  it('renders the logo link', async () => {
    await renderHeader();
    expect(screen.getByLabelText('OffMeta - Home')).toBeInTheDocument();
  });

  it('renders desktop nav dropdown triggers', async () => {
    await renderHeader();
    expect(screen.getByText('Decks')).toBeInTheDocument();
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
  });

  it('renders hamburger button for mobile', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    expect(hamburger).toBeInTheDocument();
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens mobile menu when hamburger is clicked', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes mobile menu when hamburger is clicked again', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(hamburger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes mobile menu on Escape key', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locks body scroll when mobile menu is open', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(hamburger);
    expect(document.body.style.overflow).toBe('');
  });

  it('mobile menu contains grouped nav links', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    const dialog = screen.getByRole('dialog');
    // Section headers
    expect(dialog).toHaveTextContent('Decks');
    expect(dialog).toHaveTextContent('Discover');
    expect(dialog).toHaveTextContent('Learn');
    // Key links
    expect(dialog).toHaveTextContent('Combos');
    expect(dialog).toHaveTextContent('Deck Recs');
    expect(dialog).toHaveTextContent('Guides');
  });

  it('Guides link points to /guides in mobile menu', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    const dialog = screen.getByRole('dialog');
    const guidesLink = Array.from(dialog.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/guides',
    );
    expect(guidesLink).toBeTruthy();
  });

  it('Combos link points to /combos in mobile menu', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    const dialog = screen.getByRole('dialog');
    const combosLink = Array.from(dialog.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/combos',
    );
    expect(combosLink).toBeTruthy();
  });

  it('Deck Recs link points to /deck-recs in mobile menu', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    const dialog = screen.getByRole('dialog');
    const deckRecsLink = Array.from(dialog.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/deck-recs',
    );
    expect(deckRecsLink).toBeTruthy();
  });

  it('has proper aria attributes on hamburger', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    expect(hamburger).toHaveAttribute('aria-label', 'Open menu');
    expect(hamburger).toHaveAttribute('aria-controls', 'mobile-nav-menu');
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-label', 'Close menu');
  });

  it('Guides link in mobile menu closes menu', async () => {
    await renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    
    const dialog = screen.getByRole('dialog');
    const guidesLink = Array.from(dialog.querySelectorAll('a')).find(
      (a) => a.getAttribute('href') === '/guides',
    );
    expect(guidesLink).toBeTruthy();
    fireEvent.click(guidesLink!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
