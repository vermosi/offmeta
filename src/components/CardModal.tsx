/**
 * Modal/drawer component for displaying detailed card information.
 * Shows card image, oracle text, prices, printings, and format legality.
 * Uses Dialog on desktop and Drawer on mobile for optimal UX.
 * Supports double-faced cards with a Transform button.
 * @module components/CardModal
 */

import { useState, useEffect, useCallback } from 'react';
import type { ScryfallCard } from '@/types/card';
import {
  getCardImage,
  isDoubleFacedCard,
  getCardByName,
  getCardFaceDetails,
  getCardRulings,
  type CardRuling,
} from '@/lib/scryfall/client';
import { getCardPrintings, type CardPrinting } from '@/lib/scryfall/printings';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X, Loader2, ChevronRight } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useIsMobile } from '@/hooks/useMobile';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAffiliateConfig, wrapAffiliateUrl } from '@/hooks/useAffiliateConfig';
import { useTranslation } from '@/lib/i18n';

import {
  CardModalImage,
  CardModalDetails,
  CardModalPurchaseLinks,
  CardModalRulings,
  CardModalLegalities,
  CardModalPrintings,
  CardModalToolbox,
  CardModalCombos,
  CardModalAddToDeck,
  CardModalMetaContext,
  CardModalCollection,
  CardModalRecommendations,
  type DisplayPrices,
} from './CardModal/index';

interface CardModalProps {
  card: ScryfallCard | null;
  open: boolean;
  onClose: () => void;
}

