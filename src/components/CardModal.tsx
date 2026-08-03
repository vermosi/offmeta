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
import {
  useIsMobile,
  useAnalytics,
  useAffiliateConfig,
  wrapAffiliateUrl,
} from '@/hooks';
import { useTranslation } from '@/lib/i18n';

import { CardModalImage } from './CardModal/CardModalImage';
import { CardModalDetails } from './CardModal/CardModalDetails';
import { CardModalPurchaseLinks } from './CardModal/CardModalPurchaseLinks';
import { CardPriceHistoryChart } from './CardPriceHistoryChart';
import { CardModalRulings } from './CardModal/CardModalRulings';
import { CardModalLegalities } from './CardModal/CardModalLegalities';
import { CardModalPrintings } from './CardModal/CardModalPrintings';
import { CardModalToolbox } from './CardModal/CardModalToolbox';
import { CardModalCombos } from './CardModal/CardModalCombos';
import { CardModalMetaContext } from './CardModal/CardModalMetaContext';
import { CardModalRecommendations } from './CardModal/CardModalRecommendations';
import { CardModalBentoTile } from './CardModal/CardModalBentoTile';
import type { DisplayPrices } from './CardModal/types';
import { ManaCost } from '@/components/ManaSymbol';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { getRarityVariant } from './CardModal/CardModalDetails';


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

  const { locale, t } = useTranslation();

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
    usd: card.prices?.usd,
    usd_foil: card.prices?.usd_foil,
    eur: card.prices?.eur,
    eur_foil: card.prices?.eur_foil,
  };

  const displayTix = selectedPrinting?.prices?.tix || card.prices?.tix;

  const englishPrintings = printings
    .filter((p) => p.lang === 'en')
    .sort(
      (a, b) =>
        new Date(b.released_at).getTime() - new Date(a.released_at).getTime(),
    );

  const headerTile = (
    <CardModalBentoTile className="bg-gradient-to-br from-primary/5 via-card/80 to-accent/5 border-primary/20">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground leading-tight">
            {faceDetails.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {faceDetails.type_line}
          </p>
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <Badge variant={getRarityVariant(displayRarity)} className="capitalize">
              {displayRarity}
            </Badge>
            <Badge variant="secondary">
              {displaySetName}
              {displayCollectorNumber && ` #${displayCollectorNumber}`}
            </Badge>
            {card.reserved && (
              <Badge
                variant="outline"
                className="bg-rarity-rare/10 text-rarity-rare border-rarity-rare/30 gap-1"
              >
                <Shield className="h-3 w-3" />
                Reserved List
              </Badge>
            )}
            {displayArtist && (
              <span className="text-xs text-muted-foreground">
                Illustrated by {displayArtist}
              </span>
            )}
          </div>
        </div>
        {faceDetails.mana_cost && (
          <div className="flex-shrink-0">
            <ManaCost cost={faceDetails.mana_cost} size="md" />
          </div>
        )}
      </div>
    </CardModalBentoTile>
  );

  const breadcrumbTrail = (
    <>
      {breadcrumbItems.length > 0 && (
        <div className="flex items-center gap-0.5 pb-3 w-full overflow-x-auto text-xs">
          {breadcrumbItems.map((name, i) => {
            const isLast = i === breadcrumbItems.length - 1;
            return (
              <span key={`${name}-${i}`} className="flex items-center gap-0.5 shrink-0">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                {isLast ? (
                  <span className="text-foreground font-medium truncate max-w-[120px] sm:max-w-[160px]">{name}</span>
                ) : (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px] sm:max-w-[160px]"
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
    </>
  );

  const sharedSidebar = (
    <div className="space-y-5">
      <CardModalBentoTile className="bg-muted/30 border-border/30">
        <CardModalPurchaseLinks
          card={card}
          displayPrices={displayPrices}
          displayTix={displayTix}
          selectedPrinting={selectedPrinting}
          isLoadingPrintings={isLoadingPrintings}
          onAffiliateClick={handleAffiliateClick}
        />
      </CardModalBentoTile>

      <CardModalBentoTile title="Format Legality" accent="success">
        <CardModalLegalities legalities={card.legalities} />
      </CardModalBentoTile>

      <CardModalBentoTile title="Toolbox" accent="primary">
        <CardModalToolbox
          cardName={card.name}
          scryfallUri={card.scryfall_uri}
        />
      </CardModalBentoTile>
    </div>
  );

  // Mobile content
  const mobileContent = (
    <div className="flex flex-col h-full relative">
      {isNavigating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Card Image */}
      <div className="bg-muted/30 p-4 flex flex-col items-center">
        {breadcrumbTrail}
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
        <CardModalBentoTile>
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
        </CardModalBentoTile>

        <CardModalBentoTile>
          <CardPriceHistoryChart cardName={card.name} />
        </CardModalBentoTile>

        <CardModalBentoTile>
          <CardModalMetaContext card={card} />
        </CardModalBentoTile>

        <CardModalBentoTile>
          <CardModalCombos cardName={card.name} isMobile />
        </CardModalBentoTile>

        <CardModalBentoTile>
          <CardModalRecommendations oracleId={card.oracle_id} cardName={card.name} onCardClick={handleCardClick} isMobile />
        </CardModalBentoTile>

        <CardModalBentoTile>
          <CardModalRulings
            rulings={rulings}
            isLoading={isLoadingRulings}
            showRulings={showRulings}
            onToggleRulings={() => setShowRulings(!showRulings)}
          />
        </CardModalBentoTile>

        <CardModalBentoTile>
          <CardModalPrintings
            printings={englishPrintings}
            isLoading={isLoadingPrintings}
            selectedPrintingId={selectedPrinting?.id}
            cardId={card.id}
            onSelectPrinting={handleSelectPrinting}
            isMobile
          />
        </CardModalBentoTile>

        {sharedSidebar}
      </div>
    </div>
  );


  // Desktop content
  const desktopContent = (
    <div className="grid lg:grid-cols-[360px_1fr] max-h-[85vh] relative">
      {isNavigating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Left sidebar */}
      <div className="flex flex-col h-full overflow-y-auto bg-muted/20 border-r border-border/50">
        <div className="p-6 flex flex-col items-center">
          {breadcrumbTrail}
          <CardModalImage
            displayImageUrl={displayImageUrl}
            cardName={faceDetails.name}
            isDoubleFaced={isDoubleFaced}
            isFlipping={isFlipping}
            onTransform={handleTransform}
          />
        </div>
        <div className="px-6 pb-6">
          {sharedSidebar}
        </div>
      </div>

      {/* Right bento grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {headerTile}

          <div className="grid lg:grid-cols-12 gap-4">
            <CardModalBentoTile
              title="Card Text"
              icon={FileText}
              className="lg:col-span-7"
              accent="primary"
            >
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
                showHeader={false}
              />
            </CardModalBentoTile>

            <CardModalBentoTile
              title="Why It's Played"
              icon={Brain}
              className="lg:col-span-5"
              accent="accent"
            >
              <CardModalMetaContext card={card} />
            </CardModalBentoTile>

            <CardModalBentoTile
              title="Price History"
              icon={TrendingUp}
              className="lg:col-span-12"
              accent="primary"
            >
              <CardPriceHistoryChart cardName={card.name} />
            </CardModalBentoTile>

            <CardModalBentoTile
              title="Combos"
              icon={Zap}
              className="lg:col-span-6"
              accent="accent"
            >
              <CardModalCombos cardName={card.name} />
            </CardModalBentoTile>

            <CardModalBentoTile
              title="You Might Also Like"
              icon={Sparkles}
              className="lg:col-span-6"
              accent="accent"
            >
              <CardModalRecommendations oracleId={card.oracle_id} cardName={card.name} onCardClick={handleCardClick} />
            </CardModalBentoTile>

            <CardModalBentoTile
              title="Rulings"
              icon={Gavel}
              className="lg:col-span-6"
            >
              <CardModalRulings
                rulings={rulings}
                isLoading={isLoadingRulings}
                showRulings={showRulings}
                onToggleRulings={() => setShowRulings(!showRulings)}
              />
            </CardModalBentoTile>

            <CardModalBentoTile
              title="Printings"
              icon={Layers}
              className="lg:col-span-6"
            >
              <CardModalPrintings
                printings={englishPrintings}
                isLoading={isLoadingPrintings}
                selectedPrintingId={selectedPrinting?.id}
                cardId={card.id}
                onSelectPrinting={handleSelectPrinting}
              />
            </CardModalBentoTile>
          </div>
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
        className="max-w-6xl w-[95vw] p-0 bg-background/95 border-border/50 overflow-hidden max-h-[85vh] gap-0"
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

