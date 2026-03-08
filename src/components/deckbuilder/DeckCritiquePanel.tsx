/**
 * AI Deck Critique panel — shows cuts, additions, and overall assessment.
 * @module components/deckbuilder/DeckCritiquePanel
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MessageSquareWarning, Loader2, Scissors, Plus, AlertTriangle, TrendingDown, Target, ArrowRightLeft, X, Undo2, ShieldCheck, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/core/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CardHoverImage } from '@/components/deckbuilder/CardHoverImage';
import { buildCacheKey, loadCachedCritique, saveCritique } from '@/components/deckbuilder/critique-cache';
import type { CritiqueResult } from '@/components/deckbuilder/critique-cache';
import type { DeckCard } from '@/hooks/useDeck';
import type { ScryfallCard } from '@/types/card';
import { useTranslation } from '@/lib/i18n';

interface DeckCritiquePanelProps {
  deckId: string;
  cards: DeckCard[];
  commanderName: string | null;
  colorIdentity: string[];
  format: string;
  onAddSuggestion: (name: string) => void;
  onRemoveByName?: (name: string) => void;
  scryfallCache?: React.RefObject<Map<string, ScryfallCard>>;
}

const SEVERITY_KEYS: Record<string, string> = {
  'off-strategy': 'critique.severityOffStrategy',
  'underperforming': 'critique.severityUnderperforming',
  'weak': 'critique.severityWeak',
};

const SEVERITY_CONFIG = {
  'off-strategy': { icon: Target, className: 'bg-destructive/10 text-destructive border-destructive/20' },
  'underperforming': { icon: TrendingDown, className: 'bg-warning/10 text-warning border-warning/20' },
  'weak': { icon: AlertTriangle, className: 'bg-muted text-muted-foreground border-border' },
} as const;

function getConfidenceConfig(value: number, t: (k: string) => string) {
  if (value >= 0.8) return { label: t('critique.confidenceHigh'), className: 'text-accent', barClass: 'bg-accent' };
  if (value >= 0.5) return { label: t('critique.confidenceMedium'), className: 'text-warning', barClass: 'bg-warning' };
  return { label: t('critique.confidenceLow'), className: 'text-destructive', barClass: 'bg-destructive' };
}

function ConfidenceIndicator({ value }: { value: number }) {
  const { t } = useTranslation();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const config = getConfidenceConfig(value, t);
  return (
    <div className="flex items-center gap-2">
      <ShieldCheck className={cn('h-3 w-3 shrink-0', config.className)} />
      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{t('critique.confidenceLabel')}</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden cursor-help">
              <div className={cn('h-full rounded-full transition-all', config.barClass)} style={{ width: `${pct}%` }} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-[10px] leading-relaxed">
            <p className="font-medium mb-1">{t('critique.confidenceFactors')}</p>
            <ul className="list-disc pl-3 space-y-0.5">
              <li>{t('critique.factorDeckSize')}</li>
              <li>{t('critique.factorArchetype')}</li>
              <li>{t('critique.factorFamiliarity')}</li>
              <li>{t('critique.factorCommander')}</li>
            </ul>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className={cn('text-[10px] font-medium', config.className)}>{pct}%</span>
    </div>
  );
}

function LowConfidenceWarning() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-2.5">
      <Info className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
      <p className="text-[10px] text-warning leading-relaxed">
        {t('critique.lowConfidenceWarning')}
      </p>
    </div>
  );
}

export function DeckCritiquePanel({ deckId, cards, commanderName, colorIdentity, format, onAddSuggestion, onRemoveByName, scryfallCache }: DeckCritiquePanelProps) {
  const { t } = useTranslation();
  const fallbackCacheRef = useRef<Map<string, ScryfallCard>>(new Map());
  const effectiveCache = scryfallCache ?? fallbackCacheRef;
  const cacheKey = useMemo(() => buildCacheKey(deckId, cards), [deckId, cards]);
  const [critique, setCritique] = useState<CritiqueResult | null>(() => loadCachedCritique(cacheKey));
  const [loading, setLoading] = useState(false);
  const [dismissedCuts, setDismissedCuts] = useState<Set<string>>(new Set());
  const [dismissedAdditions, setDismissedAdditions] = useState<Set<string>>(new Set());

  // Invalidate cached critique when the deck changes
  useEffect(() => {
    const cached = loadCachedCritique(cacheKey);
    setCritique(cached);
    setDismissedCuts(new Set());
    setDismissedAdditions(new Set());
  }, [cacheKey]);

  const visibleCuts = useMemo(() => critique?.cuts.filter((c) => !dismissedCuts.has(c.card_name)) ?? [], [critique, dismissedCuts]);
  const visibleAdditions = useMemo(() => critique?.additions.filter((a) => !dismissedAdditions.has(a.card_name)) ?? [], [critique, dismissedAdditions]);

  const dismissCut = useCallback((cardName: string) => {
    setDismissedCuts((prev) => new Set(prev).add(cardName));
    toast({
      title: t('critique.dismissed').replace('{name}', cardName),
      description: t('critique.suggestionHidden'),
      action: (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-2 shrink-0"
          onClick={() => setDismissedCuts((prev) => {
            const next = new Set(prev);
            next.delete(cardName);
            return next;
          })}
        >
          <Undo2 className="h-3 w-3" />
          {t('critique.undo')}
        </Button>
      ),
    });
  }, []);

  const dismissAddition = useCallback((cardName: string) => {
    setDismissedAdditions((prev) => new Set(prev).add(cardName));
    toast({
      title: t('critique.dismissed').replace('{name}', cardName),
      description: t('critique.suggestionHidden'),
      action: (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-2 shrink-0"
          onClick={() => setDismissedAdditions((prev) => {
            const next = new Set(prev);
            next.delete(cardName);
            return next;
          })}
        >
          <Undo2 className="h-3 w-3" />
          {t('critique.undo')}
        </Button>
      ),
    });
  }, []);

  const handleCritique = useCallback(async () => {
    if (cards.length < 5) {
      toast({ title: t('critique.minCards'), variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('deck-critique', {
        body: {
          commander: commanderName,
          cards: cards.map((c) => ({ name: c.card_name, category: c.category, quantity: c.quantity })),
          color_identity: colorIdentity,
          format,
        },
      });

      if (error) {
        toast({ title: t('critique.failed'), description: t('critique.failedDesc'), variant: 'destructive' });
        return;
      }

      if (data?.error) {
        toast({ title: 'Critique failed', description: data.error, variant: 'destructive' });
        return;
      }

      setCritique(data);
      saveCritique(cacheKey, data);
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [cards, commanderName, colorIdentity, format, cacheKey]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <MessageSquareWarning className="h-3.5 w-3.5 text-accent" />
          AI Critique
        </h4>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCritique}
          disabled={loading || cards.length < 5}
          className="h-6 text-[10px] gap-1 px-2"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquareWarning className="h-3 w-3" />}
          {critique ? 'Re-critique' : 'Get Critique'}
        </Button>
      </div>

      {!critique && !loading && (
        <p className="text-[11px] text-muted-foreground">
          Get AI-powered feedback on what to cut and add to sharpen your deck.
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground ml-2">Analyzing your deck…</span>
        </div>
      )}

      {critique && !loading && (
        <div className="space-y-4">
          {/* Summary + confidence */}
          <div className="bg-secondary/30 rounded-lg p-2.5 space-y-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {critique.summary}
            </p>
            {critique.confidence != null && (
              <>
                <ConfidenceIndicator value={critique.confidence} />
                {critique.confidence < 0.5 && <LowConfidenceWarning />}
              </>
            )}
          </div>

          {/* Cuts */}
          {visibleCuts.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[11px] font-semibold text-destructive flex items-center gap-1">
                <Scissors className="h-3 w-3" />
                Suggested Cuts ({visibleCuts.length})
              </h5>
              {visibleCuts.map((cut) => {
                const sev = SEVERITY_CONFIG[cut.severity] || SEVERITY_CONFIG.weak;
                return (
                  <div key={cut.card_name} className="rounded-lg border border-border bg-card/50 p-2 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <CardHoverImage cardName={cut.card_name} scryfallCache={effectiveCache}>
                        <span className="text-xs font-medium text-foreground cursor-default">{cut.card_name}</span>
                      </CardHoverImage>
                      <Badge variant="outline" className={cn('text-[9px] px-1 py-0 h-4', sev.className)}>
                        {t(SEVERITY_KEYS[cut.severity] || 'critique.severityWeak')}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => dismissCut(cut.card_name)}
                        title={`Dismiss suggestion for ${cut.card_name}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{cut.reason}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Additions */}
          {visibleAdditions.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-[11px] font-semibold text-accent flex items-center gap-1">
                <Plus className="h-3 w-3" />
                Suggested Additions ({visibleAdditions.length})
              </h5>
              {visibleAdditions.map((add) => (
                <div key={add.card_name} className="rounded-lg border border-border bg-card/50 p-2 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CardHoverImage cardName={add.card_name} scryfallCache={effectiveCache}>
                        <span className="text-xs font-medium text-foreground truncate cursor-default">{add.card_name}</span>
                      </CardHoverImage>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0">
                        {add.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {add.replaces && onRemoveByName && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1.5 text-[9px] gap-0.5 text-primary hover:text-primary font-medium"
                          onClick={() => {
                            onRemoveByName(add.replaces!);
                            onAddSuggestion(add.card_name);
                            toast({ title: 'Swapped', description: `${add.replaces} → ${add.card_name}` });
                          }}
                          title={`Replace ${add.replaces} with ${add.card_name}`}
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          Swap
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 shrink-0 text-accent hover:text-accent"
                        onClick={() => onAddSuggestion(add.card_name)}
                        title={`Add ${add.card_name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-4 w-4 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => dismissAddition(add.card_name)}
                        title={`Dismiss suggestion for ${add.card_name}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">{add.reason}</p>
                  {add.replaces && (
                    <p className="text-[10px] text-destructive/70 italic">Replaces: {add.replaces}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Dismissed summary */}
          {(dismissedCuts.size > 0 || dismissedAdditions.size > 0) && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
              <span className="text-[10px] text-muted-foreground">
                {dismissedCuts.size + dismissedAdditions.size} suggestion{dismissedCuts.size + dismissedAdditions.size !== 1 ? 's' : ''} dismissed
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 text-[10px] px-2 text-primary hover:text-primary"
                onClick={() => {
                  setDismissedCuts(new Set());
                  setDismissedAdditions(new Set());
                }}
              >
                Show all
              </Button>
            </div>
          )}

          {/* Mana curve notes */}
          {critique.mana_curve_notes && (
            <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">
              📊 {critique.mana_curve_notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
