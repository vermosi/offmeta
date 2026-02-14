import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';

// Mock ThemeToggle
vi.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle</button>,
}));

function renderHeader() {
  return render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
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

  it('clicking anchor link in mobile menu calls scrollIntoView', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'how-it-works';
    mockElement.scrollIntoView = vi.fn();
    document.body.appendChild(mockElement);

    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    fireEvent.click(hamburger);

    // Click the "How It Works" button inside the mobile dialog
    const dialog = screen.getByRole('dialog');
    const howItWorksBtn = Array.from(dialog.querySelectorAll('button')).find(
      (btn) => btn.textContent === 'How It Works',
    );
    expect(howItWorksBtn).toBeTruthy();
    fireEvent.click(howItWorksBtn!);

    expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    // Menu should close after clicking
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    document.body.removeChild(mockElement);
  });

  it('has proper aria attributes on hamburger', () => {
    renderHeader();
    const hamburger = screen.getByTestId('hamburger-button');
    expect(hamburger).toHaveAttribute('aria-label', 'Open menu');
    expect(hamburger).toHaveAttribute('aria-controls', 'mobile-nav-menu');
    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-label', 'Close menu');
  });
});
