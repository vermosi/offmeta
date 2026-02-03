/**
 * Snapshot tests for CardModalImage component.
 * @module components/CardModal/__tests__/CardModalImage.snapshot.test
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalImage } from '../CardModalImage';

describe('CardModalImage snapshots', () => {
  const defaultProps = {
    displayImageUrl: 'https://cards.scryfall.io/normal/front/e/0/e01afe46-dc.jpg',
    cardName: 'Lightning Bolt',
    isDoubleFaced: false,
    isFlipping: false,
    onTransform: () => {},
  };

  it('renders single-faced card correctly', () => {
    const { container } = render(<CardModalImage {...defaultProps} />);
    expect(container).toMatchSnapshot();
  });

  it('renders double-faced card with transform button', () => {
    const { container } = render(
      <CardModalImage {...defaultProps} isDoubleFaced={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders flipping state correctly', () => {
    const { container } = render(
      <CardModalImage {...defaultProps} isDoubleFaced={true} isFlipping={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders mobile layout correctly', () => {
    const { container } = render(
      <CardModalImage {...defaultProps} isMobile={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders mobile double-faced card correctly', () => {
    const { container } = render(
      <CardModalImage {...defaultProps} isDoubleFaced={true} isMobile={true} />,
    );
    expect(container).toMatchSnapshot();
  });
});
