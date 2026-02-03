/**
 * Tests for CardModalRulings component.
 * @module components/CardModal/__tests__/CardModalRulings.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CardModalRulings } from '../CardModalRulings';
import type { CardRuling } from '@/lib/scryfall/client';

// Mock OracleText component
vi.mock('@/components/ManaSymbol', () => ({
  OracleText: ({ text }: { text: string }) => (
    <span data-testid="oracle-text">{text}</span>
  ),
}));

describe('CardModalRulings', () => {
  const createRuling = (
    source: string,
    published_at: string,
    comment: string,
  ): CardRuling => ({
    object: 'ruling',
    oracle_id: 'test-oracle-id',
    source,
    published_at,
    comment,
  });

  const mockRulings: CardRuling[] = [
    createRuling('wotc', '2023-01-15', 'This is the first ruling.'),
    createRuling('scryfall', '2023-02-20', 'This is the second ruling.'),
  ];

  it('renders nothing when there are no rulings and not loading', () => {
    const { container } = render(
      <CardModalRulings
        rulings={[]}
        isLoading={false}
        showRulings={false}
        onToggleRulings={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders rulings header with count', () => {
    const { getByText } = render(
      <CardModalRulings
        rulings={mockRulings}
        isLoading={false}
        showRulings={false}
        onToggleRulings={vi.fn()}
      />,
    );
    expect(getByText('Rulings (2)')).toBeInTheDocument();
  });

  it('does not show rulings content when showRulings is false', () => {
    const { queryByText } = render(
      <CardModalRulings
        rulings={mockRulings}
        isLoading={false}
        showRulings={false}
        onToggleRulings={vi.fn()}
      />,
    );
    expect(
      queryByText('This is the first ruling.'),
    ).not.toBeInTheDocument();
  });

  it('shows rulings content when showRulings is true', () => {
    const { getByText } = render(
      <CardModalRulings
        rulings={mockRulings}
        isLoading={false}
        showRulings={true}
        onToggleRulings={vi.fn()}
      />,
    );
    expect(getByText('This is the first ruling.')).toBeInTheDocument();
    expect(getByText('This is the second ruling.')).toBeInTheDocument();
  });

  it('calls onToggleRulings when header is clicked', () => {
    const onToggle = vi.fn();
    const { getByText } = render(
      <CardModalRulings
        rulings={mockRulings}
        isLoading={false}
        showRulings={false}
        onToggleRulings={onToggle}
      />,
    );
    
    fireEvent.click(getByText('Rulings (2)'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner when isLoading is true and rulings expanded', () => {
    const { container } = render(
      <CardModalRulings
        rulings={[]}
        isLoading={true}
        showRulings={true}
        onToggleRulings={vi.fn()}
      />,
    );
    // The loading spinner has animate-spin class
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('displays ruling source and date', () => {
    const { getByText } = render(
      <CardModalRulings
        rulings={mockRulings}
        isLoading={false}
        showRulings={true}
        onToggleRulings={vi.fn()}
      />,
    );
    expect(getByText(/wotc/)).toBeInTheDocument();
    expect(getByText(/Jan 15, 2023/)).toBeInTheDocument();
  });

  it('renders when loading even with empty rulings', () => {
    const { getByText } = render(
      <CardModalRulings
        rulings={[]}
        isLoading={true}
        showRulings={false}
        onToggleRulings={vi.fn()}
      />,
    );
    expect(getByText('Rulings (0)')).toBeInTheDocument();
  });
});
