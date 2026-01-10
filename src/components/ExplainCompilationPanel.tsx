import { SearchIntent } from '@/types/search';
import { cn } from '@/lib/utils';

interface ExplainCompilationPanelProps {
  intent: SearchIntent | null;
}

function formatComparator(op: string, value: number): string {
  return `${op}${value}`;
}

export function ExplainCompilationPanel({ intent }: ExplainCompilationPanelProps) {
  if (!intent) return null;

  const colorSummary = intent.colors
    ? `${intent.colors.isIdentity ? 'id' : 'c'}${intent.colors.isExact ? '=' : ':'}${intent.colors.values.join('')}`
    : null;

  return (
    <section className="w-full max-w-3xl mx-auto rounded-2xl border border-border bg-card/60 p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Explain compilation</h3>
        {intent.deterministicQuery && (
          <span className="text-[10px] text-muted-foreground">
            Deterministic base: <span className="font-mono">{intent.deterministicQuery}</span>
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Colors</p>
          <p className={cn("text-sm", !colorSummary && "text-muted-foreground")}>
            {colorSummary || 'None'}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Types</p>
          <p className={cn("text-sm", intent.types.length === 0 && "text-muted-foreground")}>
            {intent.types.length ? intent.types.join(', ') : 'None'}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mana value</p>
          <p className={cn("text-sm", !intent.cmc && "text-muted-foreground")}>
            {intent.cmc ? `mv${formatComparator(intent.cmc.op, intent.cmc.value)}` : 'None'}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Power / Toughness</p>
          <p className={cn("text-sm", !intent.power && !intent.toughness && "text-muted-foreground")}>
            {intent.power ? `pow${formatComparator(intent.power.op, intent.power.value)}` : '—'}
            {intent.toughness ? `, tou${formatComparator(intent.toughness.op, intent.toughness.value)}` : ''}
          </p>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</p>
          <p className={cn("text-sm", intent.tags.length === 0 && "text-muted-foreground")}>
            {intent.tags.length ? intent.tags.join(', ') : 'None'}
          </p>
        </div>

        <div className="space-y-1 sm:col-span-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Oracle fallback</p>
          <p className={cn("text-sm font-mono break-words", intent.oraclePatterns.length === 0 && "text-muted-foreground")}>
            {intent.oraclePatterns.length ? intent.oraclePatterns.join(' ') : 'None'}
          </p>
        </div>
      </div>

      {intent.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-semibold">Notes</p>
          <ul className="mt-1 list-disc pl-4 space-y-1">
            {intent.warnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
