import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

// Mock i18n
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

describe('EmptyState', () => {
  it('renders the "no cards" heading', () => {
    render(<EmptyState />);
    expect(screen.getByText('empty.noCards')).toBeInTheDocument();
  });

  it('shows the query text when provided', () => {
    render(<EmptyState query="dragon tokens" />);
    expect(screen.getByText('dragon tokens')).toBeInTheDocument();
  });

  it('renders tips section', () => {
    render(<EmptyState />);
    expect(screen.getByText('empty.tips')).toBeInTheDocument();
  });

  it('renders example query buttons when onTryExample provided', () => {
    const handler = vi.fn();
    render(<EmptyState onTryExample={handler} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onTryExample when clicking an example query', () => {
    const handler = vi.fn();
    render(<EmptyState onTryExample={handler} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not render example buttons when onTryExample is not provided', () => {
    render(<EmptyState />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('does not show query text when query is not provided', () => {
    render(<EmptyState />);
    expect(screen.queryByText('empty.noMatch')).not.toBeInTheDocument();
  });
});
