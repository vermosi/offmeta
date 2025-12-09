import { useState } from "react";
import { DeckCard } from "@/lib/deck";
import { groupCardsByType, getTypeIcon, CardTypeGroup } from "@/lib/card-grouping";
import { DeckListItem } from "./DeckListItem";
import { ScryfallCard } from "@/types/card";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupedDeckListProps {
  cards: DeckCard[];
  onAddCard: (card: ScryfallCard) => void;
  onRemoveCard: (cardId: string) => void;
  onRemoveAllCopies: (cardId: string) => void;
}

export function GroupedDeckList({
  cards,
  onAddCard,
  onRemoveCard,
  onRemoveAllCopies,
}: GroupedDeckListProps) {
  const groups = groupCardsByType(cards);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (type: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  if (cards.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Click cards to add them to your deck
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {groups.map((group) => {
        const isCollapsed = collapsedGroups.has(group.type);
        
        return (
          <div key={group.type}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.type)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span>{getTypeIcon(group.type)}</span>
              <span className="flex-1 text-left">{group.type}</span>
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {group.count}
              </span>
            </button>
            
            {/* Group cards */}
            {!isCollapsed && (
              <div className="pl-4 space-y-0.5">
                {group.cards.map((dc) => (
                  <DeckListItem
                    key={dc.card.id}
                    deckCard={dc}
                    onAdd={() => onAddCard(dc.card)}
                    onRemove={() => onRemoveCard(dc.card.id)}
                    onRemoveAll={() => onRemoveAllCopies(dc.card.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
