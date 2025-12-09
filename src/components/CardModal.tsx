import { useState, useEffect } from "react";
import { ScryfallCard } from "@/types/card";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { getCardPrintings, getTCGPlayerUrl, getCardmarketUrl, CardPrinting } from "@/lib/card-printings";
import { ManaCost } from "./ManaSymbol";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, ShoppingCart, Loader2 } from "lucide-react";
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

  const legalFormats = Object.entries(card.legalities)
    .filter(([_, status]) => status === "legal")
    .map(([format]) => format);

  // Filter English printings only, sorted by release date (newest first)
  const englishPrintings = printings
    .filter((p) => p.lang === "en")
    .sort((a, b) => new Date(b.released_at).getTime() - new Date(a.released_at).getTime());

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 bg-card border-border overflow-hidden max-h-[90vh]">
        <VisuallyHidden>
          <DialogTitle>{card.name}</DialogTitle>
        </VisuallyHidden>
        <div className="grid md:grid-cols-[340px_1fr] gap-0 h-full">
          {/* Card Image */}
          <div className="relative bg-gradient-to-br from-muted to-background p-6 flex flex-col items-center justify-start">
            <div className="relative animate-float sticky top-6">
              <img
                src={imageUrl}
                alt={card.name}
                className="w-full max-w-[280px] rounded-xl shadow-2xl shadow-black/50"
              />
              <div className="absolute inset-0 rounded-xl glow-gold opacity-30" />
            </div>
            
            {/* Buy buttons */}
            <div className="mt-4 w-full max-w-[280px] space-y-2">
              <Button
                variant="gold"
                className="w-full gap-2"
                onClick={() => window.open(getTCGPlayerUrl(card), "_blank")}
              >
                <ShoppingCart className="h-4 w-4" />
                Buy on TCGPlayer
                {card.prices.usd && (
                  <span className="ml-auto">${card.prices.usd}</span>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => window.open(getCardmarketUrl(card), "_blank")}
              >
                <ShoppingCart className="h-4 w-4" />
                Cardmarket
                {card.prices.eur && (
                  <span className="ml-auto">€{card.prices.eur}</span>
                )}
              </Button>
            </div>
          </div>

          {/* Card Details */}
          <div className="flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      {card.name}
                    </h2>
                    <p className="text-muted-foreground mt-1">{card.type_line}</p>
                  </div>
                  {card.mana_cost && (
                    <ManaCost cost={card.mana_cost} size="lg" />
                  )}
                </div>
                
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="printings" className="gap-1">
                    Printings
                    {!isLoadingPrintings && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {englishPrintings.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="legality">Legality</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="flex-1 m-0 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("capitalize", rarityClass)}>
                        {card.rarity}
                      </Badge>
                      <Badge variant="secondary">{card.set_name}</Badge>
                    </div>

                    {card.oracle_text && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          Card Text
                        </h3>
                        <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                          {card.oracle_text}
                        </p>
                      </div>
                    )}

                    {card.flavor_text && (
                      <p className="text-muted-foreground italic border-l-2 border-primary/30 pl-4">
                        {card.flavor_text}
                      </p>
                    )}

                    {(card.power || card.toughness) && (
                      <div className="inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-lg">
                        <span className="font-bold text-foreground">{card.power}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-bold text-foreground">{card.toughness}</span>
                      </div>
                    )}

                    {card.artist && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Artist
                        </h3>
                        <p className="text-foreground">{card.artist}</p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open(card.scryfall_uri, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Scryfall
                    </Button>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="printings" className="flex-1 m-0 min-h-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {isLoadingPrintings ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : englishPrintings.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No printings found
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {/* Header */}
                        <div className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
                          <span>Set</span>
                          <span className="text-right">USD</span>
                          <span className="text-right">EUR</span>
                          <span className="text-right">TIX</span>
                        </div>
                        
                        {englishPrintings.map((printing) => (
                          <div
                            key={printing.id}
                            className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-2 py-2 rounded hover:bg-muted/50 text-sm items-center"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn(
                                "h-2 w-2 rounded-full flex-shrink-0",
                                printing.rarity === "mythic" && "bg-orange-400",
                                printing.rarity === "rare" && "bg-amber-400",
                                printing.rarity === "uncommon" && "bg-slate-300",
                                printing.rarity === "common" && "bg-slate-500"
                              )} />
                              <span className="truncate">{printing.set_name}</span>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                #{printing.collector_number}
                              </span>
                            </div>
                            <span className="text-right font-medium text-green-400">
                              {printing.prices.usd ? `$${printing.prices.usd}` : "—"}
                            </span>
                            <span className="text-right font-medium text-blue-400">
                              {printing.prices.eur ? `€${printing.prices.eur}` : "—"}
                            </span>
                            <span className="text-right text-muted-foreground">
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
                  <div className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(card.legalities).map(([format, status]) => (
                        <div
                          key={format}
                          className="flex items-center justify-between px-3 py-2 rounded bg-muted/30"
                        >
                          <span className="text-sm capitalize">{format}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              status === "legal" && "bg-green-500/10 text-green-400 border-green-500/30",
                              status === "not_legal" && "bg-muted text-muted-foreground border-border",
                              status === "banned" && "bg-red-500/10 text-red-400 border-red-500/30",
                              status === "restricted" && "bg-amber-500/10 text-amber-400 border-amber-500/30"
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
