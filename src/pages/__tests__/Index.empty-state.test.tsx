/**
 * Integration tests: Empty state when no results are returned.
 * @module pages/__tests__/Index.empty-state.test
 */

import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderIndex, mockSearchCards } from './index-test-setup';

describe('Index – empty state', () => {
  it('shows empty state when no results are returned', async () => {
    mockSearchCards.mockResolvedValue({
      object: 'list',
      total_cards: 0,
      has_more: false,
      data: [],
    });

    await renderIndex();

    const input = screen.getByRole('searchbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'nonexistent card xyz' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      const matches = screen.getAllByText(/no cards found/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });
  });
});
