import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchHistoryDropdown } from '../SearchHistoryDropdown';

describe('SearchHistoryDropdown', () => {
  it('renders children directly when history is empty', () => {
    render(
      <SearchHistoryDropdown
        history={[]}
        open={false}
        onOpenChange={vi.fn()}
        onSelectQuery={vi.fn()}
        onRemoveQuery={vi.fn()}
        onClearAll={vi.fn()}
      >
        <button>Trigger</button>
      </SearchHistoryDropdown>,
    );
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('renders trigger when history has items', () => {
    render(
      <SearchHistoryDropdown
        history={['green ramp', 'blue counter']}
        open={false}
        onOpenChange={vi.fn()}
        onSelectQuery={vi.fn()}
        onRemoveQuery={vi.fn()}
        onClearAll={vi.fn()}
      >
        <button>Trigger</button>
      </SearchHistoryDropdown>,
    );
    expect(screen.getByText('Trigger')).toBeInTheDocument();
  });

  it('shows history items when open', () => {
    render(
      <SearchHistoryDropdown
        history={['green ramp', 'blue counter']}
        open={true}
        onOpenChange={vi.fn()}
        onSelectQuery={vi.fn()}
        onRemoveQuery={vi.fn()}
        onClearAll={vi.fn()}
      >
        <button>Trigger</button>
      </SearchHistoryDropdown>,
    );
    expect(screen.getByText('green ramp')).toBeInTheDocument();
    expect(screen.getByText('blue counter')).toBeInTheDocument();
  });

  it('shows "Recent Searches" header when open', () => {
    render(
      <SearchHistoryDropdown
        history={['test']}
        open={true}
        onOpenChange={vi.fn()}
        onSelectQuery={vi.fn()}
        onRemoveQuery={vi.fn()}
        onClearAll={vi.fn()}
      >
        <button>Trigger</button>
      </SearchHistoryDropdown>,
    );
    expect(screen.getByText('Recent Searches')).toBeInTheDocument();
  });

  it('shows "Clear all" button when open', () => {
    render(
      <SearchHistoryDropdown
        history={['test']}
        open={true}
        onOpenChange={vi.fn()}
        onSelectQuery={vi.fn()}
        onRemoveQuery={vi.fn()}
        onClearAll={vi.fn()}
      >
        <button>Trigger</button>
      </SearchHistoryDropdown>,
    );
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('calls onSelectQuery when clicking a history item', () => {
    const onSelect = vi.fn();
    render(
      <SearchHistoryDropdown
        history={['green ramp']}
        open={true}
        onOpenChange={vi.fn()}
        onSelectQuery={onSelect}
        onRemoveQuery={vi.fn()}
        onClearAll={vi.fn()}
      >
        <button>Trigger</button>
      </SearchHistoryDropdown>,
    );
    fireEvent.click(screen.getByText('green ramp'));
    expect(onSelect).toHaveBeenCalledWith('green ramp');
  });

  it('calls onClearAll when clicking clear all button', () => {
    const onClear = vi.fn();
    render(
      <SearchHistoryDropdown
        history={['test']}
        open={true}
        onOpenChange={vi.fn()}
        onSelectQuery={vi.fn()}
        onRemoveQuery={vi.fn()}
        onClearAll={onClear}
      >
        <button>Trigger</button>
      </SearchHistoryDropdown>,
    );
    fireEvent.click(screen.getByText('Clear all'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
