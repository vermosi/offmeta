/**
 * My Decks page – lists all user decks with create/delete/import.
 * Anonymous sign-in is used automatically so auth is not required to test.
 * @module pages/DeckBuilder
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Layers, Crown, Upload, Globe, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useDecks, useDeckMutations, ensureSession } from '@/hooks/useDeck';
import { DeckImportModal } from '@/components/deckbuilder/DeckImportModal';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';
import { FORMAT_LABELS } from '@/data/formats';

const COLOR_MAP: Record<string, string> = {
  W: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  U: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  B: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300',
  R: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  G: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
};

export default function DeckBuilder() {
  const { t } = useTranslation();
  const { data: decks, isLoading } = useDecks();
  const { createDeck, deleteDeck, updateDeck } = useDeckMutations();
  const navigate = useNavigate();
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      await ensureSession();
      const deck = await createDeck.mutateAsync({});
      navigate(`/deckbuilder/${deck.id}`);
    } catch (err) {
      console.error('[DeckBuilder] Failed to create deck:', err);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) deleteDeck.mutate(deleteTarget);
    setDeleteTarget(null);
  };

  const handleImport = async (data: {
    name?: string; format?: string; commander?: string | null;
    colorIdentity?: string[]; cards: { name: string; quantity: number }[];
  }) => {
    try {
      await ensureSession();
      const deck = await createDeck.mutateAsync({
        name: data.name || 'Imported Deck',
        format: data.format || 'commander',
      });
      if (data.commander || data.colorIdentity) {
        updateDeck.mutate({
          id: deck.id,
          ...(data.commander && { commander_name: data.commander }),
          ...(data.colorIdentity && { color_identity: data.colorIdentity }),
        });
      }
      navigate(`/deckbuilder/${deck.id}`, {
        state: { importCards: data.cards, importCommander: data.commander },
      });
    } catch (err) {
      console.error('[DeckBuilder] Failed to import deck:', err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container-main py-8 sm:py-12">
        <div className="flex items-center justify-between mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('deck.title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('deck.subtitle')}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button onClick={() => setImportOpen(true)} variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('deck.import')}</span>
            </Button>
            <Button onClick={handleCreate} disabled={createDeck.isPending} className="gap-1.5" size="sm">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('deck.newDeck')}</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="surface-elevated p-5 h-32 shimmer rounded-xl" />)}
          </div>
        ) : !decks?.length ? (
          <div className="surface-elevated p-8 text-center">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">{t('deck.noDecks')}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setImportOpen(true)} variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />{t('deck.importDeck')}
              </Button>
              <Button onClick={handleCreate} disabled={createDeck.isPending} className="gap-2">
                <Plus className="h-4 w-4" />{t('deck.createDeck')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <Link key={deck.id} to={`/deckbuilder/${deck.id}`}
                className="group surface-elevated p-5 card-hover flex flex-col gap-3 relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold truncate group-hover:text-accent transition-colors">{deck.name}</h3>
                      {deck.is_public ? (
                        <Badge variant="info" size="sm" className="gap-0.5 shrink-0">
                          <Globe className="h-2.5 w-2.5" />Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" size="sm" className="gap-0.5 shrink-0 text-muted-foreground">
                          <Lock className="h-2.5 w-2.5" />Private
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {FORMAT_LABELS[deck.format] || deck.format} · {deck.card_count} {t('deck.cards')}
                    </p>
                  </div>
                  <button onClick={(e) => handleDelete(e, deck.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete deck">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {deck.commander_name && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Crown className="h-3.5 w-3.5 text-accent" /><span className="truncate">{deck.commander_name}</span>
                  </div>
                )}
                {deck.color_identity.length > 0 && (
                  <div className="flex gap-1">
                    {deck.color_identity.map((c) => (
                      <span key={c} className={cn('h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center', COLOR_MAP[c] || 'bg-muted text-muted-foreground')}>{c}</span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-auto">
                  {t('deck.updated')} {new Date(deck.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <DeckImportModal open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      {/* Styled delete confirmation — replaces window.confirm() */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deck.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The deck and all its cards will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
