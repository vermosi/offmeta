import { useState } from 'react';
import type { SearchIntent } from '@/types/search';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface ExplainCompilationPanelProps {
  intent: SearchIntent | null;
  defaultOpen?: boolean;
}

function formatComparator(op: string, value: number): string {
  return `${op}${value}`;
}

export function ExplainCompilationPanel({
  intent,
  defaultOpen = false,
}: ExplainCompilationPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!intent) return null;

  const colorSummary = intent.colors
    ? `${intent.colors.isIdentity ? 'ci' : 'c'}${intent.colors.isExact ? '=' : ':'}${intent.colors.values.join('')}`
    : null;

  // Count how many fields have values for the summary
  const activeFields = [
    colorSummary,
    intent.types.length > 0,
    intent.cmc,
    intent.power || intent.toughness,
    intent.tags.length > 0,
  ].filter(Boolean).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button
          className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg bg-secondary/50 hover:bg-secondary border border-border/50 max-w-xs mx-auto"
          aria-expanded={isOpen}
        >
          <span>
            {isOpen ? 'Hide' : 'Show'} details
            {!isOpen && activeFields > 0 && (
              <span className="ml-1 text-accent font-medium">
                ({activeFields} detected)
              </span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <section className="mt-2 w-full max-w-3xl mx-auto rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Colors
              </p>
              <p className={cn(!colorSummary && 'text-muted-foreground')}>
                {colorSummary || '—'}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Types
              </p>
              <p
                className={cn(
                  intent.types.length === 0 && 'text-muted-foreground',
                )}
              >
                {intent.types.length ? intent.types.join(', ') : '—'}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Mana value
              </p>
              <p className={cn(!intent.cmc && 'text-muted-foreground')}>
                {intent.cmc
                  ? `mv${formatComparator(intent.cmc.op, intent.cmc.value)}`
                  : '—'}
              </p>
            </div>

            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Power / Toughness
              </p>
              <p
                className={cn(
                  !intent.power && !intent.toughness && 'text-muted-foreground',
                )}
              >
                {intent.power
                  ? `pow${formatComparator(intent.power.op, intent.power.value)}`
                  : '—'}
                {intent.toughness
                  ? `, tou${formatComparator(intent.toughness.op, intent.toughness.value)}`
                  : ''}
              </p>
            </div>

            {intent.tags.length > 0 && (
              <div className="space-y-0.5 sm:col-span-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Tags
                </p>
                <p>{intent.tags.join(', ')}</p>
              </div>
            )}

            {intent.oraclePatterns.length > 0 && (
              <div className="space-y-0.5 sm:col-span-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  Oracle patterns
                </p>
                <p className="font-mono text-xs break-words">
                  {intent.oraclePatterns.join(' ')}
                </p>
              </div>
            )}
          </div>

          {intent.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              <ul className="list-disc pl-4 space-y-0.5">
                {intent.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </CollapsibleContent>
    </Collapsible>
  );
}
