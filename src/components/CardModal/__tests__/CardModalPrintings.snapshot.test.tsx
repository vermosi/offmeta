/**
 * Snapshot tests for CardModalPrintings component.
 * @module components/CardModal/__tests__/CardModalPrintings.snapshot.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalPrintings } from '../CardModalPrintings';

describe('CardModalPrintings snapshots', () => {
  const mockPrintings = [
    {
      id: 'print-1',
      set: 'MH3',
      set_name: 'Modern Horizons 3',
      collector_number: '123',
      rarity: 'rare',
      prices: { usd: '25.00', eur: '22.00', tix: '5.00' },
      released_at: '2024-06-14',
      lang: 'en',
    },
    {
      id: 'print-2',
      set: 'CMM',
      set_name: 'Commander Masters',
      collector_number: '456',
      rarity: 'mythic',
      prices: { usd: '45.00', eur: '40.00' },
      released_at: '2023-08-04',
      lang: 'en',
    },
    {
      id: 'print-3',
      set: 'MH2',
      set_name: 'Modern Horizons 2',
      collector_number: '789',
      rarity: 'rare',
      prices: { usd: '15.00' },
      released_at: '2021-06-18',
      lang: 'en',
    },
  ];

  const defaultProps = {
    printings: mockPrintings,
    selectedPrintingId: undefined,
    cardId: 'print-1',
    isLoading: false,
    onSelectPrinting: vi.fn(),
  };

  it('renders desktop view with all printings', () => {
    const { container } = render(
      <CardModalPrintings {...defaultProps} isMobile={false} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders mobile view with limited printings', () => {
    const { container } = render(
      <CardModalPrintings {...defaultProps} isMobile={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const { container } = render(
      <CardModalPrintings {...defaultProps} isLoading={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with selected printing highlighted', () => {
    const { container } = render(
      <CardModalPrintings {...defaultProps} selectedPrintingId="print-2" />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders empty state', () => {
    const { container } = render(
      <CardModalPrintings {...defaultProps} printings={[]} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders printings with missing prices', () => {
    const printingsWithMissingPrices = [
      {
        id: 'print-1',
        set: 'TST',
        set_name: 'Test Set',
        collector_number: '1',
        rarity: 'common',
        prices: {},
        released_at: '2024-01-01',
        lang: 'en',
      },
    ];
    const { container } = render(
      <CardModalPrintings {...defaultProps} printings={printingsWithMissingPrices} />,
    );
    expect(container).toMatchSnapshot();
  });
});
