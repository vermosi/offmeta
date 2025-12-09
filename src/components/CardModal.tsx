import { useState, useEffect } from "react";
import { ScryfallCard } from "@/types/card";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { getCardPrintings, getTCGPlayerUrl, getCardmarketUrl, CardPrinting } from "@/lib/card-printings";
import { CollectionButton } from "./CollectionButton";
import { ManaCost } from "./ManaSymbol";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, ShoppingCart, Loader2, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CardModalProps {
  card: ScryfallCard | null;
  open: boolean;
  onClose: () => void;
}

export function CardModal({ card, open, onClose }: CardModalProps) {
  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [isLoadingPrintings, setIsLoadingPrintings] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    if (card && open) {
      setIsLoadingPrintings(true);
      getCardPrintings(card.name)
        .then(setPrintings)
        .finally(() => setIsLoadingPrintings(false));
    } else {
      setPrintings([]);
    }
  }, [card, open]);

  if (!card) return null;

  const imageUrl = getCardImage(card, "large");
  const rarityClass = getRarityColor(card.rarity);

  // Filter English printings only, sorted by release date (newest first)
  const englishPrintings = printings
    .filter((p) => p.lang === "en")
    .sort((a, b) => new Date(b.released_at).getTime() - new Date(a.released_at).getTime());

  const getRarityVariant = (rarity: string) => {
    switch (rarity) {
      case "mythic": return "mythic";
      case "rare": return "rare";
      case "uncommon": return "uncommon";
      case "common": return "common";
      default: return "secondary";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-background border-border/50 overflow-hidden max-h-[90vh] gap-0">
        <VisuallyHidden>
          <DialogTitle>{card.name}</DialogTitle>
        </VisuallyHidden>
        <div className="grid md:grid-cols-[320px_1fr] gap-0 h-full">
          {/* Card Image */}
          <div className="relative bg-muted/30 p-6 flex flex-col items-center justify-start border-r border-border/50">
            <div className="relative sticky top-6">
              <img
                src={imageUrl}
                alt={card.name}
                className="w-full max-w-[260px] rounded-xl shadow-lg transition-transform duration-300 hover:scale-[1.02]"
              />
            </div>
            
            {/* Collection button */}
            <div className="mt-4 w-full max-w-[260px]">
              <CollectionButton card={card} variant="full" />
            </div>
            
            {/* Buy buttons */}
            <div className="mt-3 w-full max-w-[260px] space-y-2">
              <Button
                className="w-full gap-2 h-9"
                onClick={() => window.open(getTCGPlayerUrl(card), "_blank")}
              >
                <ShoppingCart className="h-4 w-4" />
                TCGPlayer
                {card.prices.usd && (
                  <span className="ml-auto font-semibold">${card.prices.usd}</span>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2 h-9"
                onClick={() => window.open(getCardmarketUrl(card), "_blank")}
              >
                <ShoppingCart className="h-4 w-4" />
                Cardmarket
                {card.prices.eur && (
                  <span className="ml-auto font-semibold">€{card.prices.eur}</span>
                )}
              </Button>
            </div>
          </div>

          {/* Card Details */}
          <div className="flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="p-5 border-b border-border/50">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">
                      {card.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{card.type_line}</p>
                  </div>
                  {card.mana_cost && (
                    <ManaCost cost={card.mana_cost} size="lg" />
                  )}
                </div>
                
                <TabsList className="w-full h-9 p-1 bg-muted/50">
                  <TabsTrigger value="details" className="flex-1 text-xs h-7">Details</TabsTrigger>
                  <TabsTrigger value="printings" className="flex-1 text-xs h-7 gap-1.5">
                    Printings
                    {!isLoadingPrintings && (
                      <span className="text-[10px] bg-background/50 px-1.5 py-0.5 rounded-full">
                        {englishPrintings.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="legality" className="flex-1 text-xs h-7">Legality</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="flex-1 m-0 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-5 space-y-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getRarityVariant(card.rarity) as any} className="capitalize">
                        {card.rarity}
                      </Badge>
                      <Badge variant="secondary">{card.set_name}</Badge>
                    </div>

                    {card.oracle_text && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Card Text
                        </h3>
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {card.oracle_text}
                        </p>
                      </div>
                    )}

                    {card.flavor_text && (
                      <p className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
                        {card.flavor_text}
                      </p>
                    )}

                    {(card.power || card.toughness) && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
                        <span className="font-semibold text-foreground">{card.power}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-semibold text-foreground">{card.toughness}</span>
                      </div>
                    )}

                    {card.artist && (
                      <div className="flex items-center gap-2 text-sm">
                        <Palette className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Artist:</span>
                        <span className="text-foreground">{card.artist}</span>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => window.open(card.scryfall_uri, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View on Scryfall
                    </Button>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="printings" className="flex-1 m-0 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-5">
                    {isLoadingPrintings ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : englishPrintings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-12 text-sm">
                        No printings found
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {/* Header */}
                        <div className="grid grid-cols-[1fr_70px_70px_50px] gap-2 px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                          <span>Set</span>
                          <span className="text-right">USD</span>
                          <span className="text-right">EUR</span>
                          <span className="text-right">TIX</span>
                        </div>
                        
                        {englishPrintings.map((printing) => (
                          <div
                            key={printing.id}
                            className="grid grid-cols-[1fr_70px_70px_50px] gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/50 text-sm items-center transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "h-2 w-2 rounded-full flex-shrink-0",
                                printing.rarity === "mythic" && "bg-orange-500",
                                printing.rarity === "rare" && "bg-amber-500",
                                printing.rarity === "uncommon" && "bg-slate-400",
                                printing.rarity === "common" && "bg-slate-600"
                              )} />
                              <span className="truncate text-foreground">{printing.set_name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                #{printing.collector_number}
                              </span>
                            </div>
                            <span className="text-right font-medium text-emerald-500">
                              {printing.prices.usd ? `$${printing.prices.usd}` : "—"}
                            </span>
                            <span className="text-right font-medium text-blue-500">
                              {printing.prices.eur ? `€${printing.prices.eur}` : "—"}
                            </span>
                            <span className="text-right text-muted-foreground text-xs">
                              {printing.prices.tix || "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="legality" className="flex-1 m-0 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(card.legalities).map(([format, status]) => (
                        <div
                          key={format}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border/30"
                        >
                          <span className="text-sm capitalize text-foreground">{format}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              status === "legal" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
                              status === "not_legal" && "bg-muted text-muted-foreground border-border",
                              status === "banned" && "bg-red-500/10 text-red-500 border-red-500/30",
                              status === "restricted" && "bg-amber-500/10 text-amber-500 border-amber-500/30"
                            )}
                          >
                            {status.replace("_", " ")}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
