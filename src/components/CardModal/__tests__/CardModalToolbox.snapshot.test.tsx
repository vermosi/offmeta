/**
 * Snapshot tests for CardModalToolbox component.
 * @module components/CardModal/__tests__/CardModalToolbox.snapshot.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalToolbox } from '../CardModalToolbox';

describe('CardModalToolbox snapshots', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  const defaultProps = {
    cardName: 'Lightning Bolt',
    scryfallUri: 'https://scryfall.com/card/leb/161/lightning-bolt',
  };

  it('renders desktop view with all links', () => {
    const { container } = render(
      <CardModalToolbox {...defaultProps} isMobile={false} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders mobile view with limited links', () => {
    const { container } = render(
      <CardModalToolbox {...defaultProps} isMobile={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with special characters in card name', () => {
    const { container } = render(
      <CardModalToolbox
        {...defaultProps}
        cardName="Korvold, Fae-Cursed King"
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with split card name', () => {
    const { container } = render(
      <CardModalToolbox
        {...defaultProps}
        cardName="Fire // Ice"
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders with apostrophe in card name', () => {
    const { container } = render(
      <CardModalToolbox
        {...defaultProps}
        cardName="Urza's Tower"
      />,
    );
    expect(container).toMatchSnapshot();
  });
});
