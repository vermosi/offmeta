/**
 * Concept Manager — the editing interface for OffMeta's semantic knowledge
 * graph. Concepts (ontology tags), their relationships and the approaches
 * players use to solve the problem are all editable here by admins.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';
import { LANDING_PAGES } from '@/lib/landing';
import { ConsoleHeading, ConsolePanel, EmptyRow, StatusTag } from '../components/console-ui';

interface OntologyTag {
  tag_key: string;
  dimension: string;
  label: string;
  description: string | null;
  signatures: string[];
  exclusions: string[];
  priority: number;
  is_active: boolean;
}

interface OntologyEdge {
  id: string;
  from_tag: string;
  to_tag: string;
  relation: string;
  weight: number;
}

interface TagApproach {
  tag_key: string;
  approach_key: string;
  weight: number;
}

type Mode = 'concepts' | 'relationships' | 'approaches';

const slugFromLabel = (label: string) =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function ConceptManager({ mode }: { mode: Mode }) {
  const [tags, setTags] = useState<OntologyTag[]>([]);
  const [edges, setEdges] = useState<OntologyEdge[]>([]);
  const [approaches, setApproaches] = useState<TagApproach[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<OntologyTag | null>(null);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [tagRes, edgeRes, approachRes, countRes] = await Promise.allSettled([
      supabase
        .from('ontology_tags')
        .select('tag_key, dimension, label, description, signatures, exclusions, priority, is_active')
        .order('dimension')
        .order('label'),
      supabase.from('ontology_edges').select('id, from_tag, to_tag, relation, weight').limit(500),
      supabase.from('ontology_tag_approaches').select('tag_key, approach_key, weight').limit(1000),
      supabase.rpc('list_ontology_concepts'),
    ]);

    if (tagRes.status === 'fulfilled' && !tagRes.value.error) {
      setTags((tagRes.value.data ?? []) as OntologyTag[]);
    }
    if (edgeRes.status === 'fulfilled' && !edgeRes.value.error) {
      setEdges((edgeRes.value.data ?? []) as OntologyEdge[]);
    }
    if (approachRes.status === 'fulfilled' && !approachRes.value.error) {
      setApproaches((approachRes.value.data ?? []) as TagApproach[]);
    }
    if (countRes.status === 'fulfilled' && !countRes.value.error) {
      const rows = (countRes.value.data ?? []) as Array<{ tag_key: string; card_count: number }>;
      setCounts(Object.fromEntries(rows.map((r) => [r.tag_key, r.card_count])));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => tags.find((t) => t.tag_key === selectedKey) ?? null,
    [tags, selectedKey],
  );

  useEffect(() => {
    setDraft(selected ? { ...selected } : null);
  }, [selected]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return tags;
    return tags.filter(
      (t) =>
        t.label.toLowerCase().includes(needle) ||
        t.tag_key.toLowerCase().includes(needle) ||
        t.dimension.toLowerCase().includes(needle),
    );
  }, [tags, filter]);

  const relatedEdges = useMemo(
    () => edges.filter((e) => e.from_tag === selectedKey || e.to_tag === selectedKey),
    [edges, selectedKey],
  );

  const conceptApproaches = useMemo(
    () => approaches.filter((a) => a.tag_key === selectedKey),
    [approaches, selectedKey],
  );

  const landingPage = useMemo(() => {
    if (!selected) return null;
    const slug = slugFromLabel(selected.label);
    return LANDING_PAGES.find((p) => p.path.endsWith(`/${slug}`)) ?? null;
  }, [selected]);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from('ontology_tags')
      .update({
        label: draft.label,
        description: draft.description,
        signatures: draft.signatures,
        exclusions: draft.exclusions,
        priority: draft.priority,
        is_active: draft.is_active,
      })
      .eq('tag_key', draft.tag_key);
    setSaving(false);

    if (error) {
      logger.error('[concept-manager] save failed', error);
      toast.error('Could not save concept');
      return;
    }
    setTags((prev) => prev.map((t) => (t.tag_key === draft.tag_key ? { ...draft } : t)));
    toast.success(`${draft.label} saved`);
  }, [draft]);

  if (mode === 'relationships') {
    return (
      <div className="space-y-6">
        <ConsoleHeading index="03" title="Relationships" note="Concept graph edges used for query expansion." />
        <ConsolePanel title={`${edges.length} edges`}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : edges.length === 0 ? (
            <EmptyRow>No relationships defined.</EmptyRow>
          ) : (
            <div className="max-h-[560px] divide-y divide-border overflow-auto font-mono text-[11px]">
              {edges.map((edge) => (
                <div key={edge.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="truncate text-foreground">{edge.from_tag}</span>
                  <span className="shrink-0 uppercase tracking-[0.18em] text-muted-foreground">
                    {edge.relation}
                  </span>
                  <span className="flex-1 truncate text-right text-foreground">{edge.to_tag}</span>
                  <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                    {Number(edge.weight).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ConsolePanel>
      </div>
    );
  }

  if (mode === 'approaches') {
    const byApproach = approaches.reduce<Record<string, string[]>>((acc, row) => {
      (acc[row.approach_key] ??= []).push(row.tag_key);
      return acc;
    }, {});
    return (
      <div className="space-y-6">
        <ConsoleHeading index="03" title="Approaches" note="How players actually solve each problem." />
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(byApproach).map(([approach, keys]) => (
            <ConsolePanel key={approach} title={approach} note={`${keys.length} concepts`}>
              <div className="flex flex-wrap gap-1.5">
                {keys.slice(0, 24).map((key) => (
                  <StatusTag key={key} tone="neutral">
                    {key}
                  </StatusTag>
                ))}
              </div>
            </ConsolePanel>
          ))}
          {!loading && Object.keys(byApproach).length === 0 && (
            <ConsolePanel>
              <EmptyRow>No approach mappings yet.</EmptyRow>
            </ConsolePanel>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="03"
        title="Concepts"
        note="Ontology editor — labels, phrases, exclusions and coverage."
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ConsolePanel title="Concepts" note={`${tags.length} total`}>
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter concepts"
            className="mb-3 h-8 rounded-none font-mono text-xs"
          />
          <div className="max-h-[560px] divide-y divide-border overflow-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              filtered.map((tag) => (
                <button
                  key={tag.tag_key}
                  onClick={() => setSelectedKey(tag.tag_key)}
                  className={`flex w-full items-center justify-between gap-2 py-2 text-left transition-colors hover:bg-muted/20 ${
                    selectedKey === tag.tag_key ? 'bg-muted/30' : ''
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs text-foreground">{tag.label}</span>
                    <span className="block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {tag.dimension}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {counts[tag.tag_key] ?? 0}
                  </span>
                </button>
              ))
            )}
          </div>
        </ConsolePanel>

        {!draft ? (
          <ConsolePanel>
            <EmptyRow>Select a concept to edit it.</EmptyRow>
          </ConsolePanel>
        ) : (
          <div className="space-y-4">
            <ConsolePanel
              title={draft.tag_key}
              note={`${draft.dimension} · ${counts[draft.tag_key] ?? 0} classified cards`}
              action={
                <Button
                  size="sm"
                  className="h-8 rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                  Save
                </Button>
              }
            >
              <div className="space-y-3">
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Label
                  </span>
                  <Input
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                    className="mt-1 h-8 rounded-none text-xs"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Description
                  </span>
                  <Textarea
                    value={draft.description ?? ''}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="mt-1 min-h-[64px] rounded-none text-xs"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Known phrases (one per line)
                  </span>
                  <Textarea
                    value={draft.signatures.join('\n')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        signatures: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="mt-1 min-h-[120px] rounded-none font-mono text-[11px]"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Exclusions (one per line)
                  </span>
                  <Textarea
                    value={draft.exclusions.join('\n')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        exclusions: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    className="mt-1 min-h-[80px] rounded-none font-mono text-[11px]"
                  />
                </label>
              </div>
            </ConsolePanel>

            <div className="grid gap-3 md:grid-cols-2">
              <ConsolePanel title="Related concepts">
                {relatedEdges.length === 0 ? (
                  <EmptyRow>No relationships.</EmptyRow>
                ) : (
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {relatedEdges.map((edge) => (
                      <div key={edge.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-foreground">
                          {edge.from_tag === draft.tag_key ? edge.to_tag : edge.from_tag}
                        </span>
                        <span className="uppercase tracking-[0.18em] text-muted-foreground">
                          {edge.relation}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ConsolePanel>

              <ConsolePanel title="Approaches">
                {conceptApproaches.length === 0 ? (
                  <EmptyRow>No approaches mapped.</EmptyRow>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {conceptApproaches.map((a) => (
                      <StatusTag key={a.approach_key} tone="neutral">
                        {a.approach_key}
                      </StatusTag>
                    ))}
                  </div>
                )}
              </ConsolePanel>
            </div>

            <ConsolePanel title="Landing page status">
              {landingPage ? (
                <a
                  href={landingPage.path}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-primary hover:underline"
                >
                  {landingPage.path}
                </a>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No landing page declared for this concept.
                </p>
              )}
            </ConsolePanel>
          </div>
        )}
      </div>
    </div>
  );
}
