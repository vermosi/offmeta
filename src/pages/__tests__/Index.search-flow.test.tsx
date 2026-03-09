/**
 * Integration tests: Search flow (translation → Scryfall → results).
 * @module pages/__tests__/Index.search-flow.test
 */

import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import {
  renderIndex,
  mockTranslateQueryWithDedup,
  mockSearchCards,
} from './index-test-setup';
import { createMockTranslation } from '@/test/factories';

describe('Index – search flow', () => {
  it('renders hero section and search bar on initial load', async () => {
    await renderIndex();
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('displays skeleton loaders while searching', async () => {
    let resolveTranslation: (() => void) | null = null;
    mockTranslateQueryWithDedup.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveTranslation = () => {
            resolve(createMockTranslation({ scryfallQuery: 'o:"treasure"' }));
          };
        }),
    );

    await renderIndex();

    const input = screen.getByRole('searchbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'treasure makers' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Searching...')).toBeInTheDocument();
    });

    await act(async () => {
      if (resolveTranslation) resolveTranslation();
    });
  });

  it('renders card results after successful search flow', async () => {
    await renderIndex();

    const input = screen.getByRole('searchbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'treasure makers' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(mockTranslateQueryWithDedup).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'treasure makers' }),
      );
      expect(mockSearchCards).toHaveBeenCalled();
    });

    expect(screen.queryByText(/no cards found/i)).not.toBeInTheDocument();
  });

  it('shows total cards count after search', async () => {
    await renderIndex();

    const input = screen.getByRole('searchbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'treasure' } });
      fireEvent.keyDown(input, { key: 'Enter' });
    });

    await waitFor(() => {
      expect(screen.getByText('3 cards')).toBeInTheDocument();
    });
  });
});
