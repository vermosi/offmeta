/**
 * Unit tests for CardPreviewPanel default preview behavior.
 * @module components/deckbuilder/__tests__/CardPreviewPanel.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CardPreviewPanel } from '../CardPreviewPanel';
import { type DeckCard } from '@/hooks';
import type { ScryfallCard } from '@/types/card';

vi.mock('@/components/deckbuilder/DeckCombos', () => ({
  DeckCombos: () => <div data-testid="deck-combos" />,
}));

vi.mock('@/components/deckbuilder/SuggestionsPanel', () => ({
  SuggestionsPanel: () => <div data-testid="suggestions-panel" />,
}));

vi.mock('@/components/deckbuilder/DeckCritiquePanel', () => ({
  DeckCritiquePanel: () => <div data-testid="deck-critique" />,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'deckEditor.preview.clickToPreview') return 'Click a card to preview.';
      return key;
    },
  }),
}));

const mockSearchCards = vi.fn();
vi.mock('@/lib/scryfall', () => ({
  searchCards: (...args: unknown[]) => mockSearchCards(...args),
}));

function makeDeckCard(name: string, overrides?: Partial<DeckCard>): DeckCard {
  return {
    id: `deck-card-${name}`,
    deck_id: 'deck-1',
    card_name: name,
    quantity: 1,
    board: 'mainboard',
    category: 'Creatures',
    is_commander: false,
    is_companion: false,
    scryfall_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeScryfallCard(name: string): ScryfallCard {
  return {
    id: `scry-${name}`,
    name,
    cmc: 2,
    type_line: 'Legendary Creature — Human Wizard',
    color_identity: ['U', 'G'],
    set: 'cmd',
    set_name: 'Commander',
    rarity: 'rare',
    prices: {},
    legalities: {},
    scryfall_uri: 'https://scryfall.com/card/test',
    image_uris: {
      small: 'https://img.small',
      normal: 'https://img.normal',
      large: 'https://img.large',
      png: 'https://img.png',
      art_crop: 'https://img.art',
      border_crop: 'https://img.border',
    },
  };
}

const BASE_PROPS = {
  card: null,
  suggestions: [],
  suggestionsAnalysis: '',
  suggestionsLoading: false,
  onSuggest: vi.fn(),
  onAddSuggestion: vi.fn(),
  cardCount: 0,
  deckCards: [] as DeckCard[],
  commanderName: null as string | null,
  colorIdentity: [] as string[],
  format: 'commander',
  onRemoveByName: vi.fn(),
  deckId: 'deck-1',
};

describe('CardPreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows placeholder card when no selected card and no commander', () => {
    render(<CardPreviewPanel {...BASE_PROPS} />);

    expect(screen.getByTestId('card-preview-placeholder')).toBeInTheDocument();
    expect(screen.getByText('Click a card to preview.')).toBeInTheDocument();
  });

  it('defaults to commander card from cache when no card is selected', async () => {
    const commanderCard = makeScryfallCard('Kinnan, Bonder Prodigy');
    const cacheRef = { current: new Map<string, ScryfallCard>([['Kinnan, Bonder Prodigy', commanderCard]]) };

    render(
      <CardPreviewPanel
        {...BASE_PROPS}
        commanderName="Kinnan, Bonder Prodigy"
        deckCards={[makeDeckCard('Kinnan, Bonder Prodigy', { is_commander: true })]}
        scryfallCache={cacheRef}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Kinnan, Bonder Prodigy')).toBeInTheDocument();
    });
    expect(mockSearchCards).not.toHaveBeenCalled();
  });

  it('fetches commander card when not cached and uses it as default preview', async () => {
    const commanderCard = makeScryfallCard('Atraxa, Praetors\' Voice');
    mockSearchCards.mockResolvedValue({ data: [commanderCard] });
    const cacheRef = { current: new Map<string, ScryfallCard>() };

    render(
      <CardPreviewPanel
        {...BASE_PROPS}
        commanderName="Atraxa, Praetors' Voice"
        deckCards={[makeDeckCard("Atraxa, Praetors' Voice", { is_commander: true })]}
        scryfallCache={cacheRef}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Atraxa, Praetors' Voice")).toBeInTheDocument();
    });

    expect(mockSearchCards).toHaveBeenCalledWith("!\"Atraxa, Praetors' Voice\"");
    expect(cacheRef.current.get("Atraxa, Praetors' Voice")?.name).toBe("Atraxa, Praetors' Voice");
  });
});
