/**
 * /api — Public documentation for the OffMeta semantic data layer.
 *
 * Editorial technical-manual styling consistent with /about and /guides.
 * @module pages/ApiDocs
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';
import { applySeoMeta, injectJsonLd } from '@/lib/seo';
import { listConcepts, type ConceptDirectoryEntry } from '@/lib/semantic';

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/offmeta-api`;

const DIMENSION_ORDER = ['ROLE', 'METHOD', 'PROBLEM', 'CHARACTERISTIC'] as const;

const DIMENSION_BLURB: Record<string, string> = {
  ROLE: 'What job the card does in a deck.',
  METHOD: 'How the card does it.',
  PROBLEM: 'What the card answers.',
  CHARACTERISTIC: 'Shape and constraints of the effect.',
};

interface EndpointDoc {
  index: string;
  method: string;
  path: string;
  summary: string;
  params: Array<{ name: string; required?: boolean; description: string }>;
  example: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    index: '01',
    method: 'GET',
    path: '/v1/concepts',
    summary:
      'The full concept directory: every role, method, problem and characteristic, with how many cards carry it and which concepts it connects to.',
    params: [],
    example: `${API_BASE}/v1/concepts`,
  },
  {
    index: '02',
    method: 'GET',
    path: '/v1/cards',
    summary:
      'Functional profile for one or more cards, looked up by exact name. Returns roles, methods, problems addressed, characteristics and strategic approaches alongside the printing basics.',
    params: [
      {
        name: 'name',
        required: true,
        description: 'Card name. Repeat the parameter or comma-separate for up to 50 cards.',
      },
    ],
    example: `${API_BASE}/v1/cards?name=Collector%20Ouphe&name=Rhystic%20Study`,
  },
  {
    index: '03',
    method: 'GET',
    path: '/v1/search',
    summary:
      'Find cards by what they do rather than what they say. Results are ranked by how many of the requested concepts each card matches.',
    params: [
      {
        name: 'concepts',
        required: true,
        description: 'Concept keys from /v1/concepts. Comma-separated, up to 12.',
      },
      { name: 'colors', description: 'Restrict to cards inside these colors, e.g. WU or G.' },
      { name: 'match', description: 'any (default) or all.' },
      { name: 'limit', description: '1–200, defaults to 40.' },
    ],
    example: `${API_BASE}/v1/search?concepts=artifact_hate,static_lock&colors=G&limit=10`,
  },
  {
    index: '04',
    method: 'GET',
    path: '/v1/openapi.json',
    summary: 'Machine-readable OpenAPI 3.1 schema for the endpoints above.',
    params: [],
    example: `${API_BASE}/v1/openapi.json`,
  },
];

const SAMPLE_RESPONSE = `{
  "version": "v1",
  "cards": [
    {
      "name": "Collector Ouphe",
      "type_line": "Creature — Ouphe",
      "colors": ["G"],
      "roles": [],
      "methods": [{ "key": "static_lock", "label": "Static Lock" }],
      "problems": [{ "key": "combo_hate", "label": "Combo Hate" }],
      "characteristics": [
        { "key": "cheap", "label": "Cheap" },
        { "key": "mono_color", "label": "Mono-Colour" }
      ],
      "approaches": [{ "key": "disable", "label": "Disable" }]
    }
  ],
  "unresolved": []
}`;

export default function ApiDocs() {
  const [concepts, setConcepts] = useState<ConceptDirectoryEntry[]>([]);

  useEffect(() => {
    const cleanupSeo = applySeoMeta({
      title: 'OffMeta Semantic API — Functional MTG Card Data',
      description:
        'Free read-only API exposing what Magic cards actually do: roles, methods, problems addressed, characteristics and strategic approaches for 32,000+ cards.',
      url: 'https://offmeta.app/api',
      type: 'website',
      section: 'API',
      keywords: [
        'MTG API',
        'Magic card data API',
        'MTG semantic search API',
        'card roles API',
        'Scryfall alternative API',
      ],
    });
    const cleanupLd = injectJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'TechArticle',
          '@id': 'https://offmeta.app/api#article',
          headline: 'OffMeta Semantic API',
          description:
            'Read-only API for functional Magic: The Gathering card metadata — roles, methods, problems addressed and characteristics.',
          url: 'https://offmeta.app/api',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
            { '@type': 'ListItem', position: 2, name: 'API', item: 'https://offmeta.app/api' },
          ],
        },
      ],
    });
    return () => {
      cleanupSeo();
      cleanupLd();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    listConcepts()
      .then((rows) => {
        if (!cancelled) setConcepts(rows);
      })
      .catch(() => {
        /* Directory is illustrative; the docs stand alone without it. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byDimension = useMemo(() => {
    const map = new Map<string, ConceptDirectoryEntry[]>();
    for (const entry of concepts) {
      const key = String(entry.dimension).toUpperCase();
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [concepts]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SkipLinks />
      <Header />

      <main id="main-content" className="container-main flex-1 pb-20 pt-8">
        <nav aria-label="Breadcrumb" className="mb-10">
          <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                OffMeta
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">API</li>
          </ol>
        </nav>

        <header className="border-b border-border/60 pb-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <h1 className="font-display text-[clamp(2.25rem,5.6vw,4rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-foreground lg:col-span-7">
              The semantic
              <br />
              <span className="font-editorial text-[0.94em] font-normal normal-case italic tracking-normal text-accent">
                layer, exposed.
              </span>
            </h1>
            <div className="space-y-4 lg:col-span-5 lg:pb-2">
              <p className="max-w-md text-base leading-snug text-muted-foreground sm:text-lg">
                Card databases tell you what a card says. OffMeta records what it
                does — and this API hands that dataset to your tools.
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Read-only / No key required / 60 requests per minute
              </p>
            </div>
          </div>
        </header>

        <section className="border-b border-border/50 py-12">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                00 / Base URL
              </p>
            </div>
            <div className="space-y-4 lg:col-span-9">
              <pre className="overflow-x-auto border border-border/60 bg-card/40 p-4 font-mono text-xs text-foreground">
                {API_BASE}
              </pre>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Every endpoint is a plain <code className="font-mono">GET</code>, returns JSON, and
                sends permissive CORS headers so browser clients work without a proxy. Responses are
                cacheable for an hour; classification is recomputed nightly. Card data comes from
                Scryfall — the functional classification is OffMeta&rsquo;s.
              </p>
            </div>
          </div>
        </section>

        {ENDPOINTS.map((endpoint) => (
          <section key={endpoint.path} className="border-b border-border/50 py-12">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  {endpoint.index} / Endpoint
                </p>
              </div>
              <div className="space-y-5 lg:col-span-9">
                <h2 className="font-mono text-base text-foreground sm:text-lg">
                  <span className="mr-3 border border-border/60 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {endpoint.method}
                  </span>
                  {endpoint.path}
                </h2>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {endpoint.summary}
                </p>

                {endpoint.params.length > 0 && (
                  <dl className="divide-y divide-border/40 border-y border-border/40">
                    {endpoint.params.map((param) => (
                      <div key={param.name} className="grid gap-1 py-3 sm:grid-cols-4 sm:gap-4">
                        <dt className="font-mono text-xs text-foreground">
                          {param.name}
                          {param.required && <span className="ml-2 text-accent">required</span>}
                        </dt>
                        <dd className="text-sm text-muted-foreground sm:col-span-3">
                          {param.description}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                <pre className="overflow-x-auto border border-border/60 bg-card/40 p-4 font-mono text-[11px] leading-relaxed text-foreground">
                  {endpoint.example}
                </pre>
              </div>
            </div>
          </section>
        ))}

        <section className="border-b border-border/50 py-12">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                05 / Response shape
              </p>
            </div>
            <div className="lg:col-span-9">
              <pre className="overflow-x-auto border border-border/60 bg-card/40 p-4 font-mono text-[11px] leading-relaxed text-foreground">
                {SAMPLE_RESPONSE}
              </pre>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                06 / The ontology
              </p>
            </div>
            <div className="space-y-8 lg:col-span-9">
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Concepts are assigned deterministically — the same card always produces the same
                classification. Four dimensions, {concepts.length || '60+'} concepts, applied across
                every paper card.
              </p>
              {DIMENSION_ORDER.map((dimension) => {
                const entries = byDimension.get(dimension) ?? [];
                if (entries.length === 0) return null;
                return (
                  <div key={dimension} className="space-y-3">
                    <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-foreground">
                      {dimension}
                      <span className="ml-3 text-muted-foreground">
                        {DIMENSION_BLURB[dimension]}
                      </span>
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {entries.map((entry) => (
                        <li
                          key={entry.tagKey}
                          className="border border-border/60 px-2 py-1 font-mono text-[11px] text-muted-foreground"
                          title={entry.description ?? undefined}
                        >
                          {entry.tagKey}
                          <span className="ml-2 text-foreground/60">{entry.cardCount}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
