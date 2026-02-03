/**
 * Tests for CardModalDetails component.
 * @module components/CardModal/__tests__/CardModalDetails.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalDetails } from '../CardModalDetails';
import type { CardModalDetailsProps } from '../types';

// Mock ManaSymbol component to avoid complex rendering
vi.mock('@/components/ManaSymbol', () => ({
  ManaCost: ({ cost }: { cost: string }) => (
    <span data-testid="mana-cost">{cost}</span>
  ),
  OracleText: ({ text }: { text: string }) => (
    <span data-testid="oracle-text">{text}</span>
  ),
}));

describe('CardModalDetails', () => {
  const defaultProps: CardModalDetailsProps = {
    faceDetails: {
      name: 'Lightning Bolt',
      mana_cost: '{R}',
      type_line: 'Instant',
      oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    },
    displaySetName: 'Alpha',
    displayRarity: 'common',
    displayCollectorNumber: '161',
    displayArtist: 'Christopher Rush',
    isReserved: false,
    englishPrintings: [],
    selectedPrintingId: undefined,
    cardId: 'card-1',
  };

  it('renders card name', () => {
    const { getByText } = render(<CardModalDetails {...defaultProps} />);
    expect(getByText('Lightning Bolt')).toBeInTheDocument();
  });

  it('renders mana cost', () => {
    const { getByTestId } = render(<CardModalDetails {...defaultProps} />);
    expect(getByTestId('mana-cost')).toHaveTextContent('{R}');
  });

  it('renders type line', () => {
    const { getByText } = render(<CardModalDetails {...defaultProps} />);
    expect(getByText('Instant')).toBeInTheDocument();
  });

  it('renders oracle text', () => {
    const { getByTestId } = render(<CardModalDetails {...defaultProps} />);
    expect(getByTestId('oracle-text')).toHaveTextContent(
      'Lightning Bolt deals 3 damage to any target.',
    );
  });

  it('renders rarity badge', () => {
    const { getByText } = render(<CardModalDetails {...defaultProps} />);
    expect(getByText('common')).toBeInTheDocument();
  });

  it('renders set name with collector number', () => {
    const { getByText } = render(<CardModalDetails {...defaultProps} />);
    expect(getByText('Alpha #161')).toBeInTheDocument();
  });

  it('renders artist name', () => {
    const { getByText } = render(<CardModalDetails {...defaultProps} />);
    expect(getByText('Christopher Rush')).toBeInTheDocument();
    expect(getByText('Illustrated by')).toBeInTheDocument();
  });

  it('shows Reserved badge when card is reserved', () => {
    const { getByText } = render(<CardModalDetails {...defaultProps} isReserved={true} />);
    expect(getByText(/Reserved/)).toBeInTheDocument();
  });

  it('does not show Reserved badge when card is not reserved', () => {
    const { queryByText } = render(<CardModalDetails {...defaultProps} isReserved={false} />);
    expect(queryByText(/Reserved/)).not.toBeInTheDocument();
  });

  it('shows Only Printing badge when there is only one printing', () => {
    const printings = [
      {
        id: 'card-1',
        set: 'A',
        set_name: 'Alpha',
        collector_number: '161',
        rarity: 'common',
        prices: {},
        released_at: '1993-08-05',
        lang: 'en',
      },
    ];
    const { getByText } = render(
      <CardModalDetails
        {...defaultProps}
        englishPrintings={printings}
        cardId="card-1"
      />,
    );
    expect(getByText('Only Printing')).toBeInTheDocument();
  });

  it('shows First Printing badge for oldest printing', () => {
    const printings = [
      {
        id: 'card-1',
        set: 'A',
        set_name: 'Alpha',
        collector_number: '161',
        rarity: 'common',
        prices: {},
        released_at: '1993-08-05',
        lang: 'en',
      },
      {
        id: 'card-2',
        set: 'B',
        set_name: 'Beta',
        collector_number: '161',
        rarity: 'common',
        prices: {},
        released_at: '1993-10-04',
        lang: 'en',
      },
    ];
    const { getByText } = render(
      <CardModalDetails
        {...defaultProps}
        englishPrintings={printings}
        cardId="card-1"
      />,
    );
    expect(getByText('First Printing')).toBeInTheDocument();
  });

  it('renders power/toughness for creatures', () => {
    const creatureProps: CardModalDetailsProps = {
      ...defaultProps,
      faceDetails: {
        name: 'Llanowar Elves',
        mana_cost: '{G}',
        type_line: 'Creature — Elf Druid',
        oracle_text: '{T}: Add {G}.',
        power: '1',
        toughness: '1',
      },
    };
    const { getAllByText } = render(<CardModalDetails {...creatureProps} />);
    // Power and toughness are rendered as separate elements
    const powerToughnessElements = getAllByText('1');
    expect(powerToughnessElements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders flavor text when present', () => {
    const propsWithFlavor: CardModalDetailsProps = {
      ...defaultProps,
      faceDetails: {
        ...defaultProps.faceDetails,
        flavor_text: 'The spark that satisfies a need.',
      },
    };
    const { getAllByTestId } = render(<CardModalDetails {...propsWithFlavor} />);
    // Both oracle text and flavor text use OracleText component
    const oracleTextElements = getAllByTestId('oracle-text');
    expect(oracleTextElements.length).toBe(2);
    expect(oracleTextElements[1]).toHaveTextContent('The spark that satisfies a need.');
  });

  it('applies mobile styling when isMobile is true', () => {
    const { container } = render(
      <CardModalDetails {...defaultProps} isMobile={true} />,
    );
    expect(container.querySelector('.text-center')).toBeInTheDocument();
  });

  it('handles different rarity variants', () => {
    const rarities = ['mythic', 'rare', 'uncommon', 'common'];
    
    for (const rarity of rarities) {
      const { getByText, unmount } = render(
        <CardModalDetails {...defaultProps} displayRarity={rarity} />,
      );
      expect(getByText(rarity)).toBeInTheDocument();
      unmount();
    }
  });
});
