/**
 * Content inventory — declared landing pages and editorial guides, with the
 * indexing status that decides whether they can earn traffic at all.
 */

import { useMemo } from 'react';
import { LANDING_PAGES } from '@/lib/landing';
import { GUIDES } from '@/data/guides';
import { ConsoleHeading, ConsolePanel, StatusTag } from '../components/console-ui';

export function LandingPagesSection() {
  const byFamily = useMemo(() => {
    return LANDING_PAGES.reduce<Record<string, typeof LANDING_PAGES[number][]>>((acc, page) => {
      (acc[page.family] ??= []).push(page);
      return acc;
    }, {});
  }, []);

  const indexable = LANDING_PAGES.filter((p) => p.indexable).length;

  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="04"
        title="Landing pages"
        note={`${LANDING_PAGES.length} declared · ${indexable} indexable`}
      />
      <div className="space-y-3">
        {Object.entries(byFamily).map(([family, pages]) => (
          <ConsolePanel key={family} title={family} note={`${pages.length} pages`}>
            <div className="divide-y divide-border">
              {pages.map((page) => (
                <div key={page.path} className="flex items-center justify-between gap-3 py-1.5">
                  <a
                    href={page.path}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-mono text-[11px] text-foreground hover:text-primary"
                  >
                    {page.path}
                  </a>
                  <StatusTag tone={page.indexable ? 'good' : 'neutral'}>
                    {page.indexable ? 'indexable' : 'noindex'}
                  </StatusTag>
                </div>
              ))}
            </div>
          </ConsolePanel>
        ))}
      </div>
    </div>
  );
}

export function GuidesSection() {
  const sorted = useMemo(() => [...GUIDES].sort((a, b) => a.level - b.level), []);
  return (
    <div className="space-y-6">
      <ConsoleHeading index="04" title="Guides" note={`${GUIDES.length} progressive guides`} />
      <ConsolePanel>
        <div className="divide-y divide-border">
          {sorted.map((guide) => (
            <div key={guide.slug} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate text-xs text-foreground">{guide.title}</span>
              <a
                href={`/guides/${guide.slug}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
              >
                Level {guide.level} →
              </a>
            </div>
          ))}
        </div>
      </ConsolePanel>
    </div>
  );
}
