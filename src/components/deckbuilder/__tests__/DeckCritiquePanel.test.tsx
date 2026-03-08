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
};

describe('DeckCritiquePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
