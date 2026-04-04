import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { OracleText } from '@/components/ManaSymbol';
import { ChevronDown, ChevronUp, ExternalLink, Sparkles } from 'lucide-react';
import type { Combo } from '@/components/find-my-combos/types';

interface ComboItemProps {
  combo: Combo;
  expanded: boolean;
  onToggle: () => void;
}

export function ComboItem({ combo, expanded, onToggle }: ComboItemProps) {
  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors p-3 group">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1 mb-1.5">
                {combo.cards
                  .filter((card) => !card.name.startsWith('[Any]'))
                  .map((card, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      <OracleText text={card.name} size="sm" />
                    </Badge>
                  ))}
                {combo.cards
                  .filter((card) => card.name.startsWith('[Any]'))
                  .map((card, index) => (
                    <Badge
                      key={`t-${index}`}
                      variant="outline"
                      className="text-xs font-normal italic"
                    >
                      <OracleText
                        text={card.name.replace('[Any] ', '')}
                        size="sm"
                      />
                    </Badge>
                  ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {combo.produces.slice(0, 3).map((produce, index) => (
                  <span
                    key={index}
                    className="text-xs text-primary/80 flex items-center gap-0.5"
                  >
                    <Sparkles className="h-3 w-3" />
                    <OracleText text={produce} size="sm" />
                  </span>
                ))}
                {combo.produces.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{combo.produces.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              {combo.identity && (
                <Badge variant="outline" className="text-xs">
                  {combo.identity}
                </Badge>
              )}
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border border-t-0 border-border/50 rounded-b-lg bg-background p-3 space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {combo.cards
              .filter((card) => card.imageUrl)
              .map((card, index) => (
                <img
                  key={index}
                  src={card.imageUrl}
                  alt={card.name}
                  className="h-32 rounded-md flex-shrink-0"
                  loading="lazy"
                />
              ))}
          </div>

          {combo.description && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Steps
              </p>
              <ol className="text-xs space-y-0.5 list-decimal list-inside text-foreground/90">
                {combo.description
                  .split('\n')
                  .filter(Boolean)
                  .map((step, index) => (
                    <li key={index}>
                      <OracleText
                        text={step.replace(/^\d+\.\s*/, '')}
                        size="sm"
                      />
                    </li>
                  ))}
              </ol>
            </div>
          )}

          {combo.prerequisites && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Prerequisites
              </p>
              <ul className="text-xs space-y-0.5 list-disc list-inside text-foreground/70">
                {combo.prerequisites
                  .split('\n')
                  .filter(Boolean)
                  .map((prerequisite, index) => (
                    <li key={index}>
                      <OracleText text={prerequisite} size="sm" />
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            {combo.prices?.tcgplayer && (
              <span className="text-xs text-muted-foreground">
                Combo cost: ~${combo.prices.tcgplayer}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              asChild
            >
              <a
                href={`https://commanderspellbook.com/combo/${combo.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Commander Spellbook
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
