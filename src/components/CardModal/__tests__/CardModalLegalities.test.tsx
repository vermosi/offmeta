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
    it('renders "Format Legality" header', () => {
      const { getByText } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={true} />,
      );
      expect(getByText('Format Legality')).toBeInTheDocument();
    });

    it('shows all formats grouped by status on mobile', () => {
      const { getByText } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={true} />,
      );

      expect(getByText('Modern')).toBeInTheDocument();
      expect(getByText('Legacy')).toBeInTheDocument();
      expect(getByText('Commander')).toBeInTheDocument();
      expect(getByText('Vintage')).toBeInTheDocument();
      expect(getByText('Standard')).toBeInTheDocument();
      expect(getByText('Pauper')).toBeInTheDocument();
    });

    it('shows "Not legal in any format" when there are no legalities', () => {
      const { getByText } = render(
        <CardModalLegalities legalities={{}} isMobile={true} />,
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
      const { getByText, getAllByTestId } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={false} />,
      );

      const badges = getAllByTestId('legality-status');
      const badgeText = badges.map((badge) => badge.textContent);

      expect(badgeText.filter((text) => text === 'legal').length).toBe(3);
      expect(badgeText).toContain('not legal');
      expect(badgeText).toContain('restricted');
      expect(badgeText).toContain('banned');
      expect(getByText('Standard')).toBeInTheDocument();
    });

    it('segments formats into legal, restricted, and not legal sections', () => {
      const { getByRole } = render(
        <CardModalLegalities legalities={defaultLegalities} isMobile={false} />,
      );

      const headings = getByRole('heading', { level: 4 });
      expect(headings.textContent).toContain('Legal In');
      expect(headings.textContent).toContain('restricted');
      expect(headings.textContent).toContain('not legal');
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
