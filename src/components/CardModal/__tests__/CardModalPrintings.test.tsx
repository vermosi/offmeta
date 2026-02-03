/**
 * Tests for CardModalPrintings component.
 * @module components/CardModal/__tests__/CardModalPrintings.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CardModalPrintings } from '../CardModalPrintings';
import type { CardPrinting } from '@/lib/scryfall/printings';

describe('CardModalPrintings', () => {
  const mockPrintings: CardPrinting[] = [
    {
      id: 'print-1',
      set: 'MH3',
      set_name: 'Modern Horizons 3',
      collector_number: '123',
      rarity: 'mythic',
      prices: { usd: '45.00', usd_foil: '80.00', eur: '40.00' },
      released_at: '2024-06-14',
      lang: 'en',
    },
    {
      id: 'print-2',
      set: 'MH2',
      set_name: 'Modern Horizons 2',
      collector_number: '234',
      rarity: 'rare',
      prices: { usd: '25.00', eur: '22.00' },
      released_at: '2021-06-18',
      lang: 'en',
    },
    {
      id: 'print-3',
      set: 'MH1',
      set_name: 'Modern Horizons',
      collector_number: '345',
      rarity: 'uncommon',
      prices: { usd: '5.00' },
      released_at: '2019-06-14',
      lang: 'en',
    },
  ];

  const defaultProps = {
    printings: mockPrintings,
    isLoading: false,
    selectedPrintingId: undefined,
    cardId: 'print-1',
    onSelectPrinting: vi.fn(),
  };

  it('renders printings count in header', () => {
    const { getByText } = render(<CardModalPrintings {...defaultProps} />);
    expect(getByText('Printings (3)')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    const { container } = render(<CardModalPrintings {...defaultProps} isLoading={true} />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "No printings found" when printings array is empty', () => {
    const { getByText } = render(
      <CardModalPrintings {...defaultProps} printings={[]} isLoading={false} />,
    );
    expect(getByText('No printings found')).toBeInTheDocument();
  });

  it('renders set names for each printing', () => {
    const { getByText } = render(<CardModalPrintings {...defaultProps} />);
    expect(getByText(/Modern Horizons 3/)).toBeInTheDocument();
    expect(getByText(/Modern Horizons 2/)).toBeInTheDocument();
  });

  it('calls onSelectPrinting when a printing is clicked', () => {
    const onSelect = vi.fn();
    const { getAllByRole } = render(
      <CardModalPrintings {...defaultProps} onSelectPrinting={onSelect} />,
    );
    
    // Click on the second printing
    const printingButtons = getAllByRole('button');
    fireEvent.click(printingButtons[1]);
    
    expect(onSelect).toHaveBeenCalledWith(mockPrintings[1]);
  });

  it('highlights the currently selected printing', () => {
    const { container } = render(
      <CardModalPrintings {...defaultProps} selectedPrintingId="print-2" />,
    );
    
    const selectedButton = container.querySelector('.ring-primary\\/30');
    expect(selectedButton).toBeInTheDocument();
  });

  it('highlights the card id when no printing is selected', () => {
    const { container } = render(
      <CardModalPrintings
        {...defaultProps}
        selectedPrintingId={undefined}
        cardId="print-1"
      />,
    );
    
    const selectedButton = container.querySelector('.ring-primary\\/30');
    expect(selectedButton).toBeInTheDocument();
  });

  describe('mobile view', () => {
    it('shows simplified price display', () => {
      const { getByText } = render(<CardModalPrintings {...defaultProps} isMobile={true} />);
      expect(getByText('$45.00')).toBeInTheDocument();
    });

    it('limits displayed printings to 8 on mobile', () => {
      const manyPrintings = Array.from({ length: 12 }, (_, i) => ({
        id: `print-${i}`,
        set: `SET${i}`,
        set_name: `Set ${i}`,
        collector_number: `${i}`,
        rarity: 'common' as const,
        prices: { usd: `${i}.00` },
        released_at: '2024-01-01',
        lang: 'en',
      }));
      
      const { getByText } = render(
        <CardModalPrintings
          {...defaultProps}
          printings={manyPrintings}
          isMobile={true}
        />,
      );
      
      expect(getByText('+4 more')).toBeInTheDocument();
    });
  });

  describe('desktop view', () => {
    it('shows column headers', () => {
      const { getByText } = render(<CardModalPrintings {...defaultProps} isMobile={false} />);
      expect(getByText('Set')).toBeInTheDocument();
      expect(getByText('USD')).toBeInTheDocument();
      expect(getByText('EUR')).toBeInTheDocument();
      expect(getByText('Tix')).toBeInTheDocument();
    });

    it('shows prices in multiple columns', () => {
      const { getByText } = render(<CardModalPrintings {...defaultProps} isMobile={false} />);
      expect(getByText('$45.00')).toBeInTheDocument();
      expect(getByText('€40.00')).toBeInTheDocument();
    });

    it('shows foil prices', () => {
      const { getByText } = render(<CardModalPrintings {...defaultProps} isMobile={false} />);
      expect(getByText('$80.00')).toBeInTheDocument();
    });

    it('limits displayed printings to 15 on desktop', () => {
      const manyPrintings = Array.from({ length: 20 }, (_, i) => ({
        id: `print-${i}`,
        set: `SET${i}`,
        set_name: `Set ${i}`,
        collector_number: `${i}`,
        rarity: 'common' as const,
        prices: { usd: `${i}.00` },
        released_at: '2024-01-01',
        lang: 'en',
      }));
      
      const { getByText } = render(
        <CardModalPrintings
          {...defaultProps}
          printings={manyPrintings}
          isMobile={false}
        />,
      );
      
      expect(getByText('+5 more printings')).toBeInTheDocument();
    });
  });

  it('shows dash for missing prices', () => {
    const printingsWithMissingPrices: CardPrinting[] = [
      {
        id: 'print-1',
        set: 'SET',
        set_name: 'Test Set',
        collector_number: '1',
        rarity: 'common',
        prices: {},
        released_at: '2024-01-01',
        lang: 'en',
      },
    ];
    
    const { getAllByText } = render(
      <CardModalPrintings
        {...defaultProps}
        printings={printingsWithMissingPrices}
        isMobile={false}
      />,
    );
    
    const dashes = getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('displays rarity indicator dots with correct colors', () => {
    const { container } = render(
      <CardModalPrintings {...defaultProps} isMobile={false} />,
    );
    
    expect(container.querySelector('.bg-orange-500')).toBeInTheDocument(); // mythic
    expect(container.querySelector('.bg-amber-500')).toBeInTheDocument(); // rare
    expect(container.querySelector('.bg-slate-400')).toBeInTheDocument(); // uncommon
  });
});
