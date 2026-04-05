/**
 * Panel with buttons to invoke all edge functions from the admin dashboard.
 * Groups functions by category and shows status/result for each invocation.
 */

import { useState, useCallback } from 'react';
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type FnMethod = 'GET' | 'POST';

interface EdgeFnDef {
  name: string;
  label: string;
  description: string;
  method: FnMethod;
  body?: Record<string, unknown>;
  category: 'pipeline' | 'data-sync' | 'seo' | 'maintenance' | 'ai' | 'other';
  dangerous?: boolean;
}

const EDGE_FUNCTIONS: EdgeFnDef[] = [
  // Pipeline
  { name: 'semantic-search', label: 'Semantic Search', description: 'Test the AI translation pipeline with a sample query', method: 'POST', body: { query: 'cheap red creatures' }, category: 'pipeline' },
  { name: 'process-feedback', label: 'Process Feedback', description: 'Process a specific feedback item (requires feedbackId)', method: 'POST', body: { feedbackId: 'PASTE_UUID_HERE' }, category: 'pipeline' },
  { name: 'fix-zero-results', label: 'Fix Zero Results', description: 'Auto-repair queries that returned zero results', method: 'POST', category: 'pipeline' },
  { name: 'promote-searches', label: 'Promote Searches', description: 'Promote popular queries to curated searches', method: 'POST', category: 'pipeline' },
  { name: 'generate-patterns', label: 'Generate Patterns', description: 'Generate new translation patterns from logs', method: 'POST', category: 'pipeline' },
  { name: 'warmup-cache', label: 'Warmup Cache', description: 'Pre-warm the query cache with popular searches', method: 'POST', category: 'pipeline' },

  // Data Sync
  { name: 'bulk-data-sync', label: 'Bulk Data Sync', description: 'Sync card data from external sources', method: 'POST', category: 'data-sync', dangerous: true },
  { name: 'card-sync', label: 'Card Sync', description: 'Sync missing card metadata from Scryfall', method: 'POST', category: 'data-sync' },
  { name: 'sync-card-names', label: 'Sync Card Names', description: 'Update the card_names lookup table', method: 'POST', category: 'data-sync' },
  { name: 'price-snapshot', label: 'Price Snapshot', description: 'Take a snapshot of current card prices', method: 'POST', category: 'data-sync' },
  { name: 'compute-cooccurrence', label: 'Compute Co-occurrence', description: 'Compute card co-occurrence data from decks (service-role only — use cron)', method: 'POST', category: 'data-sync', dangerous: true, serviceRoleOnly: true },
  { name: 'detect-archetypes', label: 'Detect Archetypes', description: 'Detect deck archetypes from community decks', method: 'POST', category: 'data-sync' },
  { name: 'spicerack-import', label: 'SpiceRack Import', description: 'Import data from SpiceRack API (service-role only — use cron)', method: 'POST', category: 'data-sync', dangerous: true, serviceRoleOnly: true },
  { name: 'mtgjson-import', label: 'MTGJSON Import', description: 'Import data from MTGJSON', method: 'POST', category: 'data-sync', dangerous: true },
  { name: 'fetch-moxfield-deck', label: 'Fetch Moxfield Deck', description: 'Fetch a deck from Moxfield by URL', method: 'POST', body: { url: 'https://www.moxfield.com/decks/example' }, category: 'data-sync' },

  // SEO
  { name: 'generate-seo-page', label: 'Generate SEO Page', description: 'Generate a single SEO page from a query', method: 'POST', body: { query: 'best mana rocks for commander', publish: false }, category: 'seo' },
  { name: 'batch-generate-seo-pages', label: 'Batch Generate SEO Pages', description: 'Generate multiple SEO pages from seed queries', method: 'POST', body: { publish: false }, category: 'seo', dangerous: true },
  { name: 'auto-generate-seo-pages', label: 'Auto Generate SEO Pages', description: 'Auto-generate SEO pages from popular queries', method: 'POST', category: 'seo' },
  { name: 'sitemap', label: 'Sitemap', description: 'Generate the XML sitemap', method: 'GET', category: 'seo' },
  { name: 'prerender', label: 'Prerender', description: 'Pre-render a page for SEO crawlers', method: 'GET', category: 'seo' },

  // AI
  { name: 'card-meta-context', label: 'Card Meta Context', description: 'Get AI-generated meta context for a card', method: 'POST', body: { cardName: 'Sol Ring' }, category: 'ai' },
  { name: 'card-recommendations', label: 'Card Recommendations', description: 'Get AI card recommendations', method: 'POST', body: { oracleId: 'test', format: 'commander' }, category: 'ai' },
  { name: 'card-similarity', label: 'Card Similarity', description: 'Find similar cards using AI', method: 'POST', body: { cardName: 'Lightning Bolt' }, category: 'ai' },
  { name: 'combo-search', label: 'Combo Search', description: 'Search for card combos', method: 'POST', body: { cards: ['Sol Ring'] }, category: 'ai' },
  { name: 'deck-categorize', label: 'Deck Categorize', description: 'AI-categorize deck cards', method: 'POST', category: 'ai' },
  { name: 'deck-critique', label: 'Deck Critique', description: 'Get AI critique of a deck', method: 'POST', category: 'ai' },
  { name: 'deck-ideas', label: 'Deck Ideas', description: 'Get AI deck building ideas', method: 'POST', category: 'ai' },
  { name: 'deck-recommendations', label: 'Deck Recommendations', description: 'Get AI deck recommendations', method: 'POST', category: 'ai' },
  { name: 'deck-suggest', label: 'Deck Suggest', description: 'Get AI card suggestions for a deck', method: 'POST', category: 'ai' },

  // Maintenance
  { name: 'admin-analytics', label: 'Admin Analytics', description: 'Fetch admin analytics data', method: 'GET', category: 'maintenance' },
  { name: 'cleanup-logs', label: 'Cleanup Logs', description: 'Delete old translation logs (30-day retention)', method: 'POST', category: 'maintenance', dangerous: true },
  { name: 'generate-retention-triggers', label: 'Retention Triggers', description: 'Run retention trigger jobs', method: 'POST', category: 'maintenance' },
  { name: 'get-affiliate-config', label: 'Affiliate Config', description: 'Get affiliate link configuration', method: 'GET', category: 'other' },
  { name: 'process-email-queue', label: 'Process Email Queue', description: 'Process pending email queue', method: 'POST', category: 'maintenance' },
];

