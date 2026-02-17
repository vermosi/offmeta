/**
 * My Decks page – lists all user decks with create/delete functionality.
 * @module pages/DeckBuilder
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Layers, Crown } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useDecks, useDeckMutations } from '@/hooks/useDeck';
import { AuthModal } from '@/components/AuthModal';
import { cn } from '@/lib/core/utils';

const FORMAT_LABELS: Record<string, string> = {
  commander: 'Commander',
  standard: 'Standard',
  modern: 'Modern',
  pioneer: 'Pioneer',
  pauper: 'Pauper',
  legacy: 'Legacy',
  vintage: 'Vintage',
};

const COLOR_MAP: Record<string, string> = {
  W: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  U: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  B: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300',
  R: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  G: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

export default function DeckBuilder() {
  const { user } = useAuth();
  const { data: decks, isLoading } = useDecks();
  const { createDeck, deleteDeck } = useDeckMutations();
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleCreate = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const deck = await createDeck.mutateAsync({});
    navigate(`/deckbuilder/${deck.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this deck? This cannot be undone.')) {
      deleteDeck.mutate(id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container-main py-8 sm:py-12">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Deck Builder</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build, analyze, and optimize your MTG decks with AI assistance.
            </p>
          </div>
          <Button onClick={handleCreate} disabled={createDeck.isPending} className="gap-2">
            <Plus className="h-4 w-4" />
            New Deck
          </Button>
        </div>

        {/* Deck grid */}
        {!user ? (
          <div className="surface-elevated p-8 text-center">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Sign in to start building decks.</p>
            <Button onClick={() => setAuthModalOpen(true)} variant="outline">
              Sign In
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="surface-elevated p-5 h-32 shimmer rounded-xl" />
            ))}
          </div>
        ) : !decks?.length ? (
          <div className="surface-elevated p-8 text-center">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No decks yet. Create your first one!</p>
            <Button onClick={handleCreate} disabled={createDeck.isPending} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Deck
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <Link
                key={deck.id}
                to={`/deckbuilder/${deck.id}`}
                className="group surface-elevated p-5 card-hover flex flex-col gap-3 relative"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate group-hover:text-accent transition-colors">
                      {deck.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {FORMAT_LABELS[deck.format] || deck.format} · {deck.card_count} cards
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, deck.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete deck"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Commander */}
                {deck.commander_name && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Crown className="h-3.5 w-3.5 text-accent" />
                    <span className="truncate">{deck.commander_name}</span>
                  </div>
                )}

                {/* Color identity pips */}
                {deck.color_identity.length > 0 && (
                  <div className="flex gap-1">
                    {deck.color_identity.map((c) => (
                      <span
                        key={c}
                        className={cn(
                          'h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center',
                          COLOR_MAP[c] || 'bg-muted text-muted-foreground',
                        )}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground mt-auto">
                  Updated {new Date(deck.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
