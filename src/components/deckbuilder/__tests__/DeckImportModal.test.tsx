import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/lib/decklist-parser', () => ({
  parseDecklist: (text: string) => ({
    commander: text.includes('Atraxa') ? 'Atraxa, Praetors\' Voice' : null,
    cards: text
      .split('\n')
      .filter(Boolean)
      .map((name) => ({ name, quantity: 1 })),
    totalCards: text.split('\n').filter(Boolean).length,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import { DeckImportModal } from '@/components/deckbuilder/DeckImportModal';

describe('DeckImportModal', () => {
  it('exposes the import mode tabs and upload change action with accessible labels', () => {
    render(
      <DeckImportModal
        open
        onOpenChange={vi.fn()}
        onImport={vi.fn()}
      />,
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'deckImport.moxfieldUrl' })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'deckImport.uploadFile' }));
    expect(screen.getByRole('tabpanel', { name: 'deckImport.uploadFile' })).toBeInTheDocument();
  });
});
