/**
 * Admin panel for managing AI SEO pages.
 * List, preview, publish/unpublish, regenerate, delete.
 * Requires admin role.
 * @module pages/AdminSeoPages
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Search,
  Plus,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SeoPage {
  id: string;
  query: string;
  slug: string;
  status: string;
  content_json: {
    tldr: string;
    cards?: Array<{ name: string }>;
    faqs?: Array<{ question: string }>;
  };
  created_at: string;
  published_at: string | null;
  updated_at: string;
}

export default function AdminSeoPages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [newQuery, setNewQuery] = useState('');

  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-seo-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_pages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as SeoPage[];
    },
    enabled: role === 'admin',
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, publish }: { id: string; publish: boolean }) => {
      const { error } = await supabase
        .from('seo_pages')
        .update({
          status: publish ? 'published' : 'draft',
          published_at: publish ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seo-pages'] });
      toast.success('Status updated');
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deletePage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seo_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seo-pages'] });
      toast.success('Page deleted');
    },
    onError: () => toast.error('Failed to delete'),
  });

  const regeneratePage = useMutation({
    mutationFn: async (query: string) => {
      const { data, error } = await supabase.functions.invoke(
        'generate-seo-page',
        {
          body: { query, publish: true, regenerate: true },
        },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-seo-pages'] });
      toast.success(`Regenerated: ${data?.slug}`);
    },
    onError: () => toast.error('Failed to regenerate'),
  });

  const generateNew = useCallback(async () => {
    if (!newQuery.trim() || newQuery.length < 3) {
      toast.error('Query must be at least 3 characters');
      return;
    }
    regeneratePage.mutate(newQuery.trim());
    setNewQuery('');
  }, [newQuery, regeneratePage]);

  if (roleLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user || role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Admin access required.
        </div>
      </div>
    );
  }

  const filtered = (pages ?? []).filter(
    (p) =>
      !search.trim() ||
      p.query.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const published = filtered.filter((p) => p.status === 'published').length;
  const drafts = filtered.filter((p) => p.status === 'draft').length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/analytics')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-accent" />
              AI SEO Pages
            </h1>
            <p className="text-sm text-muted-foreground">
              {published} published · {drafts} drafts
            </p>
          </div>
        </div>

        {/* Generate new */}
        <div className="flex gap-2 mb-6">
          <Input
            value={newQuery}
            onChange={(e) => setNewQuery(e.target.value)}
            placeholder="Enter query to generate new page..."
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && generateNew()}
          />
          <Button
            onClick={generateNew}
            disabled={regeneratePage.isPending || newQuery.length < 3}
            size="sm"
          >
            {regeneratePage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Generate
          </Button>
        </div>

        {/* Filter */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter pages..."
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="space-y-2">
          {filtered.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50 hover:border-border transition-colors"
            >
              {/* Status badge */}
              <Badge
                variant={page.status === 'published' ? 'default' : 'outline'}
                className="shrink-0 text-[10px] w-16 justify-center"
              >
                {page.status}
              </Badge>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{page.query}</p>
                <p className="text-xs text-muted-foreground">
                  {page.content_json?.cards?.length ?? 0} cards ·{' '}
                  {page.content_json?.faqs?.length ?? 0} FAQs · /ai/{page.slug}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => window.open(`/ai/${page.slug}`, '_blank')}
                  title="Preview"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    toggleStatus.mutate({
                      id: page.id,
                      publish: page.status !== 'published',
                    })
                  }
                  title={
                    page.status === 'published' ? 'Unpublish' : 'Publish'
                  }
                >
                  {page.status === 'published' ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => regeneratePage.mutate(page.query)}
                  disabled={regeneratePage.isPending}
                  title="Regenerate"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${regeneratePage.isPending ? 'animate-spin' : ''}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${page.query}"?`)) {
                      deletePage.mutate(page.id);
                    }
                  }}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
