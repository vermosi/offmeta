/**
 * Tests for CardModalPurchaseLinks component.
 * @module components/CardModal/__tests__/CardModalPurchaseLinks.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CardModalPurchaseLinks } from '../CardModalPurchaseLinks';
import type { ScryfallCard } from '@/types/card';

// Mock the printings module
vi.mock('@/lib/scryfall/printings', () => ({
  getTCGPlayerUrl: () => 'https://tcgplayer.com/card/test',
  getCardmarketUrl: () => 'https://cardmarket.com/card/test',
}));

// Mock affiliate config
vi.mock('@/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/hooks')>('@/hooks');
  return {
    ...actual,
    useAffiliateConfig: () => ({ tcgplayerAffiliateBase: '' }),
    wrapAffiliateUrl: (url: string) => url,
  };
});

// Mock PriceSparkline to avoid needing real query client data
vi.mock('@/components/collection/PriceSparkline', () => ({
  PriceSparkline: () => <div data-testid="price-sparkline" />,
}));

// Mock PriceAlertButton
vi.mock('../PriceAlertButton', () => ({
  PriceAlertButton: () => null,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

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
    const { getByText } = renderWithProviders(<CardModalPurchaseLinks {...defaultProps} />);
    expect(getByText('Buy This Card')).toBeInTheDocument();
  });

  it('renders TCGplayer button with USD price', () => {
    const { getByText } = renderWithProviders(<CardModalPurchaseLinks {...defaultProps} />);
    expect(getByText('TCGplayer')).toBeInTheDocument();
    expect(getByText('$5.00')).toBeInTheDocument();
  });

  it('renders Cardmarket button with EUR price', () => {
    const { getByText } = renderWithProviders(<CardModalPurchaseLinks {...defaultProps} />);
    expect(getByText('Cardmarket')).toBeInTheDocument();
    expect(getByText('€4.50')).toBeInTheDocument();
  });

  it('calls onAffiliateClick when TCGplayer button is clicked', () => {
    const onAffiliateClick = vi.fn();
    const { getByText } = renderWithProviders(
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
    const { getByText } = renderWithProviders(
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
    const { getAllByText, getByText } = renderWithProviders(
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
    
    const foilElements = getAllByText(/Foil/);
    expect(foilElements.length).toBeGreaterThanOrEqual(2);
    expect(getByText('$15.00')).toBeInTheDocument();
    expect(getByText('€12.00')).toBeInTheDocument();
  });

  it('renders Cardhoarder button when tix price exists', () => {
    const { getByText } = renderWithProviders(
      <CardModalPurchaseLinks {...defaultProps} displayTix="0.02" />,
    );
    
    expect(getByText(/Cardhoarder/)).toBeInTheDocument();
    expect(getByText('0.02 tix')).toBeInTheDocument();
  });

  it('renders fallback check-price buttons when no prices exist', () => {
    const { getAllByText } = renderWithProviders(
      <CardModalPurchaseLinks
        {...defaultProps}
        displayPrices={{}}
        isLoadingPrintings={false}
      />,
    );

    expect(getAllByText('Check price').length).toBe(2);
  });


  describe('accessible links', () => {

    it('renders purchase links as anchors opening in a new tab', () => {
      const { getAllByRole } = renderWithProviders(
        <CardModalPurchaseLinks {...defaultProps} />,
      );
      const links = getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
    });

    it('includes an aria-label naming the card, vendor, and new-tab behavior', () => {
      const { getByRole } = renderWithProviders(
        <CardModalPurchaseLinks {...defaultProps} />,
      );
      const tcgLink = getByRole('link', {
        name: /Buy Lightning Bolt on TCGplayer \(opens in a new tab\)/i,
      });
      expect(tcgLink).toBeInTheDocument();
    });
  });

  it('renders full-width links', () => {
    const { container } = renderWithProviders(
      <CardModalPurchaseLinks {...defaultProps} />,
    );
    expect(container.querySelector('.w-full')).toBeInTheDocument();
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
    const { getByText } = renderWithProviders(
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
