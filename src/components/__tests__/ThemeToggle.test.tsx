import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockSetTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: mockSetTheme }),
}));

describe('ThemeToggle', () => {
  it('renders a button', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  it('has accessible label for dark mode', () => {
    render(<ThemeToggle />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-label', 'theme.switchToLight');
  });

  it('calls setTheme when clicked', () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('has aria-pressed reflecting dark state', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });
});
