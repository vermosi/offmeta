import { useState } from "react";
import { Deck, DeckCard, getDeckCardCount, exportDeckList, addCardToDeck, removeCardFromDeck } from "@/lib/deck";
import { GroupedDeckList } from "./GroupedDeckList";
import { ManaCurveChart } from "./ManaCurveChart";
import { ColorPieChart } from "./ColorPieChart";
import { PriceCalculator } from "./PriceCalculator";
import { FormatValidator } from "./FormatValidator";
import { SampleHand } from "./SampleHand";
import { DeckImport } from "./DeckImport";
import { DeckStats } from "./DeckStats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Library, Edit2, Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { ScryfallCard } from "@/types/card";
import { DeckFormat } from "@/lib/format-validation";

interface DeckPanelProps {
  deck: Deck;
  onDeckChange: (deck: Deck) => void;
  onClearDeck: () => void;
}

export function DeckPanel({ deck, onDeckChange, onClearDeck }: DeckPanelProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [deckName, setDeckName] = useState(deck.name);
  const [activeTab, setActiveTab] = useState<"mainboard" | "sideboard">("mainboard");
  const [selectedFormat, setSelectedFormat] = useState<DeckFormat>("modern");

  const mainboardCount = getDeckCardCount(deck, "mainboard");
  const sideboardCount = getDeckCardCount(deck, "sideboard");

  const handleSaveName = () => {
    onDeckChange({ ...deck, name: deckName });
    setIsEditingName(false);
  };

  const handleExport = () => {
    const deckList = exportDeckList(deck);
    navigator.clipboard.writeText(deckList);
    toast.success("Copied to clipboard");
  };

  const handleDownload = () => {
    const deckList = exportDeckList(deck);
    const blob = new Blob([deckList], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${deck.name.replace(/[^a-z0-9]/gi, "_")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
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

  return (
    <div className="h-full flex flex-col bg-card/50 border-l border-border/50">
      {/* Header */}
      <div className="p-4 border-b border-border/50 space-y-3">
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Library className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h2 className="font-medium text-sm truncate">{deck.name}</h2>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 flex-shrink-0"
                onClick={() => setIsEditingName(true)}
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground tabular-nums">
            <span className="text-foreground font-medium">{mainboardCount}</span> cards
            {sideboardCount > 0 && (
              <span className="ml-1.5">
                · <span className="text-foreground font-medium">{sideboardCount}</span> sideboard
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <DeckImport deck={deck} onDeckChange={onDeckChange} />
            <SampleHand deck={deck} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="flex-1 h-8 gap-1.5 text-xs" onClick={handleExport}>
            <Copy className="h-3 w-3" />
            Copy
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 h-8 gap-1.5 text-xs" onClick={handleDownload}>
            <Download className="h-3 w-3" />
            Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={onClearDeck}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <ScrollArea className="flex-shrink-0 max-h-[380px]">
        <div className="p-4 space-y-4 border-b border-border/50">
          <FormatValidator
            deck={deck}
            selectedFormat={selectedFormat}
            onFormatChange={setSelectedFormat}
          />
          <DeckStats deck={deck} />
          <ManaCurveChart deck={deck} />
          <ColorPieChart deck={deck} />
          <PriceCalculator deck={deck} />
        </div>
      </ScrollArea>

      {/* Card List */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "mainboard" | "sideboard")} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 grid grid-cols-2 h-9">
          <TabsTrigger value="mainboard" className="text-xs">
            Main ({mainboardCount})
          </TabsTrigger>
          <TabsTrigger value="sideboard" className="text-xs">
            Side ({sideboardCount})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="mainboard" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <GroupedDeckList
                cards={deck.mainboard}
                onAddCard={(card) => handleAddCard(card, "mainboard")}
                onRemoveCard={(cardId) => handleRemoveCard(cardId, "mainboard")}
                onRemoveAllCopies={(cardId) => handleRemoveAllCopies(cardId, "mainboard")}
              />
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="sideboard" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3">
              <GroupedDeckList
                cards={deck.sideboard}
                onAddCard={(card) => handleAddCard(card, "sideboard")}
                onRemoveCard={(cardId) => handleRemoveCard(cardId, "sideboard")}
                onRemoveAllCopies={(cardId) => handleRemoveAllCopies(cardId, "sideboard")}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}