/**
 * Shared admin console primitives.
 *
 * Dense, utilitarian, hairline-bordered surfaces. Mono for data and status,
 * Archivo for headings. No decorative gradients or rounded card soup.
 */

import type { ReactNode } from 'react';

export function ConsoleHeading({
  index,
  title,
  note,
  action,
}: {
  index?: string;
  title: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border pb-3 mb-4">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          {index && (
            <span className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground">
              {index}
            </span>
          )}
          <h2 className="font-heading text-sm uppercase tracking-[0.14em] text-foreground">
            {title}
          </h2>
        </div>
        {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
      </div>
      {action}
    </div>
  );
}

export function ConsolePanel({
  title,
  note,
  children,
  action,
}: {
  title?: string;
  note?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border border-border bg-card/40">
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <div className="min-w-0">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground">
              {title}
            </h3>
            {note && <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Metric({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good'
      ? 'text-success'
      : tone === 'warn'
        ? 'text-warning'
        : tone === 'bad'
          ? 'text-destructive'
          : 'text-foreground';
  return (
    <div className="border border-border px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className={`font-mono text-lg tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function StatusTag({
  tone,
  children,
}: {
  tone: 'neutral' | 'good' | 'warn' | 'bad';
  children: ReactNode;
}) {
  const cls =
    tone === 'good'
      ? 'border-success/40 text-success'
      : tone === 'warn'
        ? 'border-warning/40 text-warning'
        : tone === 'bad'
          ? 'border-destructive/40 text-destructive'
          : 'border-border text-muted-foreground';
  return (
    <span
      className={`inline-flex items-center border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${cls}`}
    >
      {children}
    </span>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-xs text-muted-foreground">{children}</p>;
}
