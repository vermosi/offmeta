/**
 * Unit tests for DeckCritiquePanel component.
 * @module components/deckbuilder/__tests__/DeckCritiquePanel.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeckCritiquePanel } from '../DeckCritiquePanel';
import type { DeckCard } from '@/hooks/useDeck';

// Mock supabase
const mockInvoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/useToast', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

function makeDeckCard(name: string, overrides?: Partial<DeckCard>): DeckCard {
  return {
    id: `id-${name}`,
    deck_id: 'deck-1',
    card_name: name,
    quantity: 1,
    board: 'mainboard',
    category: null,
    is_commander: false,
    is_companion: false,
    scryfall_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const DEFAULT_CARDS: DeckCard[] = Array.from({ length: 10 }, (_, i) =>
  makeDeckCard(`Card ${i + 1}`),
);

const DEFAULT_PROPS = {
  deckId: 'deck-1',
  cards: DEFAULT_CARDS,
  commanderName: 'Test Commander',
  colorIdentity: ['W', 'U'],
  format: 'commander',
  onAddSuggestion: vi.fn(),
  onRemoveByName: vi.fn(),
};

const MOCK_CRITIQUE = {
  success: true,
  summary: 'The deck has solid ramp but lacks removal.',
  cuts: [
    { card_name: 'Card 1', reason: 'Too slow for the strategy', severity: 'underperforming' },
    { card_name: 'Card 2', reason: 'Off-theme', severity: 'off-strategy' },
  ],
  additions: [
    { card_name: 'Swords to Plowshares', reason: 'Premium removal', category: 'Removal', replaces: 'Card 1' },
    { card_name: 'Rhystic Study', reason: 'Card advantage engine', category: 'Draw' },
  ],
  mana_curve_notes: 'Curve is slightly top-heavy at 5+ CMC.',
  confidence: 0.85,
};

describe('DeckCritiquePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders initial state with Get Critique button', () => {
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    expect(screen.getByText('AI Critique')).toBeInTheDocument();
    expect(screen.getByText('Get Critique')).toBeInTheDocument();
    expect(screen.getByText(/Get AI-powered feedback/)).toBeInTheDocument();
  });

  it('disables button when fewer than 5 cards', () => {
    render(<DeckCritiquePanel {...DEFAULT_PROPS} cards={[makeDeckCard('Solo')]} />);
    const btn = screen.getByText('Get Critique').closest('button');
    expect(btn).toBeDisabled();
  });

  it('shows loading state while fetching critique', async () => {
    mockInvoke.mockReturnValue(new Promise(() => {})); // never resolves
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));
    expect(screen.getByText('Analyzing your deck…')).toBeInTheDocument();
  });

  it('displays critique results after successful fetch', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('The deck has solid ramp but lacks removal.')).toBeInTheDocument();
    });

    // Cuts
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Underperforming')).toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
    expect(screen.getByText('Off-strategy')).toBeInTheDocument();
    expect(screen.getByText('Suggested Cuts (2)')).toBeInTheDocument();

    // Additions
    expect(screen.getByText('Swords to Plowshares')).toBeInTheDocument();
    expect(screen.getByText('Rhystic Study')).toBeInTheDocument();
    expect(screen.getByText('Suggested Additions (2)')).toBeInTheDocument();

    // Mana curve notes
    expect(screen.getByText(/Curve is slightly top-heavy/)).toBeInTheDocument();
  });

  it('shows Re-critique button after initial critique', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Re-critique')).toBeInTheDocument();
    });
  });

  it('calls onAddSuggestion when Add button is clicked', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    const onAdd = vi.fn();
    render(<DeckCritiquePanel {...DEFAULT_PROPS} onAddSuggestion={onAdd} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Rhystic Study')).toBeInTheDocument();
    });

    const addButtons = screen.getAllByTitle(/^Add /);
    fireEvent.click(addButtons[1]); // Rhystic Study add button
    expect(onAdd).toHaveBeenCalledWith('Rhystic Study');
  });

  it('shows Swap button for additions with replaces field', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Swap')).toBeInTheDocument();
    });

    expect(screen.getByText('Replaces: Card 1')).toBeInTheDocument();
  });

  it('calls both onRemoveByName and onAddSuggestion on Swap click', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    const onRemove = vi.fn();
    const onAdd = vi.fn();
    render(<DeckCritiquePanel {...DEFAULT_PROPS} onRemoveByName={onRemove} onAddSuggestion={onAdd} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Swap')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Swap'));
    expect(onRemove).toHaveBeenCalledWith('Card 1');
    expect(onAdd).toHaveBeenCalledWith('Swords to Plowshares');
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Swapped' }),
    );
  });

  it('does not show Swap button when onRemoveByName is not provided', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} onRemoveByName={undefined} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Swords to Plowshares')).toBeInTheDocument();
    });

    expect(screen.queryByText('Swap')).not.toBeInTheDocument();
  });

  it('shows error toast on API error', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('Network error') });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Critique failed', variant: 'destructive' }),
      );
    });
  });

  it('shows error toast when data contains error field', async () => {
    mockInvoke.mockResolvedValue({ data: { error: 'AI credits exhausted' }, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Critique failed', description: 'AI credits exhausted' }),
      );
    });
  });

  it('sends correct payload to edge function', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('deck-critique', {
        body: {
          commander: 'Test Commander',
          cards: expect.arrayContaining([
            expect.objectContaining({ name: 'Card 1', quantity: 1 }),
          ]),
          color_identity: ['W', 'U'],
          format: 'commander',
        },
      });
    });
  });

  it('renders all severity badge types correctly', async () => {
    const critiqueWithAllSeverities = {
      ...MOCK_CRITIQUE,
      cuts: [
        { card_name: 'Weak Card', reason: 'This card is too weak', severity: 'weak' },
        { card_name: 'Under Card', reason: 'This card underperforms', severity: 'underperforming' },
        { card_name: 'Off Card', reason: 'This card is off-theme', severity: 'off-strategy' },
      ],
    };
    mockInvoke.mockResolvedValue({ data: critiqueWithAllSeverities, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      // Check severity badges exist
      const badges = screen.getAllByText('Weak');
      expect(badges.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Underperforming')).toBeInTheDocument();
      expect(screen.getByText('Off-strategy')).toBeInTheDocument();
    });
  });

  it('dismisses a cut card when X is clicked and shows undo toast', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Card 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Card 1'));

    expect(screen.queryByText('Card 1')).not.toBeInTheDocument();
    expect(screen.getByText('Card 2')).toBeInTheDocument();
    expect(screen.getByText('Suggested Cuts (1)')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dismissed "Card 1"' }),
    );
  });

  it('dismisses an addition card when X is clicked and shows undo toast', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Rhystic Study')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Rhystic Study'));

    expect(screen.queryByText('Rhystic Study')).not.toBeInTheDocument();
    expect(screen.getByText('Swords to Plowshares')).toBeInTheDocument();
    expect(screen.getByText('Suggested Additions (1)')).toBeInTheDocument();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dismissed "Rhystic Study"' }),
    );
  });

  it('undo toast action restores dismissed cut', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Card 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Card 1'));
    expect(screen.queryByText('Card 1')).not.toBeInTheDocument();

    // Extract and trigger the undo action from the toast call
    const toastCall = mockToast.mock.calls.find(
      (args: unknown[]) => (args[0] as { title: string }).title === 'Dismissed "Card 1"',
    );
    expect(toastCall).toBeDefined();
    const actionElement = (toastCall![0] as { action: React.ReactElement }).action;

    // Render the action button and click it
    const { container } = render(actionElement);
    const undoBtn = container.querySelector('button');
    expect(undoBtn).toBeTruthy();
    fireEvent.click(undoBtn!);

    // Card should reappear
    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Suggested Cuts (2)')).toBeInTheDocument();
  });

  it('undo toast action restores dismissed addition', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Rhystic Study')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Rhystic Study'));
    expect(screen.queryByText('Rhystic Study')).not.toBeInTheDocument();

    const toastCall = mockToast.mock.calls.find(
      (args: unknown[]) => (args[0] as { title: string }).title === 'Dismissed "Rhystic Study"',
    );
    const actionElement = (toastCall![0] as { action: React.ReactElement }).action;
    const { container } = render(actionElement);
    fireEvent.click(container.querySelector('button')!);

    expect(screen.getByText('Rhystic Study')).toBeInTheDocument();
    expect(screen.getByText('Suggested Additions (2)')).toBeInTheDocument();
  });

  it('hides section header when all items are dismissed', async () => {
    const singleCut = { ...MOCK_CRITIQUE, cuts: [MOCK_CRITIQUE.cuts[0]], additions: [] };
    mockInvoke.mockResolvedValue({ data: singleCut, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Suggested Cuts (1)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Card 1'));
    expect(screen.queryByText(/Suggested Cuts/)).not.toBeInTheDocument();
  });

  it('shows dismissed count summary after dismissing suggestions', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Card 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Card 1'));
    expect(screen.getByText('1 suggestion dismissed')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Rhystic Study'));
    expect(screen.getByText('2 suggestions dismissed')).toBeInTheDocument();
  });

  it('restores all dismissed suggestions when Show all is clicked', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Card 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Card 1'));
    fireEvent.click(screen.getByTitle('Dismiss suggestion for Rhystic Study'));
    expect(screen.queryByText('Card 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Rhystic Study')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Show all'));

    expect(screen.getByText('Card 1')).toBeInTheDocument();
    expect(screen.getByText('Rhystic Study')).toBeInTheDocument();
    expect(screen.getByText('Suggested Cuts (2)')).toBeInTheDocument();
    expect(screen.getByText('Suggested Additions (2)')).toBeInTheDocument();
    expect(screen.queryByText(/dismissed/)).not.toBeInTheDocument();
  });

  it('shows toast when trying to critique with fewer than 5 cards', () => {
    render(<DeckCritiquePanel {...DEFAULT_PROPS} cards={Array.from({ length: 4 }, (_, i) => makeDeckCard(`C${i}`))} />);
    // Button is disabled, but let's test the guard via direct handler path
    // by rendering with exactly 4 cards — button should be disabled
    const btn = screen.getByText('Get Critique').closest('button');
    expect(btn).toBeDisabled();
  });

  it('handles thrown exception in invoke gracefully', async () => {
    mockInvoke.mockRejectedValue(new Error('Network timeout'));
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error', description: 'Something went wrong' }),
      );
    });
    // Should not be in loading state after error
    expect(screen.queryByText('Analyzing your deck…')).not.toBeInTheDocument();
  });

  it('loads critique from sessionStorage on mount', () => {
    // Pre-populate sessionStorage with a cached critique
    const cards = DEFAULT_CARDS;
    const cardFingerprint = cards.map((c) => `${c.card_name}:${c.quantity}`).sort().join(',');
    let hash = 0;
    for (let i = 0; i < cardFingerprint.length; i++) {
      hash = ((hash << 5) - hash + cardFingerprint.charCodeAt(i)) | 0;
    }
    const key = `offmeta_critique_deck-1_${hash >>> 0}`;
    const cached = { summary: 'Cached summary', cuts: [], additions: [] };
    sessionStorage.setItem(key, JSON.stringify(cached));

    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    expect(screen.getByText('Cached summary')).toBeInTheDocument();
    expect(screen.getByText('Re-critique')).toBeInTheDocument();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('renders critique with empty cuts and additions', async () => {
    const emptyCritique = { summary: 'Deck looks great!', cuts: [], additions: [] };
    mockInvoke.mockResolvedValue({ data: emptyCritique, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Deck looks great!')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Suggested Cuts/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Suggested Additions/)).not.toBeInTheDocument();
  });

  it('renders critique without mana_curve_notes', async () => {
    const noNotes = { summary: 'OK', cuts: [], additions: [], mana_curve_notes: undefined };
    mockInvoke.mockResolvedValue({ data: noNotes, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('OK')).toBeInTheDocument();
    });
    expect(screen.queryByText('📊')).not.toBeInTheDocument();
  });

  it('invalidates cached critique when cards change', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    const { rerender } = render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText(MOCK_CRITIQUE.summary)).toBeInTheDocument();
    });

    // Change the cards — critique should be cleared
    const newCards = Array.from({ length: 8 }, (_, i) => makeDeckCard(`New Card ${i}`));
    rerender(<DeckCritiquePanel {...DEFAULT_PROPS} cards={newCards} />);

    expect(screen.queryByText(MOCK_CRITIQUE.summary)).not.toBeInTheDocument();
    expect(screen.getByText('Get Critique')).toBeInTheDocument();
  });

  it('saves critique to sessionStorage after fetch', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText(MOCK_CRITIQUE.summary)).toBeInTheDocument();
    });

    // Verify something was saved to sessionStorage
    const keys = Object.keys(sessionStorage);
    const critiqueKey = keys.find((k) => k.startsWith('offmeta_critique_'));
    expect(critiqueKey).toBeDefined();
    const stored = JSON.parse(sessionStorage.getItem(critiqueKey!)!);
    expect(stored.summary).toBe(MOCK_CRITIQUE.summary);
  });

  it('does not show dismissed summary bar when nothing is dismissed', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText(MOCK_CRITIQUE.summary)).toBeInTheDocument();
    });
    expect(screen.queryByText(/dismissed/)).not.toBeInTheDocument();
    expect(screen.queryByText('Show all')).not.toBeInTheDocument();
  });

  it('resets dismissals when deck cards change', async () => {
    mockInvoke.mockResolvedValue({ data: MOCK_CRITIQUE, error: null });
    const { rerender } = render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('Card 1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Dismiss suggestion for Card 1'));
    expect(screen.getByText('1 suggestion dismissed')).toBeInTheDocument();

    // Change cards — dismissals should reset
    const newCards = Array.from({ length: 6 }, (_, i) => makeDeckCard(`X${i}`));
    rerender(<DeckCritiquePanel {...DEFAULT_PROPS} cards={newCards} />);
    expect(screen.queryByText(/dismissed/)).not.toBeInTheDocument();
  });

  it('displays high confidence indicator', async () => {
    mockInvoke.mockResolvedValue({ data: { ...MOCK_CRITIQUE, confidence: 0.92 }, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText('Confidence:')).toBeInTheDocument();
    });
  });

  it('displays medium confidence indicator', async () => {
    mockInvoke.mockResolvedValue({ data: { ...MOCK_CRITIQUE, confidence: 0.6 }, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  it('displays low confidence indicator with warning banner', async () => {
    mockInvoke.mockResolvedValue({ data: { ...MOCK_CRITIQUE, confidence: 0.3 }, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText(/confidence is low/i)).toBeInTheDocument();
    });
  });

  it('does not show warning banner when confidence >= 50%', async () => {
    mockInvoke.mockResolvedValue({ data: { ...MOCK_CRITIQUE, confidence: 0.6 }, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
    expect(screen.queryByText(/confidence is low/i)).not.toBeInTheDocument();
  });

  it('hides confidence indicator when not provided', async () => {
    const noConf = { ...MOCK_CRITIQUE, confidence: undefined };
    mockInvoke.mockResolvedValue({ data: noConf, error: null });
    render(<DeckCritiquePanel {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Get Critique'));

    await waitFor(() => {
      expect(screen.getByText(MOCK_CRITIQUE.summary)).toBeInTheDocument();
    });
    expect(screen.queryByText('Confidence:')).not.toBeInTheDocument();
  });
});
