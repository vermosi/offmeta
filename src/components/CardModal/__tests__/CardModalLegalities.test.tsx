/**
 * Tests for CardModalLegalities component.
 * @module components/CardModal/__tests__/CardModalLegalities.test
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalLegalities } from '../CardModalLegalities';

describe('CardModalLegalities', () => {
  const defaultLegalities = {
    standard: 'not_legal',
    modern: 'legal',
    legacy: 'legal',
    vintage: 'restricted',
    commander: 'legal',
    pauper: 'banned',
  };

  describe('mobile view', () => {
    it('renders "Legal In" header', () => {
      const { getByText } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={true} />,
      );
      expect(getByText('Legal In')).toBeInTheDocument();
    });

    it('only shows legal formats on mobile', () => {
      const { getByText, queryByText } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={true} />,
      );
      
      expect(getByText('Modern')).toBeInTheDocument();
      expect(getByText('Legacy')).toBeInTheDocument();
      expect(getByText('Commander')).toBeInTheDocument();
      
      // Should not show non-legal formats
      expect(queryByText('Standard')).not.toBeInTheDocument();
      expect(queryByText('Vintage')).not.toBeInTheDocument();
      expect(queryByText('Pauper')).not.toBeInTheDocument();
    });

    it('shows "Not legal in any format" when no formats are legal', () => {
      const noLegalFormats = {
        standard: 'not_legal',
        modern: 'not_legal',
        legacy: 'banned',
      };
      const { getByText } = render(
        <CardModalLegalities legalities={noLegalFormats} isMobile={true} />,
      );
      expect(getByText('Not legal in any format')).toBeInTheDocument();
    });
  });

  describe('desktop view', () => {
    it('renders "Format Legality" header', () => {
      const { getByText } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={false} />,
      );
      expect(getByText('Format Legality')).toBeInTheDocument();
    });

    it('shows all formats grouped by status', () => {
      const { getByText } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={false} />,
      );

      expect(getByText('Standard')).toBeInTheDocument();
      expect(getByText('Modern')).toBeInTheDocument();
      expect(getByText('Legacy')).toBeInTheDocument();
      expect(getByText('Vintage')).toBeInTheDocument();
      expect(getByText('Commander')).toBeInTheDocument();
      expect(getByText('Pauper')).toBeInTheDocument();
    });

    it('displays correct status badges', () => {
      const { getByText, getAllByText } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={false} />,
      );

      expect(getAllByText('legal').length).toBe(3);
      expect(getByText('not legal')).toBeInTheDocument();
      expect(getByText('restricted')).toBeInTheDocument();
      expect(getByText('banned')).toBeInTheDocument();
    });

    it('segments formats into legal, restricted, and not legal sections', () => {
      const { getByText } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={false} />,
      );

      expect(getByText('Legal In')).toBeInTheDocument();
      expect(getByText('restricted')).toBeInTheDocument();
      expect(getByText('not legal')).toBeInTheDocument();
    });
  });


  it('formats special format names correctly', () => {
    const specialFormats = {
      paupercommander: 'legal',
      historicbrawl: 'legal',
      oldschool: 'legal',
    };
    const { getByText } = render(
      <CardModalLegalities legalities={specialFormats} isMobile={true} />,
    );
    
    expect(getByText('Pauper Commander')).toBeInTheDocument();
    expect(getByText('Historic Brawl')).toBeInTheDocument();
    expect(getByText('Old School')).toBeInTheDocument();
  });

  it('capitalizes regular format names', () => {
    const formats = {
      modern: 'legal',
      legacy: 'legal',
    };
    const { getByText } = render(<CardModalLegalities legalities={formats} isMobile={true} />);
    
    expect(getByText('Modern')).toBeInTheDocument();
    expect(getByText('Legacy')).toBeInTheDocument();
  });
});
