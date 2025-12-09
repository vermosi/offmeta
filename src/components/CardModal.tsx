import { ScryfallCard } from "@/types/card";
import { getCardImage, getRarityColor } from "@/lib/scryfall";
import { ManaCost } from "./ManaSymbol";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface CardModalProps {
  card: ScryfallCard | null;
  open: boolean;
  onClose: () => void;
}

export function CardModal({ card, open, onClose }: CardModalProps) {
  if (!card) return null;

  const imageUrl = getCardImage(card, "large");
  const rarityClass = getRarityColor(card.rarity);

  const legalFormats = Object.entries(card.legalities)
    .filter(([_, status]) => status === "legal")
    .map(([format]) => format);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-card border-border overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{card.name}</DialogTitle>
        </VisuallyHidden>
        <div className="grid md:grid-cols-2 gap-0">
          {/* Card Image */}
          <div className="relative bg-gradient-to-br from-muted to-background p-6 flex items-center justify-center">
            <div className="relative animate-float">
              <img
                src={imageUrl}
                alt={card.name}
                className="w-full max-w-[300px] rounded-xl shadow-2xl shadow-black/50"
              />
              <div className="absolute inset-0 rounded-xl glow-gold opacity-30" />
            </div>
          </div>

          {/* Card Details */}
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            <div className="flex items-start justify-between gap-4">
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

            <div className="mt-4 flex items-center gap-2">
              <Badge variant="outline" className={cn("capitalize", rarityClass)}>
                {card.rarity}
              </Badge>
              <Badge variant="secondary">{card.set_name}</Badge>
            </div>

            {card.oracle_text && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Card Text
                </h3>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {card.oracle_text}
                </p>
              </div>
            )}

            {card.flavor_text && (
              <div className="mt-4">
                <p className="text-muted-foreground italic border-l-2 border-primary/30 pl-4">
                  {card.flavor_text}
                </p>
              </div>
            )}

            {(card.power || card.toughness) && (
              <div className="mt-4 inline-flex items-center gap-1 px-3 py-1 bg-muted rounded-lg">
                <span className="font-bold text-foreground">{card.power}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-bold text-foreground">{card.toughness}</span>
              </div>
            )}

            {card.artist && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Artist
                </h3>
                <p className="text-foreground">{card.artist}</p>
              </div>
            )}

            {/* Prices */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Prices
              </h3>
              <div className="flex gap-4">
                {card.prices.usd && (
                  <div className="px-3 py-2 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">USD</span>
                    <p className="font-bold text-gold">${card.prices.usd}</p>
                  </div>
                )}
                {card.prices.usd_foil && (
                  <div className="px-3 py-2 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">Foil</span>
                    <p className="font-bold text-primary">${card.prices.usd_foil}</p>
                  </div>
                )}
                {card.prices.eur && (
                  <div className="px-3 py-2 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">EUR</span>
                    <p className="font-bold text-foreground">€{card.prices.eur}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Legality */}
            {legalFormats.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Legal In
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {legalFormats.slice(0, 8).map((format) => (
                    <Badge key={format} variant="outline" className="text-xs capitalize">
                      {format}
                    </Badge>
                  ))}
                  {legalFormats.length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{legalFormats.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <Button
                variant="gold"
                className="flex-1"
                onClick={() => window.open(card.scryfall_uri, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Scryfall
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
