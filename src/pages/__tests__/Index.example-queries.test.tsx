/**
 * Integration tests: Example query buttons trigger search.
 * @module pages/__tests__/Index.example-queries.test
 */

import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderIndex, mockTranslateQueryWithDedup } from './index-test-setup';

describe('Index – example queries', () => {
  it('renders example query buttons when no search has been made', async () => {
    await renderIndex();
    expect(
      screen.getByRole('group', { name: /try searching for/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('creatures that make treasure tokens'),
    ).toBeInTheDocument();
  });

  it('clicking an example query triggers search', async () => {
    await renderIndex();

    const exampleBtn = screen.getByText('creatures that make treasure tokens');
    await act(async () => {
      fireEvent.click(exampleBtn);
    });

    await waitFor(() => {
      expect(mockTranslateQueryWithDedup).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'creatures that make treasure tokens',
        }),
      );
    });
  });
});
