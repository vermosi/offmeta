/**
 * Tests for UnifiedSearchBar component.
 * @module components/__tests__/UnifiedSearchBar.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnifiedSearchBar } from '../UnifiedSearchBar';

// Mock dependencies
vi.mock('@/hooks/useMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/components/SearchHistoryDropdown', () => ({
  SearchHistoryDropdown: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="history-dropdown">{children}</div>
  ),
}));

vi.mock('@/components/SearchFeedback', () => ({
  SearchFeedback: () => <div data-testid="search-feedback" />,
}));

vi.mock('@/components/SearchHelpModal', () => ({
  SearchHelpModal: () => <div data-testid="search-help" />,
}));

vi.mock('@/hooks/useSearchQuery', () => ({
  translateQueryWithDedup: vi.fn().mockResolvedValue({
    scryfallQuery: 't:creature',
    explanation: { readable: 'creatures', assumptions: [], confidence: 0.9 },
    showAffiliate: false,
    source: 'deterministic',
  }),
}));

vi.mock('@/lib/search/fallback', () => ({
  buildClientFallbackQuery: (q: string) => `o:"${q}"`,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('UnifiedSearchBar', () => {
  const defaultProps = {
    onSearch: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('has role="search" landmark', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.getByLabelText(/search for magic cards/i)).toBeInTheDocument();
  });

  it('has sr-only hint text', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.getByText(/type your search query/i)).toBeInTheDocument();
  });

  it('renders example query buttons when input is empty', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.getByRole('group', { name: /try searching for/i })).toBeInTheDocument();
    expect(screen.getByText('creatures that make treasure tokens')).toBeInTheDocument();
    expect(screen.getByText('cheap green ramp spells')).toBeInTheDocument();
  });

  it('hides examples when query is typed', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
    expect(screen.queryByRole('group', { name: /try searching for/i })).not.toBeInTheDocument();
  });

  it('shows clear button when query has text', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'test' } });
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('clears input when clear button clicked', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(screen.getByLabelText('Clear search'));
    expect(input).toHaveValue('');
  });

  it('does not show clear button when input is empty', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('disables search button when input is empty', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    const searchBtn = screen.getByLabelText('Search for cards');
    expect(searchBtn).toBeDisabled();
  });

  it('enables search button when query is entered', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'goblins' } });
    expect(screen.getByLabelText('Search for cards')).not.toBeDisabled();
  });

  it('disables search button when isLoading is true', () => {
    render(<UnifiedSearchBar {...defaultProps} isLoading={true} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'goblins' } });
    expect(screen.getByLabelText('Search for cards')).toBeDisabled();
  });

  it('renders search feedback component', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.getAllByTestId('search-feedback').length).toBeGreaterThan(0);
  });

  it('renders search help modal', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.getAllByTestId('search-help').length).toBeGreaterThan(0);
  });

  it('updates input value on change', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'dragon' } });
    expect(input).toHaveValue('dragon');
  });

  it('has proper placeholder text for desktop', () => {
    render(<UnifiedSearchBar {...defaultProps} />);
    expect(screen.getByPlaceholderText("Describe what you're looking for...")).toBeInTheDocument();
  });
});
