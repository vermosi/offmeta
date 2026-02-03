/**
 * Snapshot tests for CardModalDetails component.
 * @module components/CardModal/__tests__/CardModalDetails.snapshot.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalDetails } from '../CardModalDetails';
import type { CardModalDetailsProps } from '../types';

// Mock ManaSymbol component for consistent snapshots
vi.mock('@/components/ManaSymbol', () => ({
  ManaCost: ({ cost }: { cost: string }) => (
    <span data-testid="mana-cost">{cost}</span>
  ),
  OracleText: ({ text }: { text: string }) => (
    <span data-testid="oracle-text">{text}</span>
  ),
}));

describe('CardModalDetails snapshots', () => {
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

  it('renders basic instant card correctly', () => {
    const { container } = render(<CardModalDetails {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });

  it('renders creature with power/toughness', () => {
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
    const { container } = render(<CardModalDetails {...creatureProps} />);
    expect(container).toMatchSnapshot();
  });

  it('renders mythic rare card', () => {
    const { container } = render(
      <CardModalDetails {...defaultProps} displayRarity="mythic" />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders reserved list card', () => {
    const { container } = render(
      <CardModalDetails {...defaultProps} isReserved={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders card with flavor text', () => {
    const propsWithFlavor: CardModalDetailsProps = {
      ...defaultProps,
      faceDetails: {
        ...defaultProps.faceDetails,
        flavor_text: 'The spark that satisfies a need.',
      },
    };
    const { container } = render(<CardModalDetails {...propsWithFlavor} />);
    expect(container).toMatchSnapshot();
  });

  it('renders first printing badge', () => {
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
    const { container } = render(
      <CardModalDetails {...defaultProps} englishPrintings={printings} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders mobile layout', () => {
    const { container } = render(
      <CardModalDetails {...defaultProps} isMobile={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders planeswalker type line', () => {
    const planeswalkerProps: CardModalDetailsProps = {
      ...defaultProps,
      faceDetails: {
        name: 'Jace, the Mind Sculptor',
        mana_cost: '{2}{U}{U}',
        type_line: 'Legendary Planeswalker — Jace',
        oracle_text: '+2: Look at the top card of target player\'s library...',
      },
    };
    const { container } = render(<CardModalDetails {...planeswalkerProps} />);
    expect(container).toMatchSnapshot();
  });
});
