import { useState } from "react";
import { Deck, DeckCard, getDeckCardCount, exportDeckList, addCardToDeck, removeCardFromDeck } from "@/lib/deck";
import { DeckListItem } from "./DeckListItem";
import { ManaCurveChart } from "./ManaCurveChart";
import { ColorPieChart } from "./ColorPieChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Download, Trash2, Library, Edit2, Check, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScryfallCard } from "@/types/card";

interface DeckPanelProps {
  deck: Deck;
  onDeckChange: (deck: Deck) => void;
  onClearDeck: () => void;
}

export function DeckPanel({ deck, onDeckChange, onClearDeck }: DeckPanelProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [deckName, setDeckName] = useState(deck.name);
  const [activeTab, setActiveTab] = useState<"mainboard" | "sideboard">("mainboard");

  const mainboardCount = getDeckCardCount(deck, "mainboard");
  const sideboardCount = getDeckCardCount(deck, "sideboard");

  const handleSaveName = () => {
    onDeckChange({ ...deck, name: deckName });
    setIsEditingName(false);
  };

  const handleExport = () => {
    const deckList = exportDeckList(deck);
    navigator.clipboard.writeText(deckList);
    toast.success("Deck list copied to clipboard!");
  };

  const handleAddCard = (card: ScryfallCard, board: "mainboard" | "sideboard") => {
    onDeckChange(addCardToDeck(deck, card, board));
  };

  const handleRemoveCard = (cardId: string, board: "mainboard" | "sideboard") => {
    onDeckChange(removeCardFromDeck(deck, cardId, board));
  };

  const handleRemoveAllCopies = (cardId: string, board: "mainboard" | "sideboard") => {
    const newDeck = { ...deck };
    newDeck[board] = deck[board].filter((dc) => dc.card.id !== cardId);
    onDeckChange(newDeck);
  };

  const sortedMainboard = [...deck.mainboard].sort((a, b) => a.card.cmc - b.card.cmc);
  const sortedSideboard = [...deck.sideboard].sort((a, b) => a.card.cmc - b.card.cmc);

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <Library className="h-5 w-5 text-primary" />
              <h2 className="font-display font-bold text-lg truncate">{deck.name}</h2>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-50 hover:opacity-100"
                onClick={() => setIsEditingName(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{mainboardCount}</span> cards
            {sideboardCount > 0 && (
              <span className="ml-2">
                / <span className="font-semibold text-foreground">{sideboardCount}</span> sideboard
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleExport}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onClearDeck}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 border-b border-border space-y-4">
        <ManaCurveChart deck={deck} />
        <ColorPieChart deck={deck} />
      </div>

      {/* Card List */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "mainboard" | "sideboard")} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 grid grid-cols-2">
          <TabsTrigger value="mainboard" className="text-xs">
            Mainboard ({mainboardCount})
          </TabsTrigger>
          <TabsTrigger value="sideboard" className="text-xs">
            Sideboard ({sideboardCount})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="mainboard" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5">
              {sortedMainboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click cards to add them to your deck
                </p>
              ) : (
                sortedMainboard.map((dc) => (
                  <DeckListItem
                    key={dc.card.id}
                    deckCard={dc}
                    onAdd={() => handleAddCard(dc.card, "mainboard")}
                    onRemove={() => handleRemoveCard(dc.card.id, "mainboard")}
                    onRemoveAll={() => handleRemoveAllCopies(dc.card.id, "mainboard")}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="sideboard" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-0.5">
              {sortedSideboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Right-click cards to add to sideboard
                </p>
              ) : (
                sortedSideboard.map((dc) => (
                  <DeckListItem
                    key={dc.card.id}
                    deckCard={dc}
                    onAdd={() => handleAddCard(dc.card, "sideboard")}
                    onRemove={() => handleRemoveCard(dc.card.id, "sideboard")}
                    onRemoveAll={() => handleRemoveAllCopies(dc.card.id, "sideboard")}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