export function CardModal({ card: propCard, open, onClose }: CardModalProps) {
  const isMobile = useIsMobile();
  const [cardHistory, setCardHistory] = useState<ScryfallCard[]>([]);
  const card = cardHistory.length > 0 ? cardHistory[cardHistory.length - 1] : propCard;
  const canGoBack = cardHistory.length > 0;
  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [isLoadingPrintings, setIsLoadingPrintings] = useState(false);
  const [refreshedPrices, setRefreshedPrices] = useState<DisplayPrices | null>(
    null,
  );
  const [currentFace, setCurrentFace] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(
    null,
  );
  const [rulings, setRulings] = useState<CardRuling[]>([]);
  const [isLoadingRulings, setIsLoadingRulings] = useState(false);
  const [showRulings, setShowRulings] = useState(false);
  const { trackCardModalView, trackAffiliateClick } = useAnalytics();
  const affiliateConfig = useAffiliateConfig();

  const isDoubleFaced = card ? isDoubleFacedCard(card) : false;

  // Clear history when modal closes or prop card changes
  useEffect(() => {
    if (!open) setCardHistory([]);
  }, [open, propCard]);

  // Navigate to a different card within the modal
  const [isNavigating, setIsNavigating] = useState(false);
  const handleCardClick = useCallback(async (cardName: string) => {
    setIsNavigating(true);
    try {
      const newCard = await getCardByName(cardName);
      setCardHistory((prev) => [...prev, newCard]);
    } catch {
      // Silently fail — card stays as-is
    } finally {
      setIsNavigating(false);
    }
  }, []);

  // Keyboard shortcut: Backspace to go back in card history
  useEffect(() => {
    if (!open || !canGoBack) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Backspace') {
        e.preventDefault();
        setCardHistory((prev) => prev.slice(0, -1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, canGoBack]);


  // Jump to a specific point in history
  const handleJumpTo = useCallback((index: number) => {
    // index -1 = propCard (root), 0 = first history entry, etc.
    if (index < 0) {
      setCardHistory([]);
    } else {
      setCardHistory((prev) => prev.slice(0, index + 1));
    }
  }, []);

  // Build breadcrumb items: [propCard, ...history]
  const breadcrumbItems = canGoBack && propCard
    ? [propCard.name, ...cardHistory.map((c) => c.name)]
    : [];

  // Reset state and init loading when card/open changes (render-phase adjustment)
  const [prevCardKey, setPrevCardKey] = useState<string | null>(null);
  const cardKey = card && open ? card.id : null;
  if (cardKey !== prevCardKey) {
    setPrevCardKey(cardKey);
    if (open && card) {
      setCurrentFace(0);
      setSelectedPrinting(null);
      setShowRulings(false);
      setRulings([]);
      setIsLoadingRulings(true);
      setIsLoadingPrintings(true);
      setRefreshedPrices(null);
    }
  }

  // Fetch rulings when modal opens
  useEffect(() => {
    if (card && open) {
      getCardRulings(card.id).then((data) => {
        setRulings(data);
        setIsLoadingRulings(false);
      });
    }
  }, [card, open]);

  // Fetch printings and track modal view
  useEffect(() => {
    if (card && open) {
      trackCardModalView({
        card_id: card.id,
        card_name: card.name,
        set_code: card.set,
      });
      getCardPrintings(card.name).then((data) => {
        setPrintings(data);
        const currentPrinting = data.find((p) => p.id === card.id);
        if (currentPrinting) {
          setRefreshedPrices({
            usd: currentPrinting.prices?.usd,
            usd_foil: currentPrinting.prices?.usd_foil,
            eur: currentPrinting.prices?.eur,
            eur_foil: currentPrinting.prices?.eur_foil,
          });
        }
        setIsLoadingPrintings(false);
      });
    }
  }, [card, open, trackCardModalView]);

  const handleTransform = useCallback(() => {
    if (!isDoubleFaced) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentFace((prev) => (prev === 0 ? 1 : 0));
      setIsFlipping(false);
    }, 150);
  }, [isDoubleFaced]);

  const handleAffiliateClick = useCallback(
    (
      marketplace:
        | 'tcgplayer'
        | 'cardmarket'
        | 'tcgplayer-foil'
        | 'cardmarket-foil'
        | 'cardhoarder',
      url: string,
      price?: string,
    ) => {
      const { tcgplayerAffiliateBase } = affiliateConfig;
      const isAffiliateLink =
        marketplace.includes('tcgplayer') && !!tcgplayerAffiliateBase;

      // Wrap TCGPlayer URLs with affiliate tracking
      const finalUrl = marketplace.includes('tcgplayer') && tcgplayerAffiliateBase
        ? wrapAffiliateUrl(url, tcgplayerAffiliateBase)
        : url;

      trackAffiliateClick({
        affiliate: marketplace,
        card_name: card?.name,
        card_id: card?.id,
        set_code: card?.set,
        is_affiliate_link: isAffiliateLink,
        price_usd: marketplace.includes('tcgplayer') ? price : undefined,
        price_eur: marketplace.includes('cardmarket') ? price : undefined,
        price_tix: marketplace === 'cardhoarder' ? price : undefined,
      });
      window.open(finalUrl, '_blank', 'noopener,noreferrer');
    },
    [card, trackAffiliateClick, affiliateConfig],
  );

  const handleSelectPrinting = useCallback((printing: CardPrinting) => {
    setSelectedPrinting(printing);
    setRefreshedPrices({
      usd: printing.prices?.usd,
      usd_foil: printing.prices?.usd_foil,
      eur: printing.prices?.eur,
      eur_foil: printing.prices?.eur_foil,
    });
  }, []);

  const { locale } = useTranslation();

  if (!card) return null;

  // Computed display values
  const displayImageUrl = selectedPrinting?.image_uris?.large
    ? selectedPrinting.image_uris.large
    : getCardImage(card, 'large', currentFace);
  const faceDetails = getCardFaceDetails(card, currentFace, locale);

  const displaySetName = selectedPrinting?.set_name || card.set_name;
  const displayRarity = selectedPrinting?.rarity || card.rarity;
  const displayCollectorNumber =
    selectedPrinting?.collector_number || card.collector_number || '';
  const displayArtist = selectedPrinting?.artist || card.artist;

  const displayPrices: DisplayPrices = refreshedPrices || {
    usd: card.prices.usd,
    usd_foil: card.prices.usd_foil,
    eur: card.prices.eur,
    eur_foil: card.prices.eur_foil,
  };

  const displayTix = selectedPrinting?.prices?.tix || card.prices.tix;

  const englishPrintings = printings
    .filter((p) => p.lang === 'en')
    .sort(
      (a, b) =>
        new Date(b.released_at).getTime() - new Date(a.released_at).getTime(),
    );

  // Mobile content
  const mobileContent = (
    <div className="flex flex-col h-full relative">
      {isNavigating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {/* Breadcrumb trail */}
      {breadcrumbItems.length > 0 && (
        <div className="flex items-center gap-0.5 px-4 pt-3 pb-1 overflow-x-auto text-xs">
          {breadcrumbItems.map((name, i) => {
            const isLast = i === breadcrumbItems.length - 1;
            return (
              <span key={`${name}-${i}`} className="flex items-center gap-0.5 shrink-0">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                {isLast ? (
                  <span className="text-foreground font-medium truncate max-w-[120px]">{name}</span>
                ) : (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
                    onClick={() => handleJumpTo(i - 1)}
                  >
                    {name}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      {/* Card Image */}
      <div className="bg-muted/30 p-4 flex flex-col items-center">
        <CardModalImage
          displayImageUrl={displayImageUrl}
          cardName={faceDetails.name}
          isDoubleFaced={isDoubleFaced}
          isFlipping={isFlipping}
          onTransform={handleTransform}
          isMobile
        />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <CardModalDetails
          faceDetails={faceDetails}
          displaySetName={displaySetName}
          displayRarity={displayRarity}
          displayCollectorNumber={displayCollectorNumber}
          displayArtist={displayArtist}
          isReserved={card.reserved}
          englishPrintings={englishPrintings}
          selectedPrintingId={selectedPrinting?.id}
          cardId={card.id}
          isMobile
        />

        <CardModalMetaContext card={card} oracleId={card.oracle_id} onCardClick={handleCardClick} isMobile />

        <CardModalCollection cardName={card.name} isMobile />

        <CardModalRulings
          rulings={rulings}
          isLoading={isLoadingRulings}
          showRulings={showRulings}
          onToggleRulings={() => setShowRulings(!showRulings)}
        />

        <CardModalCombos cardName={card.name} isMobile />

        <CardModalRecommendations oracleId={card.oracle_id} cardName={card.name} onCardClick={handleCardClick} isMobile />

        <CardModalAddToDeck card={card} isMobile />

        <CardModalPurchaseLinks
          card={card}
          displayPrices={displayPrices}
          displayTix={displayTix}
          selectedPrinting={selectedPrinting}
          isLoadingPrintings={isLoadingPrintings}
          onAffiliateClick={handleAffiliateClick}
          isMobile
        />

        <CardModalLegalities legalities={card.legalities} isMobile />

        <CardModalPrintings
          printings={englishPrintings}
          isLoading={isLoadingPrintings}
          selectedPrintingId={selectedPrinting?.id}
          cardId={card.id}
          onSelectPrinting={handleSelectPrinting}
          isMobile
        />

        <CardModalToolbox
          cardName={card.name}
          scryfallUri={card.scryfall_uri}
          isMobile
        />
      </div>
    </div>
  );

  // Desktop content
  const desktopContent = (
    <div className="grid md:grid-cols-[280px_1fr] max-h-[85vh] relative">
      {isNavigating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {/* Card Image Section */}
      <div className="bg-muted/30 flex flex-col items-center p-5 border-r border-border/50">
        {/* Breadcrumb trail */}
        {breadcrumbItems.length > 0 && (
          <div className="flex items-center gap-0.5 pb-3 w-full overflow-x-auto text-xs">
            {breadcrumbItems.map((name, i) => {
              const isLast = i === breadcrumbItems.length - 1;
              return (
                <span key={`${name}-${i}`} className="flex items-center gap-0.5 shrink-0">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                  {isLast ? (
                    <span className="text-foreground font-medium truncate max-w-[100px]">{name}</span>
                  ) : (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px]"
                      onClick={() => handleJumpTo(i - 1)}
                    >
                      {name}
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}
        <CardModalImage
          displayImageUrl={displayImageUrl}
          cardName={faceDetails.name}
          isDoubleFaced={isDoubleFaced}
          isFlipping={isFlipping}
          onTransform={handleTransform}
        />

        <CardModalPurchaseLinks
          card={card}
          displayPrices={displayPrices}
          displayTix={displayTix}
          selectedPrinting={selectedPrinting}
          isLoadingPrintings={isLoadingPrintings}
          onAffiliateClick={handleAffiliateClick}
        />
      </div>

      {/* Card Details Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 p-5">
          <CardModalDetails
            faceDetails={faceDetails}
            displaySetName={displaySetName}
            displayRarity={displayRarity}
            displayCollectorNumber={displayCollectorNumber}
            displayArtist={displayArtist}
            isReserved={card.reserved}
            englishPrintings={englishPrintings}
            selectedPrintingId={selectedPrinting?.id}
            cardId={card.id}
          />

          <CardModalMetaContext card={card} oracleId={card.oracle_id} onCardClick={handleCardClick} />

          <CardModalCollection cardName={card.name} />

          <CardModalRulings
            rulings={rulings}
            isLoading={isLoadingRulings}
            showRulings={showRulings}
            onToggleRulings={() => setShowRulings(!showRulings)}
          />

          <CardModalCombos cardName={card.name} />

          <CardModalRecommendations oracleId={card.oracle_id} cardName={card.name} onCardClick={handleCardClick} />

          <CardModalAddToDeck card={card} />

          <CardModalLegalities legalities={card.legalities} />

          <CardModalPrintings
            printings={englishPrintings}
            isLoading={isLoadingPrintings}
            selectedPrintingId={selectedPrinting?.id}
            cardId={card.id}
            onSelectPrinting={handleSelectPrinting}
          />

          <CardModalToolbox
            cardName={card.name}
            scryfallUri={card.scryfall_uri}
          />
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose} modal={false}>
        <DrawerContent
          className="max-h-[90vh] px-0 overflow-hidden"
          aria-describedby={undefined}
        >
          <VisuallyHidden>
            <DrawerTitle>{card.name}</DrawerTitle>
          </VisuallyHidden>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 h-8 w-8"
            onClick={onClose}
            aria-label="Close card details"
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
      <DialogContent
        className="max-w-3xl w-[95vw] p-0 bg-background border-border/50 overflow-hidden max-h-[85vh] gap-0"
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>{card.name}</DialogTitle>
        </VisuallyHidden>
        {desktopContent}
      </DialogContent>
    </Dialog>
  );
}

export default CardModal;
