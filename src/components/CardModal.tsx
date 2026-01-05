/**
 * Modal/drawer component for displaying detailed card information.
 * Shows card image, oracle text, prices, printings, and format legality.
 * Uses Dialog on desktop and Drawer on mobile for optimal UX.
 * @module components/CardModal
 */

import { useState, useEffect } from "react";
import { ScryfallCard } from "@/types/card";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { getCardPrintings, getTCGPlayerUrl, getCardmarketUrl, CardPrinting } from "@/lib/card-printings";
import { ManaCost } from "./ManaSymbol";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, ShoppingCart, Loader2, Palette, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAnalytics } from "@/hooks/useAnalytics";

// Format names that need special handling
const FORMAT_DISPLAY_NAMES: Record<string, string> = {
  paupercommander: "Pauper Commander",
  duel: "Duel Commander",
  oldschool: "Old School",
  premodern: "Premodern",
  predh: "PreDH",
  oathbreaker: "Oathbreaker",
  gladiator: "Gladiator",
  historicbrawl: "Historic Brawl",
  standardbrawl: "Standard Brawl",
  timeless: "Timeless",
  explorer: "Explorer",
  penny: "Penny Dreadful",
};

function formatFormatName(format: string): string {
  if (FORMAT_DISPLAY_NAMES[format]) {
    return FORMAT_DISPLAY_NAMES[format];
  }
  // Capitalize first letter for simple formats
  return format.charAt(0).toUpperCase() + format.slice(1);
}

