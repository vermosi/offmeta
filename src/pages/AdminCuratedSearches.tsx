/**
 * Admin panel for managing curated search pages.
 * CRUD: create, edit, toggle active, delete, preview.
 * Requires admin role.
 * @module pages/AdminCuratedSearches
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Save,
  X,
  Search,
  Filter,
  Sparkles,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface CuratedSearch {
  id: string;
  slug: string;
  title: string;
  description: string;
  scryfall_query: string;
  natural_query: string;
  category: string;
  source: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type FormData = Omit<CuratedSearch, 'id' | 'created_at' | 'updated_at'>;

const CATEGORIES = [
  'commander',
  'budget',
  'tribal',
  'mechanics',
  'format',
  'colors',
  'general',
] as const;

const EMPTY_FORM: FormData = {
  slug: '',
  title: '',
  description: '',
  scryfall_query: '',
  natural_query: '',
  category: 'general',
  source: 'editorial',
  priority: 0.6,
  is_active: true,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export default function AdminCuratedSearches() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasRole: isAdmin, isLoading: roleLoading } = useUserRole('admin');
  const navigate = useNavigate();

  const [searches, setSearches] = useState<CuratedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user || !isAdmin) navigate('/');
    }
  }, [user, isAdmin, authLoading, roleLoading, navigate]);

  const fetchSearches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('curated_searches')
      .select('*')
      .order('priority', { ascending: false });

    if (error) {
      toast.error('Failed to load curated searches');
    } else {
      setSearches((data ?? []) as CuratedSearch[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchSearches();
  }, [isAdmin, fetchSearches]);

  // Filtered list
  const filtered = searches.filter((s) => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    if (sourceFilter !== 'all' && s.source !== sourceFilter) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.natural_query.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Toggle active
  const toggleActive = async (id: string, current: boolean) => {
    const prev = [...searches];
    setSearches((s) => s.map((x) => (x.id === id ? { ...x, is_active: !current } : x)));

    const { error } = await supabase
      .from('curated_searches')
      .update({ is_active: !current })
      .eq('id', id);

    if (error) {
      toast.error('Failed to toggle status');
      setSearches(prev);
    } else {
      toast.success(!current ? 'Activated' : 'Deactivated');
    }
  };

  // Open create/edit dialog
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (s: CuratedSearch) => {
    setEditingId(s.id);
    setForm({
      slug: s.slug,
      title: s.title,
      description: s.description,
      scryfall_query: s.scryfall_query,
      natural_query: s.natural_query,
      category: s.category,
      source: s.source,
      priority: s.priority,
      is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  // Auto-generate slug from natural_query
  const updateNaturalQuery = (val: string) => {
    setForm((f) => ({
      ...f,
      natural_query: val,
      slug: editingId ? f.slug : slugify(val),
      title: editingId
        ? f.title
        : val
            .trim()
            .split(/\s+/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ') + ' for MTG',
    }));
  };

  // Save
  const handleSave = async () => {
    if (!form.slug || !form.title || !form.natural_query) {
      toast.error('Slug, title, and natural query are required');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('curated_searches')
          .update({
            slug: form.slug,
            title: form.title,
            description: form.description,
            scryfall_query: form.scryfall_query,
            natural_query: form.natural_query,
            category: form.category,
            source: form.source,
            priority: form.priority,
            is_active: form.is_active,
          })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Updated');
      } else {
        const { error } = await supabase
          .from('curated_searches')
          .insert([form]);
        if (error) throw error;
        toast.success('Created');
      }
      setDialogOpen(false);
      fetchSearches();
    } catch (err: unknown) {
      toast.error(`Save failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from('curated_searches')
      .delete()
      .eq('id', deleteId);
    if (error) {
      toast.error('Delete failed');
    } else {
      toast.success('Deleted');
      setSearches((s) => s.filter((x) => x.id !== deleteId));
    }
    setDeleteId(null);
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const autoCount = searches.filter((s) => s.source === 'auto').length;
  const editorialCount = searches.filter((s) => s.source === 'editorial').length;
  const activeCount = searches.filter((s) => s.is_active).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-main py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/analytics')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Curated Searches
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searches.length} total · {activeCount} active · {editorialCount} editorial · {autoCount} auto-promoted
              </p>
            </div>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> New Search
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by title, slug, or query…"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[140px]">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="editorial">Editorial</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No curated searches match your filters.</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground text-left">
                    <th className="px-4 py-2.5 font-medium">Title</th>
                    <th className="px-3 py-2.5 font-medium hidden md:table-cell">Category</th>
                    <th className="px-3 py-2.5 font-medium hidden lg:table-cell">Source</th>
                    <th className="px-3 py-2.5 font-medium text-center">Priority</th>
                    <th className="px-3 py-2.5 font-medium text-center">Status</th>
                    <th className="px-3 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr key={s.id} className={`transition-colors hover:bg-muted/30 ${!s.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground text-sm">{s.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">/{s.slug}</div>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs capitalize">
                          {s.category}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <Badge
                          variant={s.source === 'editorial' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {s.source}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                        {s.priority}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => toggleActive(s.id, s.is_active)}
                          className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
                          title={s.is_active ? 'Click to deactivate' : 'Click to activate'}
                        >
                          {s.is_active ? (
                            <Eye className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className={s.is_active ? 'text-green-500' : 'text-muted-foreground'}>
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            asChild
                            title="Preview"
                          >
                            <Link to={`/search/${s.slug}`} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(s)}
                            title="Edit"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(s.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Curated Search' : 'New Curated Search'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Natural Query</label>
                <Input
                  value={form.natural_query}
                  onChange={(e) => updateNaturalQuery(e.target.value)}
                  placeholder="e.g. best lifegain cards commander"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Slug</label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="best-lifegain-cards"
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Best Lifegain Cards for MTG"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="SEO description…"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Scryfall Query <span className="text-muted-foreground/60">(optional — auto-translated if blank)</span>
                </label>
                <Input
                  value={form.scryfall_query}
                  onChange={(e) => setForm((f) => ({ ...f, scryfall_query: e.target.value }))}
                  placeholder="o:life o:gain f:commander"
                  className="font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
                  <Select
                    value={form.source}
                    onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editorial">Editorial</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                {editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Curated Search?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently remove this curated search page. This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
