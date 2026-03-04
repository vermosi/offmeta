/**
 * Deck Ideas panel — shows AI-generated deck concepts.
 * @module components/DeckIdeasPanel
 */

import type { DeckIdea } from '@/hooks/useDeckIdeas';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Star, Puzzle, DollarSign, ExternalLink } from 'lucide-react';

interface DeckIdeasPanelProps {
  data: DeckIdea | null | undefined;
  isLoading: boolean;
  query: string;
}

function CardList({
  title,
  icon: Icon,
  cards,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  cards: string[];
}) {
  if (cards.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <Badge variant="secondary" size="sm" className="ml-1">
          {cards.length}
        </Badge>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <a
            key={card}
            href={`https://scryfall.com/search?q=!"${encodeURIComponent(card)}"`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border/30 hover:border-primary/30 hover:bg-muted/50 transition-colors text-sm"
          >
            <span className="flex-1 truncate text-foreground">{card}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}

export function DeckIdeasPanel({ data, isLoading, query }: DeckIdeasPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Include words like &quot;deck&quot;, &quot;build&quot;, or &quot;commander&quot; in your search
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Try &quot;Simic landfall commander deck&quot; or &quot;budget aristocrats build&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">{data.archetype}</h3>
        </div>
        <p className="text-sm leading-relaxed text-foreground/80">{data.strategy}</p>
      </div>

      <CardList title="Key Cards" icon={Star} cards={data.keyCards} />
      <CardList title="Synergy Pieces" icon={Puzzle} cards={data.synergyPieces} />
      <CardList title="Budget Options" icon={DollarSign} cards={data.budgetOptions} />

      {/* CTA to build in deckbuilder */}
      <div className="text-center pt-2">
        <a
          href="/deckbuilder"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Puzzle className="h-4 w-4" />
          Start Building This Deck
        </a>
      </div>
    </div>
  );
}
