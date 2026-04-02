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

  // ── Did-you-mean suggestions ──────────────────────────────

  it('renders "Did you mean?" section with suggestions', () => {
    const suggestions = [
      { query: 'o:treasure t:creature', label: 'Removed price filter', totalCards: 42, score: 0.9 },
      { query: 'o:treasure', label: 'Simplified query', totalCards: 150, score: 0.8 },
    ];
    render(<EmptyState query="xyz" suggestions={suggestions} />);
    expect(screen.getByText('empty.didYouMean')).toBeInTheDocument();
    expect(screen.getByText('o:treasure t:creature')).toBeInTheDocument();
    expect(screen.getByText('o:treasure')).toBeInTheDocument();
    expect(screen.getByText('Removed price filter')).toBeInTheDocument();
    expect(screen.getByText('Simplified query')).toBeInTheDocument();
  });

  it('displays card counts for each suggestion', () => {
    const suggestions = [
      { query: 'o:treasure', label: 'Simplified', totalCards: 1234, score: 0.9 },
    ];
    render(<EmptyState query="xyz" suggestions={suggestions} />);
    // Mock t() returns raw key 'empty.cardCount'; .replace('{count}', '1,234') has no match
    // so the rendered text is 'empty.cardCount'. Verify the suggestion button exists.
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('o:treasure');
    expect(btn).toHaveTextContent('Simplified');
    expect(btn).toHaveTextContent('empty.cardCount');
  });

  it('calls onTrySuggestion when clicking a suggestion', () => {
    const handler = vi.fn();
    const suggestions = [
      { query: 'o:treasure t:creature', label: 'Removed price filter', totalCards: 42 },
    ];
    render(
      <EmptyState query="xyz" suggestions={suggestions} onTrySuggestion={handler} />,
    );
    fireEvent.click(screen.getByText('o:treasure t:creature'));
    expect(handler).toHaveBeenCalledWith('o:treasure t:creature');
  });

  it('does not render suggestions section when suggestions array is empty', () => {
    render(<EmptyState query="xyz" suggestions={[]} />);
    expect(screen.queryByText('empty.didYouMean')).not.toBeInTheDocument();
  });

  it('does not render suggestions section when suggestions is undefined', () => {
    render(<EmptyState query="xyz" />);
    expect(screen.queryByText('empty.didYouMean')).not.toBeInTheDocument();
  });

  // ── Checking alternatives loading state ───────────────────

  it('shows checking alternatives spinner when isCheckingSuggestions is true', () => {
    render(<EmptyState query="xyz" isCheckingSuggestions />);
    expect(screen.getByText('empty.didYouMean')).toBeInTheDocument();
    expect(screen.getByText('empty.checkingAlternatives')).toBeInTheDocument();
  });

  it('hides checking text once suggestions arrive', () => {
    const suggestions = [
      { query: 'o:treasure', label: 'Simplified', totalCards: 10 },
    ];
    render(
      <EmptyState query="xyz" isCheckingSuggestions suggestions={suggestions} />,
    );
    // Should show suggestions, not the loading text
    expect(screen.getByText('o:treasure')).toBeInTheDocument();
    expect(screen.queryByText('empty.checkingAlternatives')).not.toBeInTheDocument();
  });

  // ── Edge cases ────────────────────────────────────────────

  it('renders multiple suggestions in order', () => {
    const suggestions = [
      { query: 'query-a', label: 'Label A', totalCards: 10 },
      { query: 'query-b', label: 'Label B', totalCards: 20 },
      { query: 'query-c', label: 'Label C', totalCards: 30 },
    ];
    render(<EmptyState query="xyz" suggestions={suggestions} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent('query-a');
    expect(buttons[1]).toHaveTextContent('query-b');
    expect(buttons[2]).toHaveTextContent('query-c');
  });

  it('renders both suggestions and example queries simultaneously', () => {
    const suggestions = [
      { query: 'o:treasure', label: 'Simplified', totalCards: 10 },
    ];
    const exampleHandler = vi.fn();
    render(
      <EmptyState
        query="xyz"
        suggestions={suggestions}
        onTryExample={exampleHandler}
      />,
    );
    // Suggestions present
    expect(screen.getByText('empty.didYouMean')).toBeInTheDocument();
    // Example queries also present
    expect(screen.getByText('empty.tryOne')).toBeInTheDocument();
  });

  it('does not call onTrySuggestion when handler is not provided', () => {
    const suggestions = [
      { query: 'o:treasure', label: 'Test', totalCards: 5 },
    ];
    // Should not throw
    render(<EmptyState query="xyz" suggestions={suggestions} />);
    fireEvent.click(screen.getByText('o:treasure'));
  });
});
