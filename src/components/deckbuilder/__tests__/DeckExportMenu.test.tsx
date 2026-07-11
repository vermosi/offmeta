import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

import { DeckExportMenu } from '@/components/deckbuilder/DeckExportMenu';

describe('DeckExportMenu', () => {
  it('labels the export trigger for assistive technology', () => {
    render(
      <DeckExportMenu
        deck={{
          id: 'deck-1',
          name: 'Test Deck',
          is_public: false,
        } as never}
        cards={[]}
        onTogglePublic={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'deckExport.share' })).toBeInTheDocument();
  });
});
