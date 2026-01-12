/**
 * Modal/drawer component for displaying detailed card information.
 * Shows card image, oracle text, prices, printings, and format legality.
 * Uses Dialog on desktop and Drawer on mobile for optimal UX.
 * Supports double-faced cards with a Transform button.
 * @module components/CardModal
 */

import { useState, useEffect } from "react";
import { ScryfallCard } from "@/types/card";
import { getCardImage, isDoubleFacedCard, getCardFaceDetails, getCardRulings, CardRuling } from "@/lib/scryfall";
import { getCardPrintings, getTCGPlayerUrl, getCardmarketUrl, CardPrinting } from "@/lib/card-printings";

import { ManaCost, OracleText } from "./ManaSymbol";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingCart, Loader2, Palette, X, RefreshCw, Sparkles, Monitor, Shield, ChevronDown, ChevronUp, Gavel } from "lucide-react";
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
  return format.charAt(0).toUpperCase() + format.slice(1);
}

interface CardModalProps {
  card: ScryfallCard | null;
  open: boolean;
  onClose: () => void;
}

export function CardModal({ card, open, onClose }: CardModalProps) {
  const isMobile = useIsMobile();
  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [isLoadingPrintings, setIsLoadingPrintings] = useState(false);
  const [refreshedPrices, setRefreshedPrices] = useState<{usd?: string; usd_foil?: string; eur?: string; eur_foil?: string} | null>(null);
  const [currentFace, setCurrentFace] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(null);
  const [rulings, setRulings] = useState<CardRuling[]>([]);
  const [isLoadingRulings, setIsLoadingRulings] = useState(false);
  const [showRulings, setShowRulings] = useState(false);
  const { trackCardModalView, trackAffiliateClick } = useAnalytics();

  const isDoubleFaced = card ? isDoubleFacedCard(card) : false;

  useEffect(() => {
    if (open) {
      setCurrentFace(0);
      setSelectedPrinting(null);
      setShowRulings(false);
      setRulings([]);
    }
  }, [card, open]);

  // Fetch rulings when modal opens
  useEffect(() => {
    if (card && open) {
      setIsLoadingRulings(true);
      getCardRulings(card.id).then((data) => {
        setRulings(data);
        setIsLoadingRulings(false);
      });
    }
  }, [card, open]);


  useEffect(() => {
    if (card && open) {
      trackCardModalView({ card_id: card.id, card_name: card.name, set_code: card.set });
      setIsLoadingPrintings(true);
      getCardPrintings(card.name).then((data) => {
        setPrintings(data);
        const currentPrinting = data.find(p => p.id === card.id);
        if (currentPrinting) {
          setRefreshedPrices({
            usd: currentPrinting.prices.usd,
            usd_foil: currentPrinting.prices.usd_foil,
            eur: currentPrinting.prices.eur,
            eur_foil: currentPrinting.prices.eur_foil
          });
        }
        setIsLoadingPrintings(false);
      });
    }
  }, [card, open, trackCardModalView]);

  const handleTransform = () => {
    if (!isDoubleFaced) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentFace(prev => (prev === 0 ? 1 : 0));
      setIsFlipping(false);
    }, 150);
  };

  const handleAffiliateClick = (marketplace: "tcgplayer" | "cardmarket" | "tcgplayer-foil" | "cardmarket-foil" | "cardhoarder", url: string, price?: string) => {
    const affiliateBase = import.meta.env.NEXT_PUBLIC_TCGPLAYER_IMPACT_BASE;
    const isAffiliateLink = marketplace.includes("tcgplayer") && !!affiliateBase;
    
    trackAffiliateClick({ 
      affiliate: marketplace, 
      card_name: card?.name, 
      card_id: card?.id,
      set_code: card?.set,
      is_affiliate_link: isAffiliateLink,
      price_usd: marketplace.includes("tcgplayer") ? price : undefined,
      price_eur: marketplace.includes("cardmarket") ? price : undefined,
      price_tix: marketplace === "cardhoarder" ? price : undefined,
    });
    window.open(url, "_blank");
  };

  if (!card) return null;

  const displayImageUrl = selectedPrinting?.image_uris?.large 
    ? selectedPrinting.image_uris.large 
    : getCardImage(card, "large", currentFace);
  const faceDetails = getCardFaceDetails(card, currentFace);

  const displaySetName = selectedPrinting?.set_name || card.set_name;
  const displayRarity = selectedPrinting?.rarity || card.rarity;
  const displayCollectorNumber = selectedPrinting?.collector_number || (card as any).collector_number || "";
  const displayArtist = selectedPrinting?.artist || card.artist;

  const displayPrices = refreshedPrices || {
    usd: card.prices.usd,
    usd_foil: card.prices.usd_foil,
    eur: card.prices.eur,
    eur_foil: (card.prices as any).eur_foil
  };

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

  // Toolbox links - expanded with more resources
  const cardNameEncoded = encodeURIComponent(card.name);
  const toolboxLinks = [
    { name: "EDHREC", url: `https://edhrec.com/route/?cc=${cardNameEncoded}` },
    { name: "Moxfield", url: `https://www.moxfield.com/decks/public?filter=${cardNameEncoded}` },
    { name: "MTGTop8", url: `https://mtgtop8.com/search?MD_check=1&SB_check=1&cards=${cardNameEncoded}` },
    { name: "Archidekt", url: `https://archidekt.com/search/decks?q=${cardNameEncoded}` },
    { name: "MTGGoldfish", url: `https://www.mtggoldfish.com/price/${card.name.replace(/ /g, '+')}` },
    { name: "Gatherer", url: `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=+[${cardNameEncoded}]` },
  ];

  // Get Cardhoarder URL for MTGO
  const getCardhoarderUrl = () => {
    const purchaseUris = (card as any).purchase_uris;
    if (purchaseUris?.cardhoarder) {
      return purchaseUris.cardhoarder;
    }
    return `https://www.cardhoarder.com/cards?data%5Bsearch%5D=${cardNameEncoded}`;
  };

  // Check if card has MTGO pricing
  const displayTix = selectedPrinting?.prices?.tix || (card.prices as any)?.tix;

  // Mobile-specific content - card-first ordering
  const mobileContent = (
    <div className="flex flex-col h-full">
      {/* Card Image - prominent */}
      <div className="bg-muted/30 p-4 flex flex-col items-center">
        <div className="relative w-full max-w-[180px] mx-auto">
          <img
            src={displayImageUrl}
            alt={faceDetails.name}
            className={cn(
              "rounded-xl shadow-lg w-full transition-transform duration-300",
              isFlipping && "scale-x-0"
            )}
          />
        </div>
        
        {/* Transform button for DFCs */}
        {isDoubleFaced && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 mt-3 w-full max-w-[180px]"
            onClick={handleTransform}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFlipping && "animate-spin")} />
            Transform
          </Button>
        )}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name, Type, Mana */}
        <div className="text-center space-y-1">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            {faceDetails.name}
          </h2>
          {faceDetails.mana_cost && (
            <div className="flex justify-center">
              <ManaCost cost={faceDetails.mana_cost} size="md" />
            </div>
          )}
          <p className="text-sm text-muted-foreground">{faceDetails.type_line}</p>
        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge variant={getRarityVariant(displayRarity) as any} className="capitalize">
            {displayRarity}
          </Badge>
          <Badge variant="secondary">
            {displaySetName}
            {displayCollectorNumber && ` #${displayCollectorNumber}`}
          </Badge>
          {(card as any).reserved && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
              <Shield className="h-3 w-3" />
              Reserved
            </Badge>
          )}
        </div>

        {/* Oracle Text - prominent */}
        {faceDetails.oracle_text && (
          <div className="space-y-1.5 bg-muted/20 rounded-lg p-3 border border-border/30">
            <div className="text-sm text-foreground leading-relaxed">
              <OracleText text={faceDetails.oracle_text} size="sm" />
            </div>
          </div>
        )}

        {/* Flavor Text */}
        {faceDetails.flavor_text && (
          <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
            <OracleText text={faceDetails.flavor_text} size="sm" />
          </div>
        )}

        {/* Power/Toughness */}
        {(faceDetails.power || faceDetails.toughness) && (
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-muted/50 rounded-lg border border-border/50">
              <span className="font-bold text-lg text-foreground">{faceDetails.power}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-bold text-lg text-foreground">{faceDetails.toughness}</span>
            </div>
          </div>
        )}

        {/* Artist */}
        {displayArtist && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Illustrated by</span>
            <span className="text-foreground font-medium">{displayArtist}</span>
          </div>
        )}

        {/* Rulings - collapsible */}
        {(rulings.length > 0 || isLoadingRulings) && (
          <div className="space-y-2">
            <button
              onClick={() => setShowRulings(!showRulings)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
            >
              <Gavel className="h-3.5 w-3.5" />
              <span>Rulings ({rulings.length})</span>
              {showRulings ? (
                <ChevronUp className="h-3.5 w-3.5 ml-auto" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 ml-auto" />
              )}
            </button>
            
            {showRulings && (
              <div className="space-y-2 pt-1">
                {isLoadingRulings ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  rulings.map((ruling, index) => (
                    <div 
                      key={`${ruling.published_at}-${index}`}
                      className="text-sm p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1"
                    >
                      <div className="text-foreground leading-relaxed">
                        <OracleText text={ruling.comment} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {ruling.source} • {new Date(ruling.published_at).toLocaleDateString('en-US', { 
                          year: 'numeric', month: 'short', day: 'numeric' 
                        })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Buy Section - compact */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Buy This Card
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {displayPrices.usd && (
              <Button
                size="sm"
                className="gap-1.5 justify-between text-xs"
                onClick={() => {
                  const url = selectedPrinting?.purchase_uris?.tcgplayer || getTCGPlayerUrl(card);
                  handleAffiliateClick("tcgplayer", url, displayPrices.usd);
                }}
              >
                <span>TCGplayer</span>
                <span className="font-semibold">${displayPrices.usd}</span>
              </Button>
            )}
            {displayPrices.eur && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 justify-between text-xs"
                onClick={() => {
                  const url = selectedPrinting?.purchase_uris?.cardmarket || getCardmarketUrl(card);
                  handleAffiliateClick("cardmarket", url, displayPrices.eur);
                }}
              >
                <span>Cardmarket</span>
                <span className="font-semibold">€{displayPrices.eur}</span>
              </Button>
            )}
          </div>
          {(displayPrices.usd_foil || displayPrices.eur_foil) && (
            <div className="grid grid-cols-2 gap-2">
              {displayPrices.usd_foil && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 justify-between text-xs"
                  onClick={() => {
                    const baseUrl = selectedPrinting?.purchase_uris?.tcgplayer || getTCGPlayerUrl(card);
                    const foilUrl = baseUrl.includes('?') ? `${baseUrl}&Printing=Foil` : `${baseUrl}?Printing=Foil`;
                    handleAffiliateClick("tcgplayer-foil", foilUrl, displayPrices.usd_foil);
                  }}
                >
                  <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Foil</span>
                  <span className="font-semibold">${displayPrices.usd_foil}</span>
                </Button>
              )}
              {displayPrices.eur_foil && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 justify-between text-xs"
                  onClick={() => {
                    const baseUrl = selectedPrinting?.purchase_uris?.cardmarket || getCardmarketUrl(card);
                    const foilUrl = baseUrl.includes('?') ? `${baseUrl}&isFoil=Y` : `${baseUrl}?isFoil=Y`;
                    handleAffiliateClick("cardmarket-foil", foilUrl, displayPrices.eur_foil);
                  }}
                >
                  <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" />Foil</span>
                  <span className="font-semibold">€{displayPrices.eur_foil}</span>
                </Button>
              )}
            </div>
          )}
          {isLoadingPrintings && !displayPrices.usd && !displayPrices.eur && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Legalities - compact 2-col grid, only show legal formats */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Legal In
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(card.legalities)
              .filter(([, status]) => status === "legal")
              .map(([format]) => (
                <Badge key={format} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
                  {formatFormatName(format)}
                </Badge>
              ))}
            {Object.entries(card.legalities).filter(([, status]) => status === "legal").length === 0 && (
              <span className="text-xs text-muted-foreground">Not legal in any format</span>
            )}
          </div>
        </div>

        {/* Printings - simplified for mobile */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Printings ({englishPrintings.length})
          </h3>
          {isLoadingPrintings ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {englishPrintings.slice(0, 8).map((printing) => (
                <button
                  key={printing.id}
                  onClick={() => {
                    setSelectedPrinting(printing);
                    setRefreshedPrices({
                      usd: printing.prices.usd,
                      usd_foil: printing.prices.usd_foil,
                      eur: printing.prices.eur,
                      eur_foil: printing.prices.eur_foil
                    });
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-muted/50 text-sm transition-colors",
                    (selectedPrinting?.id === printing.id || (!selectedPrinting && card.id === printing.id)) && "bg-primary/10 ring-1 ring-primary/30"
                  )}
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
                  <span className="text-xs font-medium text-emerald-500">
                    {printing.prices.usd ? `$${printing.prices.usd}` : printing.prices.eur ? `€${printing.prices.eur}` : "—"}
                  </span>
                </button>
              ))}
              {englishPrintings.length > 8 && (
                <p className="text-xs text-muted-foreground text-center py-1">
                  +{englishPrintings.length - 8} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Toolbox Links */}
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Toolbox
          </h3>
          <div className="flex flex-wrap gap-2">
            {toolboxLinks.slice(0, 4).map((link) => (
              <Button
                key={link.name}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => window.open(link.url, "_blank")}
              >
                <ExternalLink className="h-3 w-3" />
                {link.name}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-7"
              onClick={() => window.open(card.scryfall_uri, "_blank")}
            >
              <ExternalLink className="h-3 w-3" />
              Scryfall
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop content - original two-column layout
  const desktopContent = (
    <div className="grid md:grid-cols-[280px_1fr] max-h-[85vh]">
      {/* Card Image Section */}
      <div className="bg-muted/30 flex flex-col items-center p-5 border-r border-border/50">
        <div className="flex flex-col items-center w-full">
          <div className="relative w-full max-w-[220px]">
            <img
              src={displayImageUrl}
              alt={faceDetails.name}
              className={cn(
                "rounded-xl shadow-lg w-full transition-transform duration-300",
                isFlipping && "scale-x-0"
              )}
            />
          </div>
        </div>

        {/* Transform button for double-faced cards */}
        {isDoubleFaced && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 mt-3 max-w-[220px] w-full"
            onClick={handleTransform}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFlipping && "animate-spin")} />
            Transform
          </Button>
        )}
        
        {/* Buy Buttons */}
        <div className="w-full mt-3 max-w-[220px]">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Buy This Card
          </h3>
          <div className="space-y-1.5">
            {displayPrices.usd && (
              <Button
                size="sm"
                className="gap-2 w-full justify-between"
                onClick={() => {
                  const url = selectedPrinting?.purchase_uris?.tcgplayer || getTCGPlayerUrl(card);
                  handleAffiliateClick("tcgplayer", url, displayPrices.usd);
                }}
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  TCGplayer
                </span>
                <span className="font-semibold">${displayPrices.usd}</span>
              </Button>
            )}
            {displayPrices.usd_foil && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 w-full justify-between"
                onClick={() => {
                  const baseUrl = selectedPrinting?.purchase_uris?.tcgplayer || getTCGPlayerUrl(card);
                  const foilUrl = baseUrl.includes('?') ? `${baseUrl}&Printing=Foil` : `${baseUrl}?Printing=Foil`;
                  handleAffiliateClick("tcgplayer-foil", foilUrl, displayPrices.usd_foil);
                }}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  TCGplayer Foil
                </span>
                <span className="font-semibold">${displayPrices.usd_foil}</span>
              </Button>
            )}
            {displayPrices.eur && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 w-full justify-between"
                onClick={() => {
                  const url = selectedPrinting?.purchase_uris?.cardmarket || getCardmarketUrl(card);
                  handleAffiliateClick("cardmarket", url, displayPrices.eur);
                }}
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  Cardmarket
                </span>
                <span className="font-semibold">€{displayPrices.eur}</span>
              </Button>
            )}
            {displayPrices.eur_foil && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 w-full justify-between"
                onClick={() => {
                  const baseUrl = selectedPrinting?.purchase_uris?.cardmarket || getCardmarketUrl(card);
                  const foilUrl = baseUrl.includes('?') ? `${baseUrl}&isFoil=Y` : `${baseUrl}?isFoil=Y`;
                  handleAffiliateClick("cardmarket-foil", foilUrl, displayPrices.eur_foil);
                }}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Cardmarket Foil
                </span>
                <span className="font-semibold">€{displayPrices.eur_foil}</span>
              </Button>
            )}
            {displayTix && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 w-full justify-between"
                onClick={() => {
                  handleAffiliateClick("cardhoarder", getCardhoarderUrl(), displayTix);
                }}
              >
                <span className="flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5" />
                  Cardhoarder (MTGO)
                </span>
                <span className="font-semibold">{displayTix} tix</span>
              </Button>
            )}
            {isLoadingPrintings && !displayPrices.usd && !displayPrices.eur && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Details Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 p-5">
          {/* Header with Name & Mana Cost */}
          <div className="space-y-1.5 pr-8">
            <h2 className="text-lg font-semibold text-foreground tracking-tight">
              {faceDetails.name}
            </h2>
            {faceDetails.mana_cost && (
              <ManaCost cost={faceDetails.mana_cost} size="md" />
            )}
            <p className="text-sm text-muted-foreground">{faceDetails.type_line}</p>
          </div>

          {/* Set Info with Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getRarityVariant(displayRarity) as any} className="capitalize">
              {displayRarity}
            </Badge>
            <Badge variant="secondary">
              {displaySetName}
              {displayCollectorNumber && ` #${displayCollectorNumber}`}
            </Badge>
            {(card as any).reserved && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1">
                <Shield className="h-3 w-3" />
                Reserved List
              </Badge>
            )}
            {englishPrintings.length > 0 && (() => {
              const sortedByDate = [...englishPrintings].sort(
                (a, b) => new Date(a.released_at).getTime() - new Date(b.released_at).getTime()
              );
              const oldestId = sortedByDate[0]?.id;
              const currentId = selectedPrinting?.id || card.id;
              if (currentId === oldestId && englishPrintings.length > 1) {
                return (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    First Printing
                  </Badge>
                );
              }
              return null;
            })()}
            {englishPrintings.length === 1 && (
              <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                Only Printing
              </Badge>
            )}
            {englishPrintings.length > 1 && (() => {
              const uniqueArtists = new Set(englishPrintings.map(p => p.artist));
              const currentArtist = selectedPrinting?.artist || card.artist;
              const artistCount = englishPrintings.filter(p => p.artist === currentArtist).length;
              if (uniqueArtists.size > 1 && artistCount === 1) {
                return (
                  <Badge variant="outline" className="bg-pink-500/10 text-pink-600 border-pink-500/30">
                    Unique Art
                  </Badge>
                );
              }
              return null;
            })()}
          </div>

          {/* Oracle Text */}
          {faceDetails.oracle_text && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Card Text
              </h3>
              <div className="text-sm text-foreground">
                <OracleText text={faceDetails.oracle_text} size="sm" />
              </div>
            </div>
          )}

          {/* Flavor Text */}
          {faceDetails.flavor_text && (
            <div className="text-sm text-muted-foreground italic border-l-2 border-border pl-3">
              <OracleText text={faceDetails.flavor_text} size="sm" />
            </div>
          )}

          {/* Power/Toughness */}
          {(faceDetails.power || faceDetails.toughness) && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/50">
              <span className="font-semibold text-foreground">{faceDetails.power}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold text-foreground">{faceDetails.toughness}</span>
            </div>
          )}

          {/* Artist */}
          {displayArtist && (
            <div className="flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Illustrated by</span>
              <span className="text-foreground font-medium">{displayArtist}</span>
            </div>
          )}

          {/* Rulings */}
          {(rulings.length > 0 || isLoadingRulings) && (
            <div className="space-y-2">
              <button
                onClick={() => setShowRulings(!showRulings)}
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full"
              >
                <Gavel className="h-3.5 w-3.5" />
                <span>Rulings ({rulings.length})</span>
                {showRulings ? (
                  <ChevronUp className="h-3.5 w-3.5 ml-auto" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                )}
              </button>
              
              {showRulings && (
                <div className="space-y-2 pt-1">
                  {isLoadingRulings ? (
                    <div className="flex items-center justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : rulings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No rulings available.</p>
                  ) : (
                    rulings.map((ruling, index) => (
                      <div 
                        key={`${ruling.published_at}-${index}`}
                        className="text-sm p-3 rounded-lg bg-muted/30 border border-border/30 space-y-1"
                      >
                        <div className="text-foreground leading-relaxed">
                          <OracleText text={ruling.comment} size="sm" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ruling.source} • {new Date(ruling.published_at).toLocaleDateString('en-US', { 
                            year: 'numeric', month: 'short', day: 'numeric' 
                          })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Legality Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Format Legality
            </h3>
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

          {/* Printings Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Printings ({englishPrintings.length})
            </h3>
            {isLoadingPrintings ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : englishPrintings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">
                No printings found
              </p>
            ) : (
              <div className="space-y-1">
                <div className="grid grid-cols-[1fr_40px_40px_40px_40px_35px] gap-1 px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/50">
                  <span>Set</span>
                  <span className="text-right">USD</span>
                  <span className="text-right">Foil</span>
                  <span className="text-right">EUR</span>
                  <span className="text-right">Foil</span>
                  <span className="text-right">Tix</span>
                </div>
                
                {englishPrintings.slice(0, 15).map((printing) => (
                  <button
                    key={printing.id}
                    onClick={() => {
                      setSelectedPrinting(printing);
                      setRefreshedPrices({
                        usd: printing.prices.usd,
                        usd_foil: printing.prices.usd_foil,
                        eur: printing.prices.eur,
                        eur_foil: printing.prices.eur_foil
                      });
                    }}
                    className={cn(
                      "grid grid-cols-[1fr_40px_40px_40px_40px_35px] gap-1 px-2 py-2 rounded-lg hover:bg-muted/50 text-sm items-center w-full text-left transition-colors",
                      (selectedPrinting?.id === printing.id || (!selectedPrinting && card.id === printing.id)) && "bg-primary/10 ring-1 ring-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        printing.rarity === "mythic" && "bg-orange-500",
                        printing.rarity === "rare" && "bg-amber-500",
                        printing.rarity === "uncommon" && "bg-slate-400",
                        printing.rarity === "common" && "bg-slate-600"
                      )} />
                      <span className="truncate text-foreground text-xs">
                        {printing.set_name}
                        <span className="text-muted-foreground ml-1">#{printing.collector_number}</span>
                      </span>
                    </div>
                    <span className="text-right font-medium text-emerald-500 text-xs">
                      {printing.prices.usd ? `$${printing.prices.usd}` : "—"}
                    </span>
                    <span className="text-right font-medium text-purple-500 text-xs">
                      {printing.prices.usd_foil ? `$${printing.prices.usd_foil}` : "—"}
                    </span>
                    <span className="text-right font-medium text-blue-500 text-xs">
                      {printing.prices.eur ? `€${printing.prices.eur}` : "—"}
                    </span>
                    <span className="text-right font-medium text-indigo-400 text-xs">
                      {printing.prices.eur_foil ? `€${printing.prices.eur_foil}` : "—"}
                    </span>
                    <span className="text-right font-medium text-amber-500 text-xs">
                      {printing.prices.tix ? printing.prices.tix : "—"}
                    </span>
                  </button>
                ))}
                
                {englishPrintings.length > 15 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{englishPrintings.length - 15} more printings
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Toolbox Links */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Toolbox
            </h3>
            <div className="flex flex-wrap gap-2">
              {toolboxLinks.map((link) => (
                <Button
                  key={link.name}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  onClick={() => window.open(link.url, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                  {link.name}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-7"
                onClick={() => window.open(card.scryfall_uri, "_blank")}
              >
                <ExternalLink className="h-3 w-3" />
                Scryfall
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
            {mobileContent}
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
        {desktopContent}
      </DialogContent>
    </Dialog>
  );
}

export default CardModal;
