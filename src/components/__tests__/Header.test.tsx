import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';

// Mock ThemeToggle
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle</button>,
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderHeader(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  it('renders the logo link', () => {
    renderHeader();
    expect(screen.getByLabelText('OffMeta - Home')).toBeInTheDocument();
  });

  it('renders desktop nav links', () => {
    renderHeader();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('Daily Pick')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
    expect(screen.getByText('Guides')).toBeInTheDocument();
  });

  it('renders hamburger button for mobile', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    expect(hamburger).toBeInTheDocument();
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens mobile menu when hamburger is clicked', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes mobile menu when hamburger is clicked again', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(hamburger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes mobile menu on Escape key', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('locks body scroll when mobile menu is open', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(hamburger);
    expect(document.body.style.overflow).toBe('');
  });

  it('mobile menu contains all nav links', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('How It Works');
    expect(dialog).toHaveTextContent('Daily Pick');
    expect(dialog).toHaveTextContent('FAQ');
    expect(dialog).toHaveTextContent('Guides');
  });

  it('clicking anchor link on home page scrolls into view', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'how-it-works';
    mockElement.scrollIntoView = vi.fn();
    document.body.appendChild(mockElement);

    renderHeader('/');
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);

    const dialog = screen.getByRole('dialog');
    const howItWorksBtn = Array.from(dialog.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'How It Works',
    );
    expect(howItWorksBtn).toBeTruthy();
    fireEvent.click(howItWorksBtn!);

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    document.body.removeChild(mockElement);
  });

  it('clicking anchor link on non-home page navigates to home with hash', () => {
    renderHeader('/guides');
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);

    const dialog = screen.getByRole('dialog');
    const dailyPickBtn = Array.from(dialog.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'Daily Pick',
    );
    expect(dailyPickBtn).toBeTruthy();
    fireEvent.click(dailyPickBtn!);

    expect(mockNavigate).toHaveBeenCalledWith('/#daily-pick');
  });

  it('Guides link points to /guides', () => {
    renderHeader();
    // Desktop nav Guides link
    const guidesLinks = screen.getAllByText('Guides');
    const desktopLink = guidesLinks.find(
      (el) => el.closest('a')?.getAttribute('href') === '/guides',
    );
    expect(desktopLink).toBeTruthy();
  });

  it('has proper aria attributes on hamburger', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    expect(hamburger).toHaveAttribute('aria-label', 'Open menu');
    expect(hamburger).toHaveAttribute('aria-controls', 'mobile-nav-menu');
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-label', 'Close menu');
  });

  it('Guides link in mobile menu closes menu', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);
    
    const dialog = screen.getByRole('dialog');
    const guidesLink = Array.from(dialog.querySelectorAll('a')).find(
      (a) => a.textContent === 'Guides',
    );
    expect(guidesLink).toBeTruthy();
    fireEvent.click(guidesLink!);
    // Menu should close after clicking a link
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
