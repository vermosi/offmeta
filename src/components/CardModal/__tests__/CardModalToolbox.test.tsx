/**
 * Tests for CardModalToolbox component.
 * @module components/CardModal/__tests__/CardModalToolbox.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { CardModalToolbox } from '../CardModalToolbox';

describe('CardModalToolbox', () => {
  const defaultProps = {
    cardName: 'Lightning Bolt',
    scryfallUri: 'https://scryfall.com/card/leb/161/lightning-bolt',
  };

  let windowOpenSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('renders Toolbox header', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    expect(getByText('Toolbox')).toBeInTheDocument();
  });

  it('renders EDHREC link', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    expect(getByText('EDHREC')).toBeInTheDocument();
  });

  it('renders Moxfield link', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    expect(getByText('Moxfield')).toBeInTheDocument();
  });

  it('renders MTGTop8 link', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    expect(getByText('MTGTop8')).toBeInTheDocument();
  });

  it('renders Archidekt link', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    expect(getByText('Archidekt')).toBeInTheDocument();
  });

  it('renders Scryfall link', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    expect(getByText('Scryfall')).toBeInTheDocument();
  });

  it('opens EDHREC in new tab when clicked', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    fireEvent.click(getByText('EDHREC'));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('edhrec.com'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens Moxfield in new tab when clicked', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    fireEvent.click(getByText('Moxfield'));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('moxfield.com'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens Scryfall URI when Scryfall button is clicked', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} />);
    fireEvent.click(getByText('Scryfall'));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://scryfall.com/card/leb/161/lightning-bolt',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('encodes card name in URLs', () => {
    const { getByText } = render(
      <CardModalToolbox
        {...defaultProps}
        cardName="Korvold, Fae-Cursed King"
      />,
    );
    fireEvent.click(getByText('EDHREC'));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('Korvold%2C%20Fae-Cursed%20King'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  describe('mobile view', () => {
    it('shows only first 4 links plus Scryfall on mobile', () => {
      const { getByText, queryByText } = render(<CardModalToolbox {...defaultProps} isMobile={true} />);
      
      expect(getByText('EDHREC')).toBeInTheDocument();
      expect(getByText('Moxfield')).toBeInTheDocument();
      expect(getByText('MTGTop8')).toBeInTheDocument();
      expect(getByText('Archidekt')).toBeInTheDocument();
      expect(getByText('Scryfall')).toBeInTheDocument();
      
      // MTGGoldfish and Gatherer should not be visible on mobile
      expect(queryByText('MTGGoldfish')).not.toBeInTheDocument();
      expect(queryByText('Gatherer')).not.toBeInTheDocument();
    });
  });

  describe('desktop view', () => {
    it('shows all links on desktop', () => {
      const { getByText } = render(<CardModalToolbox {...defaultProps} isMobile={false} />);
      
      expect(getByText('EDHREC')).toBeInTheDocument();
      expect(getByText('Moxfield')).toBeInTheDocument();
      expect(getByText('MTGTop8')).toBeInTheDocument();
      expect(getByText('Archidekt')).toBeInTheDocument();
      expect(getByText('MTGGoldfish')).toBeInTheDocument();
      expect(getByText('Gatherer')).toBeInTheDocument();
      expect(getByText('Scryfall')).toBeInTheDocument();
    });
  });

  it('generates correct MTGGoldfish URL', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} isMobile={false} />);
    fireEvent.click(getByText('MTGGoldfish'));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('mtggoldfish.com/price/Lightning+Bolt'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('generates correct Gatherer URL', () => {
    const { getByText } = render(<CardModalToolbox {...defaultProps} isMobile={false} />);
    fireEvent.click(getByText('Gatherer'));
    
    expect(windowOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('gatherer.wizards.com'),
      '_blank',
      'noopener,noreferrer',
    );
  });
});
