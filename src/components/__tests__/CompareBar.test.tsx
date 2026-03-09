/**
 * Tests for CompareBar component.
 * @module components/__tests__/CompareBar.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompareBar } from '../CompareBar';
import type { ScryfallCard } from '@/types/card';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

vi.mock('@/lib/scryfall/client', () => ({
  getCardImage: (card: { name: string }) => `https://img/${card.name}.jpg`,
}));

function makeCard(name: string): ScryfallCard {
  return {
    id: `id-${name}`,
    name,
    cmc: 2,
    type_line: 'Creature',
    color_identity: [],
    set: 'test',
    set_name: 'Test Set',
    rarity: 'rare',
    prices: {},
    legalities: {},
    scryfall_uri: 'https://scryfall.com',
  } as ScryfallCard;
}

describe('CompareBar', () => {
  const defaultProps = {
    onRemove: vi.fn(),
    onClear: vi.fn(),
    onCompare: vi.fn(),
  };

  it('renders nothing with empty cards', () => {
    const { container } = render(
      <CompareBar {...defaultProps} cards={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders card thumbnails', () => {
    const cards = [makeCard('Bolt'), makeCard('Path')];
    render(<CompareBar {...defaultProps} cards={cards} />);

    expect(screen.getByAltText('Bolt')).toBeInTheDocument();
    expect(screen.getByAltText('Path')).toBeInTheDocument();
  });

  it('shows card count', () => {
    const cards = [makeCard('Bolt'), makeCard('Path')];
    render(<CompareBar {...defaultProps} cards={cards} />);

    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  it('disables compare button with less than 2 cards', () => {
    const cards = [makeCard('Bolt')];
    render(<CompareBar {...defaultProps} cards={cards} />);

    const compareBtn = screen.getByText('compare.label').closest('button');
    expect(compareBtn).toBeDisabled();
  });

  it('enables compare button with 2+ cards', () => {
    const cards = [makeCard('Bolt'), makeCard('Path')];
    render(<CompareBar {...defaultProps} cards={cards} />);

    const compareBtn = screen.getByText('compare.label').closest('button');
    expect(compareBtn).not.toBeDisabled();
  });

  it('calls onClear when clear is clicked', () => {
    const onClear = vi.fn();
    const cards = [makeCard('Bolt')];
    render(<CompareBar {...defaultProps} cards={cards} onClear={onClear} />);

    fireEvent.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove with card id', () => {
    const onRemove = vi.fn();
    const cards = [makeCard('Bolt')];
    render(<CompareBar {...defaultProps} cards={cards} onRemove={onRemove} />);

    fireEvent.click(screen.getByLabelText('Remove Bolt'));
    expect(onRemove).toHaveBeenCalledWith('id-Bolt');
  });

  it('renders empty slots for remaining capacity', () => {
    const cards = [makeCard('Bolt')];
    const { container } = render(
      <CompareBar {...defaultProps} cards={cards} />,
    );
    // 4 max - 1 card = 3 empty slots
    const emptySlots = container.querySelectorAll('[aria-hidden="true"]');
    expect(emptySlots).toHaveLength(3);
  });
});
