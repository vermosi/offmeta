/**
 * Snapshot tests for CardModalLegalities component.
 * @module components/CardModal/__tests__/CardModalLegalities.snapshot.test
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CardModalLegalities } from '../CardModalLegalities';

describe('CardModalLegalities snapshots', () => {
  const fullLegalities = {
    standard: 'not_legal',
    modern: 'legal',
    legacy: 'legal',
    vintage: 'restricted',
    commander: 'legal',
    pauper: 'banned',
    pioneer: 'legal',
    historic: 'legal',
    brawl: 'not_legal',
  };

  it('renders desktop view with all formats', () => {
    const { container } = render(
      <CardModalLegalities legalities={fullLegalities} isMobile={false} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders mobile view with legal formats only', () => {
    const { container } = render(
      <CardModalLegalities legalities={fullLegalities} isMobile={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders when no formats are legal', () => {
    const noLegalFormats = {
      standard: 'not_legal',
      modern: 'not_legal',
      legacy: 'banned',
      vintage: 'banned',
      commander: 'not_legal',
    };
    const { container } = render(
      <CardModalLegalities legalities={noLegalFormats} isMobile={true} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders special format names correctly', () => {
    const specialFormats = {
      paupercommander: 'legal',
      historicbrawl: 'legal',
      oldschool: 'legal',
    };
    const { container } = render(
      <CardModalLegalities legalities={specialFormats} isMobile={false} />,
    );
    expect(container).toMatchSnapshot();
  });

  it('renders all legal statuses', () => {
    const allStatuses = {
      format1: 'legal',
      format2: 'not_legal',
      format3: 'banned',
      format4: 'restricted',
    };
    const { container } = render(
      <CardModalLegalities legalities={allStatuses} isMobile={false} />,
    );
    expect(container).toMatchSnapshot();
  });
});
