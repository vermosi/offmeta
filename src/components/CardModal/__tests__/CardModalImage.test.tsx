/**
 * Tests for CardModalImage component.
 * @module components/CardModal/__tests__/CardModalImage.test
 */

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CardModalImage } from '../CardModalImage';

describe('CardModalImage', () => {
  const defaultProps = {
    displayImageUrl: 'https://example.com/card.jpg',
    cardName: 'Lightning Bolt',
    isDoubleFaced: false,
    isFlipping: false,
    onTransform: vi.fn(),
  };

  it('renders card image with correct alt text', () => {
    const { getByAltText } = render(<CardModalImage {...defaultProps} />);
    
    const img = getByAltText('Lightning Bolt');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/card.jpg');
  });

  it('does not show transform button for single-faced cards', () => {
    const { queryByText } = render(<CardModalImage {...defaultProps} isDoubleFaced={false} />);
    
    expect(queryByText('Transform')).not.toBeInTheDocument();
  });

  it('shows transform button for double-faced cards', () => {
    const { getByText } = render(<CardModalImage {...defaultProps} isDoubleFaced={true} />);
    
    expect(getByText('Transform')).toBeInTheDocument();
  });

  it('calls onTransform when transform button is clicked', () => {
    const onTransform = vi.fn();
    const { getByText } = render(
      <CardModalImage
        {...defaultProps}
        isDoubleFaced={true}
        onTransform={onTransform}
      />,
    );
    
    fireEvent.click(getByText('Transform'));
    expect(onTransform).toHaveBeenCalledTimes(1);
  });

  it('applies flipping animation class when isFlipping is true', () => {
    const { getByAltText } = render(<CardModalImage {...defaultProps} isFlipping={true} />);
    
    const img = getByAltText('Lightning Bolt');
    expect(img).toHaveClass('scale-x-0');
  });

  it('does not apply flipping class when isFlipping is false', () => {
    const { getByAltText } = render(<CardModalImage {...defaultProps} isFlipping={false} />);
    
    const img = getByAltText('Lightning Bolt');
    expect(img).not.toHaveClass('scale-x-0');
  });

  it('uses mobile max-width when isMobile is true', () => {
    const { container } = render(
      <CardModalImage {...defaultProps} isMobile={true} />,
    );
    
    const wrapper = container.querySelector('.max-w-\\[180px\\]');
    expect(wrapper).toBeInTheDocument();
  });

  it('uses desktop max-width when isMobile is false', () => {
    const { container } = render(
      <CardModalImage {...defaultProps} isMobile={false} />,
    );
    
    const wrapper = container.querySelector('.max-w-\\[220px\\]');
    expect(wrapper).toBeInTheDocument();
  });
});
