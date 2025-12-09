import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Deck, createEmptyDeck } from '@/lib/deck';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface SavedDeck {
  id: string;
  name: string;
  description: string | null;
  format: string;
  commander_name: string | null;
  mainboard: Json;
  sideboard: Json;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export function useDeckPersistence() {
  const { user } = useAuth();
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDecks = useCallback(async () => {
    if (!user) {
      setSavedDecks([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedDecks((data || []) as SavedDeck[]);
    } catch (error) {
      console.error('Failed to fetch decks:', error);
      toast.error('Failed to load saved decks');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const saveDeck = useCallback(async (deck: Deck, name?: string): Promise<string | null> => {
    if (!user) {
      toast.error('Please sign in to save decks');
      return null;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('decks')
        .insert({
          user_id: user.id,
          name: name || deck.name || 'Untitled Deck',
          mainboard: JSON.parse(JSON.stringify(deck.mainboard)) as Json,
          sideboard: JSON.parse(JSON.stringify(deck.sideboard)) as Json,
          format: 'commander',
          is_public: false,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('Deck saved!');
      await fetchDecks();
      return data.id;
    } catch (error) {
      console.error('Failed to save deck:', error);
      toast.error('Failed to save deck');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [user, fetchDecks]);

  const updateDeck = useCallback(async (deckId: string, deck: Deck): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to update decks');
      return false;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('decks')
        .update({
          name: deck.name,
          mainboard: JSON.parse(JSON.stringify(deck.mainboard)) as Json,
          sideboard: JSON.parse(JSON.stringify(deck.sideboard)) as Json,
        })
        .eq('id', deckId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Deck updated!');
      await fetchDecks();
      return true;
    } catch (error) {
      console.error('Failed to update deck:', error);
      toast.error('Failed to update deck');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user, fetchDecks]);

  const deleteDeck = useCallback(async (deckId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Deck deleted');
      await fetchDecks();
      return true;
    } catch (error) {
      console.error('Failed to delete deck:', error);
      toast.error('Failed to delete deck');
      return false;
    }
  }, [user, fetchDecks]);

  const loadDeck = useCallback((savedDeck: SavedDeck): Deck => {
    const mainboard = Array.isArray(savedDeck.mainboard) ? savedDeck.mainboard : [];
    const sideboard = Array.isArray(savedDeck.sideboard) ? savedDeck.sideboard : [];
    return {
      name: savedDeck.name,
      mainboard: mainboard as any,
      sideboard: sideboard as any,
    };
  }, []);

  return {
    savedDecks,
    isLoading,
    isSaving,
    saveDeck,
    updateDeck,
    deleteDeck,
    loadDeck,
    refreshDecks: fetchDecks,
  };
}
