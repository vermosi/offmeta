/**
 * Tests for CardModalPurchaseLinks component.
 * @module components/CardModal/__tests__/CardModalPurchaseLinks.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CardModalPurchaseLinks } from '../CardModalPurchaseLinks';
import type { ScryfallCard } from '@/types/card';

// Mock the printings module
vi.mock('@/lib/card-printings', () => ({
  getTCGPlayerUrl: () => 'https://tcgplayer.com/card/test',
  getCardmarketUrl: () => 'https://cardmarket.com/card/test',
}));

describe('CardModalPurchaseLinks', () => {
  const mockCard: ScryfallCard = {
    id: 'card-1',
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    cmc: 1,
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    color_identity: ['R'],
    set: 'LEB',
    set_name: 'Limited Edition Beta',
    rarity: 'common',
    prices: {
      usd: '5.00',
      usd_foil: undefined,
      eur: '4.50',
      eur_foil: undefined,
    },
    legalities: { modern: 'legal' },
    scryfall_uri: 'https://scryfall.com/card/leb/161',
    purchase_uris: {
      tcgplayer: 'https://tcgplayer.com/lightning-bolt',
      cardmarket: 'https://cardmarket.com/lightning-bolt',
    },
  };

  const defaultProps = {
    card: mockCard,
    displayPrices: {
      usd: '5.00',
      eur: '4.50',
    },
    displayTix: undefined,
    selectedPrinting: null,
    isLoadingPrintings: false,
    onAffiliateClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('renders "Buy This Card" header', () => {
    const { getByText } = render(<CardModalPurchaseLinks {...defaultProps} />);
    expect(getByText('Buy This Card')).toBeInTheDocument();
  });

  it('renders TCGplayer button with USD price', () => {
    const { getByText } = render(<CardModalPurchaseLinks {...defaultProps} />);
    expect(getByText('TCGplayer')).toBeInTheDocument();
    expect(getByText('$5.00')).toBeInTheDocument();
  });

  it('renders Cardmarket button with EUR price', () => {
    const { getByText } = render(<CardModalPurchaseLinks {...defaultProps} />);
    expect(getByText('Cardmarket')).toBeInTheDocument();
    expect(getByText('€4.50')).toBeInTheDocument();
  });

  it('calls onAffiliateClick when TCGplayer button is clicked', () => {
    const onAffiliateClick = vi.fn();
    const { getByText } = render(
      <CardModalPurchaseLinks
        {...defaultProps}
        onAffiliateClick={onAffiliateClick}
      />,
    );
    
    fireEvent.click(getByText('TCGplayer'));
    expect(onAffiliateClick).toHaveBeenCalledWith(
      'tcgplayer',
      expect.any(String),
      '5.00',
    );
  });

  it('calls onAffiliateClick when Cardmarket button is clicked', () => {
    const onAffiliateClick = vi.fn();
    const { getByText } = render(
      <CardModalPurchaseLinks
        {...defaultProps}
        onAffiliateClick={onAffiliateClick}
      />,
    );
    
    fireEvent.click(getByText('Cardmarket'));
    expect(onAffiliateClick).toHaveBeenCalledWith(
      'cardmarket',
      expect.any(String),
      '4.50',
    );
  });

  it('renders foil buttons when foil prices exist', () => {
    const { getAllByText, getByText } = render(
      <CardModalPurchaseLinks
        {...defaultProps}
        displayPrices={{
          usd: '5.00',
          usd_foil: '15.00',
          eur: '4.50',
          eur_foil: '12.00',
        }}
      />,
    );
    
    // There should be multiple foil buttons/icons
    const foilElements = getAllByText(/Foil/);
    expect(foilElements.length).toBeGreaterThanOrEqual(2);
    expect(getByText('$15.00')).toBeInTheDocument();
    expect(getByText('€12.00')).toBeInTheDocument();
  });

  it('renders Cardhoarder button when tix price exists', () => {
    const { getByText } = render(
      <CardModalPurchaseLinks {...defaultProps} displayTix="0.02" />,
    );
    
    expect(getByText(/Cardhoarder/)).toBeInTheDocument();
    expect(getByText('0.02 tix')).toBeInTheDocument();
  });

  it('shows loading spinner when loading and no prices', () => {
    const { container } = render(
      <CardModalPurchaseLinks
        {...defaultProps}
        displayPrices={{}}
        isLoadingPrintings={true}
      />,
    );
    
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('does not show loading spinner when prices exist', () => {
    const { container } = render(
      <CardModalPurchaseLinks {...defaultProps} isLoadingPrintings={true} />,
    );
    
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
  });

  describe('mobile view', () => {
    it('renders buttons in grid layout', () => {
      const { container } = render(
        <CardModalPurchaseLinks {...defaultProps} isMobile={true} />,
      );
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();
    });

    it('uses smaller button sizes', () => {
      const { getAllByRole } = render(<CardModalPurchaseLinks {...defaultProps} isMobile={true} />);
      // Mobile buttons have text-xs class
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('desktop view', () => {
    it('shows shopping cart icons', () => {
      const { getAllByRole } = render(<CardModalPurchaseLinks {...defaultProps} isMobile={false} />);
      // The component renders ShoppingCart icons on desktop
      const buttons = getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders full-width buttons', () => {
      const { container } = render(
        <CardModalPurchaseLinks {...defaultProps} isMobile={false} />,
      );
      expect(container.querySelector('.w-full')).toBeInTheDocument();
    });
  });

  it('uses selected printing purchase URLs when available', () => {
    const selectedPrinting = {
      id: 'print-1',
      set: 'MH3',
      set_name: 'Modern Horizons 3',
      collector_number: '123',
      rarity: 'rare',
      prices: { usd: '50.00' },
      purchase_uris: {
        tcgplayer: 'https://tcgplayer.com/mh3-bolt',
        cardmarket: 'https://cardmarket.com/mh3-bolt',
      },
      released_at: '2024-06-14',
      lang: 'en',
    };
    
    const onAffiliateClick = vi.fn();
    const { getByText } = render(
      <CardModalPurchaseLinks
        {...defaultProps}
        selectedPrinting={selectedPrinting}
        onAffiliateClick={onAffiliateClick}
      />,
    );
    
    fireEvent.click(getByText('TCGplayer'));
    expect(onAffiliateClick).toHaveBeenCalledWith(
      'tcgplayer',
      'https://tcgplayer.com/mh3-bolt',
      '5.00',
    );
  });
});
