/**
 * Behavioral tests for RecentSearches component.
 * Verifies rendering, click-to-search, individual removal, and clear-all.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentSearches } from '../RecentSearches';

const STORAGE_KEY = 'offmeta_search_history';

function setHistory(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

describe('RecentSearches', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing when history is empty', () => {
    const { container } = render(<RecentSearches onSearch={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when localStorage has no key', () => {
    const { container } = render(<RecentSearches onSearch={vi.fn()} />);
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders chips for stored searches', () => {
    setHistory(['red aggro', 'blue control']);
    render(<RecentSearches onSearch={vi.fn()} />);

    expect(screen.getByText('red aggro')).toBeInTheDocument();
    expect(screen.getByText('blue control')).toBeInTheDocument();
  });

  it('displays at most 6 items', () => {
    setHistory(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    render(<RecentSearches onSearch={vi.fn()} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(6);
  });

  it('renders the heading with clock icon', () => {
    setHistory(['test']);
    render(<RecentSearches onSearch={vi.fn()} />);

    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
  });

  it('calls onSearch when a chip is clicked', () => {
    const onSearch = vi.fn();
    setHistory(['green ramp']);
    render(<RecentSearches onSearch={onSearch} />);

    fireEvent.click(screen.getByText('green ramp'));
    expect(onSearch).toHaveBeenCalledWith('green ramp');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('removes a single item when X is clicked', () => {
    setHistory(['alpha', 'beta']);
    render(<RecentSearches onSearch={vi.fn()} />);

    const removeBtn = screen.getByLabelText('Remove "alpha" from history');
    fireEvent.click(removeBtn);

    expect(screen.queryByText('alpha')).not.toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toEqual(['beta']);
  });

  it('clears all items when Clear is clicked', () => {
    setHistory(['one', 'two', 'three']);
    render(<RecentSearches onSearch={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Clear all recent searches'));

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('hides entire section after clearing all', () => {
    setHistory(['temp']);
    const { container } = render(<RecentSearches onSearch={vi.fn()} />);

    expect(container.querySelector('section')).not.toBeNull();
    fireEvent.click(screen.getByLabelText('Clear all recent searches'));
    expect(container.querySelector('section')).toBeNull();
  });

  it('does not trigger onSearch when removing an item', () => {
    const onSearch = vi.fn();
    setHistory(['keep']);
    render(<RecentSearches onSearch={onSearch} />);

    fireEvent.click(screen.getByLabelText('Remove "keep" from history'));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('has proper aria roles for list and listitems', () => {
    setHistory(['query1', 'query2']);
    render(<RecentSearches onSearch={vi.fn()} />);

    expect(screen.getByRole('list', { name: 'Recent search queries' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('handles malformed localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json');
    const { container } = render(<RecentSearches onSearch={vi.fn()} />);
    // Should render nothing and not throw
    expect(container.querySelector('section')).toBeNull();
  });
});
