/**
 * Keyboard shortcuts for the deck editor.
 * Extracted from DeckEditor to keep the page component focused on layout.
 * @module hooks/useDeckKeyboardShortcuts
 */

import { useEffect } from 'react';
import type { DeckCard } from '@/hooks/useDeck';
import type { useUndoRedo } from '@/hooks/useUndoRedo';
import { toast } from '@/hooks/useToast';

interface UseDeckKeyboardShortcutsOpts {
  user: { id: string } | null;
  selectedCardId: string | null;
  cards: DeckCard[];
  undoRedo: ReturnType<typeof useUndoRedo>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onSelectCard: (id: string | null) => void;
  onToggleShortcuts: (open?: boolean) => void;
  onRemove: (cardId: string) => void;
  onSetQuantity: (cardId: string, qty: number) => void;
  onMoveToSideboard: (cardId: string, toSideboard: boolean) => void;
  onMoveToMaybeboard: (cardId: string) => void;
}

export function useDeckKeyboardShortcuts({
  user, selectedCardId, cards, undoRedo, searchInputRef,
  onSelectCard, onToggleShortcuts,
  onRemove, onSetQuantity, onMoveToSideboard, onMoveToMaybeboard,
}: UseDeckKeyboardShortcutsOpts) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      // Ctrl+Z / Ctrl+Shift+Z work even in inputs
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoRedo.undo().then((a) => { if (a) toast({ title: `Undo: ${a.label}` }); });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        undoRedo.redo().then((a) => { if (a) toast({ title: `Redo: ${a.label}` }); });
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        undoRedo.redo().then((a) => { if (a) toast({ title: `Redo: ${a.label}` }); });
        return;
      }

      if (e.key === '?' && !isInput) { e.preventDefault(); onToggleShortcuts(); return; }
      if (isInput || !user) return;
      if (e.key === '/') { e.preventDefault(); searchInputRef.current?.focus(); return; }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCardId) {
        e.preventDefault();
        onRemove(selectedCardId);
        onSelectCard(null);
        return;
      }

      if ((e.key === '+' || e.key === '=') && selectedCardId) {
        e.preventDefault();
        const card = cards.find(c => c.id === selectedCardId);
        if (card) onSetQuantity(selectedCardId, card.quantity + 1);
        return;
      }

      if (e.key === '-' && selectedCardId) {
        e.preventDefault();
        const card = cards.find(c => c.id === selectedCardId);
        if (card) {
          if (card.quantity <= 1) {
            onRemove(selectedCardId);
            onSelectCard(null);
          } else {
            onSetQuantity(selectedCardId, card.quantity - 1);
          }
        }
        return;
      }

      if (e.key === 'S' && e.shiftKey && selectedCardId) {
        e.preventDefault();
        onMoveToSideboard(selectedCardId, true);
        onSelectCard(null);
        return;
      }

      if (e.key === 'M' && e.shiftKey && selectedCardId) {
        e.preventDefault();
        onMoveToMaybeboard(selectedCardId);
        onSelectCard(null);
        return;
      }

      if (e.key === 'Escape') { onSelectCard(null); onToggleShortcuts(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, selectedCardId, cards, undoRedo, searchInputRef, onSelectCard, onToggleShortcuts, onRemove, onSetQuantity, onMoveToSideboard, onMoveToMaybeboard]);
}