interface CardModalProps {
  /** The card to display, or null if closed */
  card: ScryfallCard | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * Displays detailed card information in a modal (desktop) or drawer (mobile).
 * Includes tabs for details, printings, and format legality.
 * Fetches fresh pricing data when opened.
 */
export function CardModal({ card, open, onClose }: CardModalProps) {
  const isMobile = useIsMobile();
  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [isLoadingPrintings, setIsLoadingPrintings] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [refreshedPrices, setRefreshedPrices] = useState<{usd?: string; eur?: string} | null>(null);
  const { trackCardModalView, trackAffiliateClick } = useAnalytics();

  useEffect(() => {
    if (card && open) {
      setIsLoadingPrintings(true);
      setRefreshedPrices(null);
      
      // Track modal view
      trackCardModalView({
        card_id: card.id,
        card_name: card.name,
        set_code: card.set,
      });
      
      getCardPrintings(card.name)
        .then((data) => {
          setPrintings(data);
          // Find the matching printing to get fresh price data
          const matchingPrinting = data.find(p => p.id === card.id);
          if (matchingPrinting && (matchingPrinting.prices.usd || matchingPrinting.prices.eur)) {
            setRefreshedPrices({
              usd: matchingPrinting.prices.usd,
              eur: matchingPrinting.prices.eur
            });
          }
        })
        .finally(() => setIsLoadingPrintings(false));
    } else {
      setPrintings([]);
      setRefreshedPrices(null);
    }
  }, [card, open, trackCardModalView]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (card) {
      trackCardModalView({
        card_id: card.id,
        card_name: card.name,
        set_code: card.set,
        tab_viewed: tab,
      });
    }
  };

  const handleAffiliateClick = (affiliate: "tcgplayer" | "cardmarket", url: string) => {
    trackAffiliateClick({
      card_id: card?.id,
      card_name: card?.name,
      affiliate,
      price_usd: displayPrices.usd,
      price_eur: displayPrices.eur,
    });
    window.open(url, "_blank");
  };

  // Use refreshed prices if available, otherwise fall back to original card prices
  const displayPrices = {
    usd: refreshedPrices?.usd || card?.prices.usd,
    eur: refreshedPrices?.eur || card?.prices.eur
  };

  if (!card) return null;

  const imageUrl = getCardImage(card, "large");

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

  const content = (
    <div className={cn(
      "flex flex-col",
      isMobile ? "h-full" : "grid md:grid-cols-[280px_1fr] max-h-[85vh]"
    )}>
      {/* Card Image Section */}
      <div className={cn(
        "bg-muted/30 flex flex-col items-center",
        isMobile ? "p-4 pb-3" : "p-5 border-r border-border/50"
      )}>
        <div className={cn(
          "flex gap-4 w-full",
          isMobile ? "items-start" : "flex-col items-center"
        )}>
          <img
            src={imageUrl}
            alt={card.name}
            className={cn(
              "rounded-xl shadow-lg",
              isMobile ? "w-24 flex-shrink-0" : "w-full max-w-[220px]"
            )}
          />
          
          {isMobile && (
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <h2 className="text-base font-semibold text-foreground tracking-tight line-clamp-2">
                  {card.name}
                </h2>
                <p className="text-xs text-muted-foreground line-clamp-1">{card.type_line}</p>
                {card.mana_cost && (
                  <div className="mt-1.5">
                    <ManaCost cost={card.mana_cost} size="sm" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className={cn(
          "w-full",
          isMobile ? "mt-3 flex gap-2" : "mt-3 max-w-[220px] space-y-2"
        )}>
          <Button
            size="sm"
            className={cn("gap-2", isMobile ? "flex-1 h-9 text-xs" : "w-full")}
            onClick={() => handleAffiliateClick("tcgplayer", getTCGPlayerUrl(card))}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            TCGPlayer
            {displayPrices.usd ? (
              <span className="ml-auto font-semibold">${displayPrices.usd}</span>
            ) : isLoadingPrintings ? (
              <Loader2 className="ml-auto h-3 w-3 animate-spin" />
            ) : null}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", isMobile ? "flex-1 h-9 text-xs" : "w-full")}
            onClick={() => handleAffiliateClick("cardmarket", getCardmarketUrl(card))}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Cardmarket
            {displayPrices.eur ? (
              <span className="ml-auto font-semibold">€{displayPrices.eur}</span>
            ) : isLoadingPrintings ? (
              <Loader2 className="ml-auto h-3 w-3 animate-spin" />
            ) : null}
          </Button>
        </div>
      </div>

      {/* Card Details Section */}
      <div className="flex flex-col min-h-0 flex-1">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <div className={cn("border-b border-border/50", isMobile ? "px-4 py-3" : "p-4")}>
            {!isMobile && (
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground tracking-tight">
                    {card.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{card.type_line}</p>
                </div>
                {card.mana_cost && (
                  <ManaCost cost={card.mana_cost} size="md" />
                )}
              </div>
            )}
            
            <TabsList className="w-full h-9 p-1 bg-muted/50">
              <TabsTrigger value="details" className="flex-1 text-xs h-7">Details</TabsTrigger>
              <TabsTrigger value="printings" className="flex-1 text-xs h-7 gap-1">
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

          <TabsContent value="details" className="flex-1 m-0 min-h-0 overflow-auto">
            <div className={cn("space-y-4", isMobile ? "p-4" : "p-4")}>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={getRarityVariant(card.rarity) as any} className="capitalize">
                  {card.rarity}
                </Badge>
                <Badge variant="secondary">{card.set_name}</Badge>
              </div>

              {card.oracle_text && (
                <div className="space-y-1.5">
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
          </TabsContent>

          <TabsContent value="printings" className="flex-1 m-0 min-h-0 overflow-auto">
            <div className="p-4">
              {isLoadingPrintings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : englishPrintings.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 text-sm">
                  No printings found
                </p>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_60px_60px] gap-2 px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                    <span>Set</span>
                    <span className="text-right">USD</span>
                    <span className="text-right">EUR</span>
                  </div>
                  
                  {englishPrintings.slice(0, 20).map((printing) => (
                    <div
                      key={printing.id}
                      className="grid grid-cols-[1fr_60px_60px] gap-2 px-2 py-2 rounded-lg hover:bg-muted/50 text-sm items-center"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "h-2 w-2 rounded-full flex-shrink-0",
                          printing.rarity === "mythic" && "bg-orange-500",
                          printing.rarity === "rare" && "bg-amber-500",
                          printing.rarity === "uncommon" && "bg-slate-400",
                          printing.rarity === "common" && "bg-slate-600"
                        )} />
                        <span className="truncate text-foreground text-xs">{printing.set_name}</span>
                      </div>
                      <span className="text-right font-medium text-emerald-500 text-xs">
                        {printing.prices.usd ? `$${printing.prices.usd}` : "—"}
                      </span>
                      <span className="text-right font-medium text-blue-500 text-xs">
                        {printing.prices.eur ? `€${printing.prices.eur}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="legality" className="flex-1 m-0 min-h-0 overflow-auto">
            <div className="p-4">
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(card.legalities).map(([format, status]) => (
                  <div
                    key={format}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-muted/30 border border-border/30"
                  >
                    <span className="text-xs text-foreground">{formatFormatName(format)}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize h-5",
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose} modal={false}>
        <DrawerContent className="max-h-[90vh] px-0 overflow-hidden">
          <VisuallyHidden>
            <DrawerTitle>{card.name}</DrawerTitle>
          </VisuallyHidden>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex-1 overflow-y-auto overscroll-contain max-h-[calc(90vh-2rem)]">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-[95vw] p-0 bg-background border-border/50 overflow-hidden max-h-[85vh] gap-0">
        <VisuallyHidden>
          <DialogTitle>{card.name}</DialogTitle>
        </VisuallyHidden>
        {content}
      </DialogContent>
    </Dialog>
  );
}

export default CardModal;
