/**
 * Tests for ManaSymbol, ManaCost, and OracleText components.
 * @module components/__tests__/ManaSymbol.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManaSymbol, ManaCost, OracleText } from '../ManaSymbol';

describe('ManaSymbol', () => {
  it('renders an img with correct src and alt', () => {
    render(<ManaSymbol symbol="U" />);
    const img = screen.getByAltText('{U}');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://svgs.scryfall.io/card-symbols/U.svg');
  });

  it('applies size classes', () => {
    const { container } = render(<ManaSymbol symbol="R" size="lg" />);
    const img = container.querySelector('img');
    expect(img).toHaveClass('h-6', 'w-6');
  });

  it('handles hybrid symbols by removing slashes', () => {
    render(<ManaSymbol symbol="W/U" />);
    const img = screen.getByAltText('{W/U}');
    expect(img).toHaveAttribute('src', 'https://svgs.scryfall.io/card-symbols/WU.svg');
  });

  it('handles phyrexian symbols', () => {
    render(<ManaSymbol symbol="R/P" />);
    const img = screen.getByAltText('{R/P}');
    expect(img).toHaveAttribute('src', 'https://svgs.scryfall.io/card-symbols/RP.svg');
  });
});

describe('ManaCost', () => {
  it('renders nothing for empty cost', () => {
    const { container } = render(<ManaCost cost="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders multiple symbols from mana cost string', () => {
    render(<ManaCost cost="{2}{U}{U}" />);
    expect(screen.getByAltText('{2}')).toBeInTheDocument();
    expect(screen.getAllByAltText('{U}')).toHaveLength(2);
  });

  it('handles complex hybrid costs', () => {
    render(<ManaCost cost="{2/W}{G/U}" />);
    expect(screen.getByAltText('{2/W}')).toBeInTheDocument();
    expect(screen.getByAltText('{G/U}')).toBeInTheDocument();
  });
});

describe('OracleText', () => {
  it('renders nothing for empty text', () => {
    const { container } = render(<OracleText text="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders text with inline mana symbols', () => {
    render(<OracleText text="Pay {2}{U}: Draw a card." />);
    expect(screen.getByAltText('{2}')).toBeInTheDocument();
    expect(screen.getByAltText('{U}')).toBeInTheDocument();
    expect(screen.getByText(/Draw a card/)).toBeInTheDocument();
  });

  it('renders tap symbol', () => {
    render(<OracleText text="{T}: Add {G}." />);
    expect(screen.getByAltText('{T}')).toBeInTheDocument();
    expect(screen.getByAltText('{G}')).toBeInTheDocument();
  });
});
