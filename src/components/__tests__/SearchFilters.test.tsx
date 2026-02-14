/**
 * Tests for SearchFilters component.
 * @module components/__tests__/SearchFilters.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchFilters } from '../SearchFilters';
import type { ScryfallCard } from '@/types/card';

function makeCard(overrides: Partial<ScryfallCard> = {}): ScryfallCard {
  return {
    id: 'card-1',
    name: 'Test Card',
    cmc: 3,
    type_line: 'Creature — Human',
    colors: ['W'],
    color_identity: ['W'],
    set: 'test',
    set_name: 'Test Set',
    rarity: 'common',
    scryfall_uri: 'https://scryfall.com/card/test/1',
    legalities: { standard: 'legal' },
    prices: { usd: '1.00' },
    ...overrides,
  } as unknown as ScryfallCard;
}

const defaultCards: ScryfallCard[] = [
  makeCard({ id: '1', name: 'Alpha', cmc: 1, colors: ['W'], type_line: 'Creature — Human', rarity: 'common', prices: { usd: '0.50' } }),
  makeCard({ id: '2', name: 'Beta', cmc: 5, colors: ['U'], type_line: 'Instant', rarity: 'rare', prices: { usd: '5.00' } }),
  makeCard({ id: '3', name: 'Gamma', cmc: 3, colors: ['R', 'G'], type_line: 'Sorcery', rarity: 'mythic', prices: { usd: '15.00' } }),
  makeCard({ id: '4', name: 'Delta', cmc: 0, colors: [], type_line: 'Artifact', rarity: 'uncommon', prices: { usd: '2.00' } }),
];

function renderFilters(cards = defaultCards) {
  const onFilteredCards = vi.fn();
  const result = render(
    <SearchFilters
      cards={cards}
      onFilteredCards={onFilteredCards}
      totalCards={cards.length}
      resetKey={0}
    />,
  );
  return { ...result, onFilteredCards };
}

describe('SearchFilters', () => {
  it('renders filter button', () => {
    renderFilters();
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });

  it('renders sort dropdown with default value', () => {
    renderFilters();
    expect(screen.getByText('Name (A-Z)')).toBeInTheDocument();
  });

  it('calls onFilteredCards with all cards when no filters active', () => {
    const { onFilteredCards } = renderFilters();
    expect(onFilteredCards).toHaveBeenCalled();
    const [filteredCards, hasActive] = onFilteredCards.mock.calls[onFilteredCards.mock.calls.length - 1];
    expect(filteredCards).toHaveLength(4);
    expect(hasActive).toBe(false);
  });

  it('shows color buttons in filter popover', () => {
    renderFilters();
    // Open the popover
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    expect(screen.getByTitle('White')).toBeInTheDocument();
    expect(screen.getByTitle('Blue')).toBeInTheDocument();
    expect(screen.getByTitle('Black')).toBeInTheDocument();
    expect(screen.getByTitle('Red')).toBeInTheDocument();
    expect(screen.getByTitle('Green')).toBeInTheDocument();
    expect(screen.getByTitle('Colorless')).toBeInTheDocument();
  });

  it('shows card type buttons in filter popover', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    expect(screen.getByText('Creature')).toBeInTheDocument();
    expect(screen.getByText('Instant')).toBeInTheDocument();
    expect(screen.getByText('Sorcery')).toBeInTheDocument();
    expect(screen.getByText('Artifact')).toBeInTheDocument();
  });

  it('toggles color filter with aria-pressed', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    const whiteBtn = screen.getByTitle('White');
    expect(whiteBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(whiteBtn);
    expect(whiteBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles type filter with aria-pressed', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    const creatureBtn = screen.getByText('Creature');
    expect(creatureBtn).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(creatureBtn);
    expect(creatureBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters cards by color', () => {
    const { onFilteredCards } = renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByTitle('Blue'));

    const lastCall = onFilteredCards.mock.calls[onFilteredCards.mock.calls.length - 1];
    const [filteredCards, hasActive] = lastCall;
    expect(hasActive).toBe(true);
    expect(filteredCards.every((c: ScryfallCard) => c.colors?.includes('U'))).toBe(true);
  });

  it('filters cards by type', () => {
    const { onFilteredCards } = renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByText('Instant'));

    const lastCall = onFilteredCards.mock.calls[onFilteredCards.mock.calls.length - 1];
    const [filteredCards] = lastCall;
    expect(filteredCards.every((c: ScryfallCard) => c.type_line.toLowerCase().includes('instant'))).toBe(true);
  });

  it('shows active filter count badge', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByTitle('White'));
    fireEvent.click(screen.getByText('Creature'));
    // Badge should show "2"
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows clear all filters button when filters are active', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByTitle('White'));
    expect(screen.getByText('Clear all filters')).toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', () => {
    const { onFilteredCards } = renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByTitle('White'));
    fireEvent.click(screen.getByText('Clear all filters'));

    const lastCall = onFilteredCards.mock.calls[onFilteredCards.mock.calls.length - 1];
    const [filteredCards, hasActive] = lastCall;
    expect(hasActive).toBe(false);
    expect(filteredCards).toHaveLength(4);
  });

  it('shows "Must have all" hint when multiple colors selected', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByTitle('Red'));
    fireEvent.click(screen.getByTitle('Green'));
    expect(screen.getByText('Must have all')).toBeInTheDocument();
  });

  it('shows filtered count indicator', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.click(screen.getByTitle('Blue'));
    // Should show "1/4" or similar
    expect(screen.getByText(/\/4/)).toBeInTheDocument();
  });

  it('displays Mana Value section', () => {
    renderFilters();
    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    expect(screen.getByText('Mana Value')).toBeInTheDocument();
  });

  it('sorts cards by default name A-Z', () => {
    const { onFilteredCards } = renderFilters();
    const lastCall = onFilteredCards.mock.calls[onFilteredCards.mock.calls.length - 1];
    const [filteredCards] = lastCall;
    const names = filteredCards.map((c: ScryfallCard) => c.name);
    expect(names).toEqual(['Alpha', 'Beta', 'Delta', 'Gamma']);
  });
});
