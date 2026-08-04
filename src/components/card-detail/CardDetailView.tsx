/**
 * Full card detail view — the single source of truth for card presentation.
 * Rendered by the card page route (/cards/:slug). Replaces the old CardModal so
 * the in-app card experience and the indexable page are identical.
 * @module components/card-detail/CardDetailView
 */

import { useState, useEffect, useCallback } from 'react';
import type { ScryfallCard } from '@/types/card';
import {
  getCardImage,
  isDoubleFacedCard,
  getCardFaceDetails,
  getCardRulings,
  type CardRuling,
} from '@/lib/scryfall/client';
import { getCardPrintings, type CardPrinting } from '@/lib/scryfall/printings';

import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ManaCost } from '@/components/ManaSymbol';
import { useAnalytics, useAffiliateConfig } from '@/hooks';
import { useTranslation } from '@/lib/i18n';

import { CardModalImage } from '@/components/CardModal/CardModalImage';
import { CardModalDetails, getRarityVariant } from '@/components/CardModal/CardModalDetails';
import { CardModalPurchaseLinks } from '@/components/CardModal/CardModalPurchaseLinks';
import { CardModalRulings } from '@/components/CardModal/CardModalRulings';
import { CardModalLegalities } from '@/components/CardModal/CardModalLegalities';
import { CardModalPrintings } from '@/components/CardModal/CardModalPrintings';
import { CardModalBentoTile } from '@/components/CardModal/CardModalBentoTile';
import { CardPriceHistoryChart } from '@/components/CardPriceHistoryChart';
import { CardModalCombos } from '@/components/CardModal/CardModalCombos';
import type { DisplayPrices } from '@/components/CardModal/types';

export interface CardDetailViewProps {
  card: ScryfallCard;
}

