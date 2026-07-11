import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('@/components/deckbuilder/DeckExportMenu', () => ({
  DeckExportMenu: () => <div data-testid="deck-export-menu" />,
}));

vi.mock('@/components/deckbuilder/DeckTagEditor', () => ({
  DeckTagEditor: () => <div data-testid="deck-tag-editor" />,
}));

vi.mock('@/components/deckbuilder/InlineCardSearch', () => ({
  InlineCardSearch: () => <div data-testid="inline-card-search" />,
}));

import { DeckEditorHeader } from '@/components/deckbuilder/DeckEditorHeader';

describe('DeckEditorHeader', () => {
  it('exposes keyboard shortcuts and primary actions with accessible labels', () => {
    const onOpenShortcuts = vi.fn();

    render(
      <MemoryRouter>
        <DeckEditorHeader
          deck={{
            name: 'Test Deck',
            description: null,
            commander_name: 'Atraxa, Praetors\' Voice',
            companion_name: null,
            format: 'commander',
            is_public: false,
            user_id: 'user-1',
            color_identity: [],
            card_count: 0,
            id: 'deck-1',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }}
          cards={[]}
          deckId="deck-1"
          isReadOnly={false}
          editingName={false}
          nameInput="Test Deck"
          onNameInputChange={vi.fn()}
          onStartEditName={vi.fn()}
          onSaveName={vi.fn()}
          formatLabel="Commander"
          onFormatChange={vi.fn()}
          totalMainboard={0}
          totalSideboard={0}
          totalMaybeboard={0}
          formatMax={100}
          mainboardCount={0}
          deckPrice={null}
          priceLoading={false}
          categorizingAll={false}
          onRecategorizeAll={vi.fn()}
          descriptionOpen={false}
          onDescriptionOpenChange={vi.fn()}
          descriptionInput=""
          onDescriptionInputChange={vi.fn()}
          onDescriptionBlur={vi.fn()}
          onTogglePublic={vi.fn()}
          onAddCard={vi.fn()}
          onPreview={vi.fn()}
          onOpenShortcuts={onOpenShortcuts}
          searchInputRef={{ current: null }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('deck-export-menu')).toBeInTheDocument();
    expect(screen.getByTestId('deck-tag-editor')).toBeInTheDocument();
    expect(screen.getByTestId('inline-card-search')).toBeInTheDocument();
    expect(
      screen.getByTestId('deck-editor-shortcuts-button'),
    ).toBeInTheDocument();
  });
});
