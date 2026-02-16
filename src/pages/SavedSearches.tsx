/**
 * Saved searches page — lists bookmarked queries for logged-in users.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Search,
  Trash2,
  Loader2,
  Bookmark,
  ArrowLeft,
} from 'lucide-react';

interface SavedSearch {
  id: string;
  natural_query: string;
  scryfall_query: string | null;
  label: string | null;
  created_at: string;
}

const SavedSearches = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/', { replace: true });
      return;
    }
    supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setSearches(data);
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('saved_searches').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete');
    } else {
      setSearches((prev) => prev.filter((s) => s.id !== id));
      toast.success('Removed');
    }
    setDeleting(null);
  }, []);

  const handleRun = useCallback((query: string) => {
    navigate(`/?q=${encodeURIComponent(query)}`);
  }, [navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container-main py-8 sm:py-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Saved Searches</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {searches.length} saved {searches.length === 1 ? 'search' : 'searches'}
              </p>
            </div>
          </div>

          {searches.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">No saved searches yet.</p>
              <p className="text-sm text-muted-foreground">
                Search for cards and click the bookmark icon to save your favorite queries.
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Start Searching
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {searches.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.natural_query}</p>
                    {s.scryfall_query && (
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        {s.scryfall_query}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 gap-1.5"
                      onClick={() => handleRun(s.natural_query)}
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs">Run</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                    >
                      {deleting === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SavedSearches;
