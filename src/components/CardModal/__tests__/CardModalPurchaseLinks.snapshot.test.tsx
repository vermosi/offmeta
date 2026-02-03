/**
 * Snapshot tests for CardModalPurchaseLinks component.
 * @module components/CardModal/__tests__/CardModalPurchaseLinks.snapshot.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalPurchaseLinks } from '../CardModalPurchaseLinks';
import type { ScryfallCard } from '@/types/card';

// Mock the printings module
vi.mock('@/lib/card-printings', () => ({
  getTCGPlayerUrl: () => 'https://tcgplayer.com/card/test',
  getCardmarketUrl: () => 'https://cardmarket.com/card/test',
}));

describe('CardModalPurchaseLinks snapshots', () => {
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
      usd_foil: '25.00',
      eur: '4.50',
      eur_foil: '20.00',
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
      usd_foil: '25.00',
      eur: '4.50',
      eur_foil: '20.00',
    },
    displayTix: undefined,
    selectedPrinting: null,
    isLoadingPrintings: false,
    onAffiliateClick: vi.fn(),
  };

  it('renders desktop view with all prices', () => {
    const { container } = render(
      <CardModalPurchaseLinks {...defaultProps} isMobile={false} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders mobile view', () => {
    const { container } = render(
      <CardModalPurchaseLinks {...defaultProps} isMobile={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with tix price', () => {
    const { container } = render(
      <CardModalPurchaseLinks {...defaultProps} displayTix="0.02" />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const { container } = render(
      <CardModalPurchaseLinks
        {...defaultProps}
        displayPrices={{}}
        isLoadingPrintings={true}
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders without foil prices', () => {
    const { container } = render(
      <CardModalPurchaseLinks
        {...defaultProps}
        displayPrices={{ usd: '5.00', eur: '4.50' }}
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with selected printing', () => {
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
    const { container } = render(
      <CardModalPurchaseLinks {...defaultProps} selectedPrinting={selectedPrinting} />,
    );
    expect(container).toMatchSnapshot();
  });
});