const CATEGORY_LABELS: Record<string, string> = {
  pipeline: '🔄 Pipeline',
  'data-sync': '📦 Data Sync',
  seo: '🔍 SEO',
  ai: '🤖 AI',
  maintenance: '🔧 Maintenance',
  other: '📋 Other',
};

const CATEGORY_ORDER = ['pipeline', 'data-sync', 'seo', 'ai', 'maintenance', 'other'];

type InvocationStatus = 'idle' | 'loading' | 'success' | 'error';

interface InvocationResult {
  status: InvocationStatus;
  statusCode?: number;
  data?: unknown;
  error?: string;
  duration?: number;
}

export function EdgeFunctionTriggerPanel() {
  const { session } = useAuth();
  const [results, setResults] = useState<Record<string, InvocationResult>>({});
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(true);

  const invoke = useCallback(async (fn: EdgeFnDef) => {
    if (fn.dangerous && !window.confirm(`Are you sure you want to invoke "${fn.label}"? This may modify data.`)) {
      return;
    }

    setResults((prev) => ({ ...prev, [fn.name]: { status: 'loading' } }));
    const start = Date.now();

    try {
      const token = session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fn.name}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const resp = await fetch(url, {
        method: fn.method,
        headers,
        ...(fn.method === 'POST' ? { body: JSON.stringify(fn.body ?? {}) } : {}),
      });

      const duration = Date.now() - start;
      let data: unknown;
      const contentType = resp.headers.get('content-type') ?? '';
      if (contentType.includes('json')) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        data = text.length > 500 ? text.slice(0, 500) + '…' : text;
      }

      setResults((prev) => ({
        ...prev,
        [fn.name]: {
          status: resp.ok ? 'success' : 'error',
          statusCode: resp.status,
          data,
          duration,
          error: resp.ok ? undefined : `HTTP ${resp.status}`,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [fn.name]: {
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
          duration: Date.now() - start,
        },
      }));
    }
  }, [session]);

  const toggleResult = (name: string) => {
    setExpandedResults((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: CATEGORY_LABELS[cat],
    functions: EDGE_FUNCTIONS.filter((f) => f.category === cat),
  })).filter((g) => g.functions.length > 0);

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full text-left"
      >
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Edge Function Triggers
          <Badge variant="secondary" className="text-xs font-normal">
            {EDGE_FUNCTIONS.length}
          </Badge>
        </h2>
        {collapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-6">
          {grouped.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {group.label}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.functions.map((fn) => {
                  const result = results[fn.name];
                  const isLoading = result?.status === 'loading';
                  const isExpanded = expandedResults[fn.name];

                  return (
                    <div
                      key={fn.name}
                      className="rounded-lg border border-border bg-background p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {fn.label}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                              {fn.method}
                            </Badge>
                            {fn.dangerous && (
                              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                                ⚠
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {fn.description}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => invoke(fn)}
                          disabled={isLoading}
                          className="shrink-0 h-7 px-2 gap-1"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          Run
                        </Button>
                      </div>

                      {result && result.status !== 'loading' && (
                        <div className="space-y-1">
                          <button
                            onClick={() => toggleResult(fn.name)}
                            className="flex items-center gap-1.5 text-xs w-full"
                          >
                            {result.status === 'success' ? (
                              <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                            ) : (
                              <XCircle className="h-3 w-3 text-destructive shrink-0" />
                            )}
                            <span className={result.status === 'success' ? 'text-success' : 'text-destructive'}>
                              {result.statusCode ? `${result.statusCode}` : result.error}
                            </span>
                            {result.duration && (
                              <span className="text-muted-foreground">
                                {result.duration}ms
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3 text-muted-foreground ml-auto" />
                            ) : (
                              <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" />
                            )}
                          </button>
                          {isExpanded && result.data != null && (
                            <pre className="text-[11px] bg-muted/50 rounded p-2 overflow-auto max-h-48 text-foreground">
                              {typeof result.data === 'string'
                                ? result.data
                                : JSON.stringify(result.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
