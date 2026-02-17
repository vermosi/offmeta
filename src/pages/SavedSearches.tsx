/**
 * Saved searches page — lists bookmarked queries for logged-in users.
 * Supports inline label editing, bulk delete, and filter restore.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  Search,
  Trash2,
  Loader2,
  Bookmark,
  ArrowLeft,
  Pencil,
  Check,
  X,
  CheckSquare,
} from 'lucide-react';

interface SavedSearch {
  id: string;
  natural_query: string;
  scryfall_query: string | null;
  label: string | null;
  filters_snapshot: Record<string, unknown> | null;
  created_at: string;
}

const SavedSearches = () => {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const isBulkMode = selected.size > 0;

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
        if (!error && data) setSearches(data as SavedSearch[]);
        setLoading(false);
      });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('saved_searches').delete().eq('id', id);
    if (error) {
      toast.error(t('savedSearches.deleteFailed'));
    } else {
      setSearches((prev) => prev.filter((s) => s.id !== id));
      setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
      toast.success(t('savedSearches.removed'));
    }
    setDeleting(null);
  }, [t]);

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    const ids = Array.from(selected);
    const { error } = await supabase.from('saved_searches').delete().in('id', ids);
    if (error) {
      toast.error(t('savedSearches.deleteSelectedFailed'));
    } else {
      setSearches((prev) => prev.filter((s) => !ids.includes(s.id)));
      setSelected(new Set());
      toast.success(`Deleted ${ids.length} ${ids.length === 1 ? t('savedSearches.search') : t('savedSearches.searches')}`);
    }
    setBulkDeleting(false);
  }, [selected, t]);

  const handleRun = useCallback((query: string, filters?: Record<string, unknown> | null) => {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      if (Array.isArray(filters.colors) && filters.colors.length > 0) {
        params.set('colors', (filters.colors as string[]).join(','));
      }
      if (Array.isArray(filters.types) && filters.types.length > 0) {
        params.set('types', (filters.types as string[]).join(','));
      }
      if (filters.sortBy && filters.sortBy !== 'name-asc') {
        params.set('sort', filters.sortBy as string);
      }
    }
    navigate(`/?${params.toString()}`);
  }, [navigate]);

  const startEditing = useCallback((search: SavedSearch) => {
    setEditingId(search.id);
    setEditValue(search.label || '');
  }, []);

  const saveLabel = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editValue.trim() || null;
    const { error } = await supabase
      .from('saved_searches')
      .update({ label: trimmed })
      .eq('id', editingId);
    if (error) {
      toast.error(t('savedSearches.labelFailed'));
    } else {
      setSearches((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, label: trimmed } : s)),
      );
    }
    setEditingId(null);
  }, [editingId, editValue, t]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === searches.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(searches.map((s) => s.id)));
    }
  }, [selected.size, searches]);

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
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">{t('savedSearches.title')}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {searches.length} {t('savedSearches.saved')} {searches.length === 1 ? t('savedSearches.search') : t('savedSearches.searches')}
              </p>
            </div>
          </div>

          {/* Bulk actions bar */}
          {searches.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1.5 text-xs text-muted-foreground"
                onClick={toggleSelectAll}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                {selected.size === searches.length ? t('savedSearches.deselectAll') : t('savedSearches.selectAll')}
              </Button>
              {isBulkMode && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {selected.size} {t('savedSearches.selected')}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 px-2.5 gap-1.5 text-xs"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                  >
                    {bulkDeleting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                    {t('savedSearches.deleteSelected')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setSelected(new Set())}
                  >
                    {t('savedSearches.cancel')}
                  </Button>
                </>
              )}
            </div>
          )}

          {searches.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Bookmark className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground">{t('savedSearches.empty')}</p>
              <p className="text-sm text-muted-foreground">
                {t('savedSearches.emptyDesc')}
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
                {t('savedSearches.startSearching')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {searches.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
                >
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={() => toggleSelect(s.id)}
                    aria-label={`Select "${s.label || s.natural_query}"`}
                    className="shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    {editingId === s.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveLabel();
                            if (e.key === 'Escape') cancelEditing();
                          }}
                          placeholder={t('savedSearches.addLabel')}
                          className="h-7 text-sm"
                        />
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={saveLabel}>
                          <Check className="h-3.5 w-3.5 text-primary" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={cancelEditing}>
                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {s.label && (
                          <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {s.label}
                          </span>
                        )}
                        <button
                          onClick={() => startEditing(s)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted"
                          aria-label={t('savedSearches.editLabel')}
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                    <p className="font-medium text-sm truncate mt-0.5">{s.natural_query}</p>
                    {s.scryfall_query && (
                      <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
                        {s.scryfall_query}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </p>
                      {s.filters_snapshot && (
                        <span className="text-[10px] text-primary/70">{t('savedSearches.filtersSaved')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 gap-1.5"
                      onClick={() => handleRun(s.natural_query, s.filters_snapshot)}
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs">{t('savedSearches.run')}</span>
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
