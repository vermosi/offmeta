/**
 * Snapshot tests for CardModalRulings component.
 * @module components/CardModal/__tests__/CardModalRulings.snapshot.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalRulings } from '../CardModalRulings';

describe('CardModalRulings snapshots', () => {
  const mockRulings = [
    {
      object: 'ruling',
      oracle_id: 'abc123',
      source: 'wotc',
      published_at: '2023-01-15',
      comment: 'This spell can target any creature or player.',
    },
    {
      object: 'ruling',
      oracle_id: 'abc123',
      source: 'wotc',
      published_at: '2022-06-10',
      comment: 'The damage is dealt as the spell resolves.',
    },
    {
      object: 'ruling',
      oracle_id: 'abc123',
      source: 'scryfall',
      published_at: '2021-03-05',
      comment: 'This is one of the most efficient burn spells ever printed.',
    },
  ];

  const defaultProps = {
    rulings: mockRulings,
    isLoading: false,
    showRulings: false,
    onToggleRulings: vi.fn(),
  };

  it('renders collapsed state with rulings count', () => {
    const { container } = render(<CardModalRulings {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });

  it('renders expanded state', () => {
    const { container } = render(
      <CardModalRulings {...defaultProps} showRulings={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const { container } = render(
      <CardModalRulings {...defaultProps} rulings={[]} isLoading={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders empty rulings state', () => {
    const { container } = render(
      <CardModalRulings {...defaultProps} rulings={[]} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders single ruling expanded', () => {
    const { container } = render(
      <CardModalRulings {...defaultProps} rulings={[mockRulings[0]]} showRulings={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with many rulings expanded', () => {
    const manyRulings = Array.from({ length: 10 }, (_, i) => ({
      object: 'ruling',
      oracle_id: 'abc123',
      source: 'wotc',
      published_at: `2023-0${(i % 9) + 1}-15`,
      comment: `Ruling ${i + 1}: This is a test ruling with detailed explanation.`,
    }));
    const { container } = render(
      <CardModalRulings {...defaultProps} rulings={manyRulings} showRulings={true} />,
    );
    expect(container).toMatchSnapshot();
  });
});
