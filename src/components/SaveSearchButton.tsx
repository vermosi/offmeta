/**
 * Bookmark toggle button for saving/unsaving a search.
 * Only renders when user is logged in.
 */

import { useState, useCallback, useEffect } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SaveSearchButtonProps {
  naturalQuery: string;
  scryfallQuery?: string;
}

export function SaveSearchButton({ naturalQuery, scryfallQuery }: SaveSearchButtonProps) {
  const { user } = useAuth();
  const [savedId, setSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if this query is already saved
  useEffect(() => {
    if (!user || !naturalQuery.trim()) {
      setSavedId(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', user.id)
      .eq('natural_query', naturalQuery.trim())
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSavedId(data?.id ?? null);
      });
    return () => { cancelled = true; };
  }, [user, naturalQuery]);

  const toggle = useCallback(async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      if (savedId) {
        await supabase.from('saved_searches').delete().eq('id', savedId);
        setSavedId(null);
        toast.success('Search removed');
      } else {
        const { data, error } = await supabase
          .from('saved_searches')
          .insert({
            user_id: user.id,
            natural_query: naturalQuery.trim(),
            scryfall_query: scryfallQuery ?? null,
          })
          .select('id')
          .single();
        if (error) throw error;
        setSavedId(data.id);
        toast.success('Search saved!');
      }
    } catch (_err) {
      toast.error(savedId ? 'Failed to remove' : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }, [user, savedId, naturalQuery, scryfallQuery, loading]);

  if (!user) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={loading || !naturalQuery.trim()}
      className="h-10 px-2.5 gap-1.5"
      title={savedId ? 'Remove from saved' : 'Save this search'}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : savedId ? (
        <BookmarkCheck className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Bookmark className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{savedId ? 'Saved' : 'Save'}</span>
    </Button>
  );
}