export function CardDetailView({ card }: CardDetailViewProps) {
  const { locale, t } = useTranslation();
  const { trackAffiliateClick } = useAnalytics();
  const affiliateConfig = useAffiliateConfig();

  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [isLoadingPrintings, setIsLoadingPrintings] = useState(true);
  const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(null);
  const [refreshedPrices, setRefreshedPrices] = useState<DisplayPrices | null>(null);
  const [currentFace, setCurrentFace] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [rulings, setRulings] = useState<CardRuling[]>([]);
  const [isLoadingRulings, setIsLoadingRulings] = useState(true);
  const [showRulings, setShowRulings] = useState(false);
  const [comboCount, setComboCount] = useState(0);

  const isDoubleFaced = isDoubleFacedCard(card);

  // Reset per-card state when navigating between cards.
  useEffect(() => {
    setCurrentFace(0);
    setSelectedPrinting(null);
    setRefreshedPrices(null);
    setRulings([]);
    setShowRulings(false);
    setIsLoadingRulings(true);
    setIsLoadingPrintings(true);
    setComboCount(0);
  }, [card.id]);

  useEffect(() => {
    let cancelled = false;
    getCardRulings(card.id).then((data) => {
      if (cancelled) return;
      setRulings(data);
      setIsLoadingRulings(false);
    });
    return () => {
      cancelled = true;
    };
  }, [card.id]);

  useEffect(() => {
    let cancelled = false;
    getCardPrintings(card.name).then((data) => {
      if (cancelled) return;
      setPrintings(data);
      const current = data.find((p) => p.id === card.id);
      if (current) {
        setRefreshedPrices({
          usd: current.prices?.usd,
          usd_foil: current.prices?.usd_foil,
          eur: current.prices?.eur,
          eur_foil: current.prices?.eur_foil,
        });
      }
      setIsLoadingPrintings(false);
    });
    return () => {
      cancelled = true;
    };
  }, [card.id, card.name]);

  const handleTransform = useCallback(() => {
    if (!isDoubleFaced) return;
    setIsFlipping(true);
    window.setTimeout(() => {
      setCurrentFace((prev) => (prev === 0 ? 1 : 0));
      setIsFlipping(false);
    }, 150);
  }, [isDoubleFaced]);

  const handleSelectPrinting = useCallback((printing: CardPrinting) => {
    setSelectedPrinting(printing);
    setRefreshedPrices({
      usd: printing.prices?.usd,
      usd_foil: printing.prices?.usd_foil,
      eur: printing.prices?.eur,
      eur_foil: printing.prices?.eur_foil,
    });
  }, []);

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

      trackAffiliateClick({
        affiliate: marketplace,
        card_name: card.name,
        card_id: card.id,
        set_code: card.set,
        is_affiliate_link: isAffiliateLink,
        price_usd: marketplace.includes('tcgplayer') ? price : undefined,
        price_eur: marketplace.includes('cardmarket') ? price : undefined,
        price_tix: marketplace === 'cardhoarder' ? price : undefined,
      });
    },
    [card, trackAffiliateClick, affiliateConfig],
  );

  const displayImageUrl =
    selectedPrinting?.image_uris?.large ?? getCardImage(card, 'large', currentFace);
  const faceDetails = getCardFaceDetails(card, currentFace, locale);
  const displaySetName = selectedPrinting?.set_name || card.set_name;
  const displayRarity = selectedPrinting?.rarity || card.rarity;
  const displayCollectorNumber =
    selectedPrinting?.collector_number || card.collector_number || '';
  const displayArtist = selectedPrinting?.artist || card.artist;
  const displayTix = selectedPrinting?.prices?.tix || card.prices?.tix;

  const displayPrices: DisplayPrices = refreshedPrices || {
    usd: card.prices?.usd,
    usd_foil: card.prices?.usd_foil,
    eur: card.prices?.eur,
    eur_foil: card.prices?.eur_foil,
  };

  const englishPrintings = printings
    .filter((p) => p.lang === 'en')
    .sort(
      (a, b) =>
        new Date(b.released_at).getTime() - new Date(a.released_at).getTime(),
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:gap-8 items-start">
      {/* Sidebar: art, purchase, legality, tools */}
      <div className="space-y-5">
        <div className="flex flex-col items-center">
          <CardModalImage
            displayImageUrl={displayImageUrl}
            cardName={faceDetails.name}
            isDoubleFaced={isDoubleFaced}
            isFlipping={isFlipping}
            onTransform={handleTransform}
          />
        </div>

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

        <CardModalBentoTile>
          <CardPriceHistoryChart cardName={card.name} />
        </CardModalBentoTile>

        <CardModalBentoTile>
          <CardModalLegalities legalities={card.legalities} />
        </CardModalBentoTile>

        <CardModalBentoTile>
          <CardModalToolbox cardName={card.name} scryfallUri={card.scryfall_uri} />
        </CardModalBentoTile>
      </div>

      {/* Main bento grid */}
      <div className="space-y-5 min-w-0">
        <div className="grid gap-4 lg:grid-cols-12 items-start auto-rows-min">
          <CardModalBentoTile className="lg:col-span-7 bg-gradient-to-br from-primary/5 via-card/80 to-accent/5 border-primary/20">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground leading-tight break-words">
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
                        {t('card.reservedList', 'Reserved List')}
                      </Badge>
                    )}
                  </div>
                </div>
                {faceDetails.mana_cost && (
                  <div className="flex-shrink-0">
                    <ManaCost cost={faceDetails.mana_cost} size="md" />
                  </div>
                )}
              </div>

              <div className="border-t border-border/40 pt-4">
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
              </div>
            </div>
          </CardModalBentoTile>



          <CardModalBentoTile className="lg:col-span-6">
            <CardModalRulings
              rulings={rulings}
              isLoading={isLoadingRulings}
              showRulings={showRulings}
              onToggleRulings={() => setShowRulings(!showRulings)}
            />
          </CardModalBentoTile>

          <CardModalBentoTile className="lg:col-span-6">
            <CardModalPrintings
              printings={englishPrintings}
              isLoading={isLoadingPrintings}
              selectedPrintingId={selectedPrinting?.id}
              cardId={card.id}
              onSelectPrinting={handleSelectPrinting}
            />
          </CardModalBentoTile>

          {comboCount > 0 && (
            <CardModalBentoTile className="lg:col-span-12">
              <CardModalCombos
                cardName={card.name}
                onComboCountChange={setComboCount}
              />
            </CardModalBentoTile>
          )}
        </div>
      </div>
    </div>
  );
}

export default CardDetailView;
