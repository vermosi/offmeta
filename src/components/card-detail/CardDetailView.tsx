/**
 * Full card detail view — the single source of truth for card presentation.
 * Rendered by the card page route (/cards/:slug). Editorial "reference entry"
 * layout: artwork first, then rulings, legality, pricing/history, printings,
 * and metadata, each as a numbered, hairline-ruled section.
 * @module components/card-detail/CardDetailView
 */

import { useState, useEffect, useCallback } from 'react';
import type { ScryfallCard } from '@/types/card';
import {
  getCardImage,
  isDoubleFacedCard,
  getCardFaceDetails,
  getCardRulings,
  getLocalizedPrintedFields,
  type CardRuling,
  type LocalizedPrintedFields,
} from '@/lib/scryfall/client';
import { getCardPrintings, type CardPrinting } from '@/lib/scryfall/printings';

import { cn } from '@/lib/core/utils';
import { ManaCost, OracleText } from '@/components/ManaSymbol';
import { SaveCardButton } from '@/components/SaveCardButton';
import { toSavedCardInput } from '@/lib/account';
import { useAnalytics, useAffiliateConfig } from '@/hooks';
import { useTranslation } from '@/lib/i18n';
import { LOCALE_TO_SCRYFALL_LANG } from '@/lib/i18n/constants';



import { CardModalImage } from '@/components/CardModal/CardModalImage';
import { CardModalDetails } from '@/components/CardModal/CardModalDetails';
import { CardModalPurchaseLinks } from '@/components/CardModal/CardModalPurchaseLinks';
import { CardModalRulings } from '@/components/CardModal/CardModalRulings';
import { CardModalLegalities } from '@/components/CardModal/CardModalLegalities';
import { CardModalPrintings } from '@/components/CardModal/CardModalPrintings';
import { CardModalToolbox } from '@/components/CardModal/CardModalToolbox';
import { CardPriceHistoryChart } from '@/components/CardPriceHistoryChart';
import { CardModalCombos } from '@/components/CardModal/CardModalCombos';
import type { DisplayPrices } from '@/components/CardModal/types';

export interface CardDetailViewProps {
  card: ScryfallCard;
}

/** Numbered, hairline-ruled section header in the editorial index style. */
function SectionRule({
  index,
  label,
  note,
  className,
}: {
  index: string;
  label: string;
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-3 border-b border-border/60 pb-2',
        className,
      )}
    >
      <span className="font-mono text-[10px] tracking-[0.28em] text-muted-foreground/70">
        {index}
      </span>
      <h2 className="font-mono text-[11px] uppercase tracking-[0.28em] text-foreground">
        {label}
      </h2>
      {note && (
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          {note}
        </span>
      )}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/30 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground text-right break-words">
        {value}
      </span>
    </div>
  );
}

export function CardDetailView({ card }: CardDetailViewProps) {
  const { locale, t } = useTranslation();
  const { trackAffiliateClick } = useAnalytics();
  const affiliateConfig = useAffiliateConfig();

  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [isLoadingPrintings, setIsLoadingPrintings] = useState(true);
  const [selectedPrinting, setSelectedPrinting] = useState<CardPrinting | null>(
    null,
  );
  const [refreshedPrices, setRefreshedPrices] = useState<DisplayPrices | null>(
    null,
  );
  const [currentFace, setCurrentFace] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [rulings, setRulings] = useState<CardRuling[]>([]);
  const [isLoadingRulings, setIsLoadingRulings] = useState(true);
  const [showRulings, setShowRulings] = useState(true);
  const [comboCount, setComboCount] = useState(0);
  const [localizedFields, setLocalizedFields] =
    useState<LocalizedPrintedFields | null>(null);


  const isDoubleFaced = isDoubleFacedCard(card);

  // Reset per-card state when navigating between cards (render-phase adjustment).
  const [cardScopeId, setCardScopeId] = useState(card.id);
  if (cardScopeId !== card.id) {
    setCardScopeId(card.id);
    setCurrentFace(0);
    setSelectedPrinting(null);
    setRefreshedPrices(null);
    setRulings([]);
    setShowRulings(true);
    setIsLoadingRulings(true);
    setIsLoadingPrintings(true);
    setComboCount(0);
    setLocalizedFields(null);
  }

  // Localized printing (name / type line / oracle text) for non-English locales.
  // Canonical English data stays authoritative for SEO and structured data.
  const scryfallLang = LOCALE_TO_SCRYFALL_LANG[locale] ?? 'en';
  useEffect(() => {
    if (scryfallLang === 'en') return;
    let cancelled = false;
    getLocalizedPrintedFields(card.name, scryfallLang).then((fields) => {
      if (!cancelled) setLocalizedFields(fields);
    });
    return () => {
      cancelled = true;
    };
  }, [card.name, scryfallLang]);




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
    selectedPrinting?.image_uris?.large ??
    getCardImage(card, 'large', currentFace);
  // Merge only the fields the localized printing actually provides so an
  // English value is never replaced by `undefined`.
  const localizedCard = localizedFields
    ? {
        ...card,
        ...Object.fromEntries(
          Object.entries(localizedFields).filter(([, v]) => Boolean(v)),
        ),
      }
    : card;

  const faceDetails = getCardFaceDetails(localizedCard, currentFace, locale);

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
    <article className="space-y-10">
      {/* ── 01 · Artwork + entry head ─────────────────────────────────────── */}
      <section aria-labelledby="card-entry-title" className="space-y-5">
        <SectionRule
          index="01"
          label={t('card.artwork', 'Artwork')}
          note={`${displaySetName}${displayCollectorNumber ? ` · #${displayCollectorNumber}` : ''}`}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10 items-start">
          <div className="mx-auto w-full max-w-[300px] sm:max-w-[340px] lg:mx-0 lg:sticky lg:top-20 lg:z-10">
            <CardModalImage
              displayImageUrl={displayImageUrl}
              cardName={faceDetails.name}
              isDoubleFaced={isDoubleFaced}
              isFlipping={isFlipping}
              onTransform={handleTransform}
            />
            {displayArtist && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center lg:text-left">
                {t('card.illustratedBy', 'Illustrated by')} {displayArtist}
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1
                  id="card-entry-title"
                  className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-[1.05] break-words"
                >
                  {faceDetails.name}
                </h1>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {faceDetails.type_line}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {faceDetails.mana_cost && (
                  <ManaCost cost={faceDetails.mana_cost} size="md" />
                )}
                <SaveCardButton card={toSavedCardInput(card)} size="md" />
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 border-y border-border/50 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>{displayRarity}</span>
              {faceDetails.power && faceDetails.toughness && (
                <span>
                  {faceDetails.power}/{faceDetails.toughness}
                </span>
              )}
              {card.reserved && (
                <span className="text-rarity-rare">
                  {t('card.reservedList', 'Reserved List')}
                </span>
              )}
            </div>

            {faceDetails.oracle_text && (
              <div className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">
                <OracleText text={faceDetails.oracle_text} />
              </div>
            )}

            {faceDetails.flavor_text && (
              <p className="border-l border-border/60 pl-4 font-serif italic text-sm text-muted-foreground">
                {faceDetails.flavor_text}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── 02 · Rulings ─────────────────────────────────────────────────── */}
      <section
        aria-label={t('card.rulingsSection', 'Rulings')}
        className="space-y-4"
      >
        <SectionRule
          index="02"
          label={t('card.rulingsLabel', 'Rulings')}
          note={isLoadingRulings ? '—' : String(rulings.length)}
        />
        {!isLoadingRulings && rulings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(
              'card.noRulings',
              'No official rulings published for this card.',
            )}
          </p>
        ) : (
          <CardModalRulings
            rulings={rulings}
            isLoading={isLoadingRulings}
            showRulings={showRulings}
            onToggleRulings={() => setShowRulings(!showRulings)}
          />
        )}
      </section>

      {/* ── 03 · Legality ────────────────────────────────────────────────── */}
      <section
        aria-label={t('card.formatLegality', 'Format Legality')}
        className="space-y-4"
      >
        <SectionRule
          index="03"
          label={t('card.formatLegality', 'Format Legality')}
        />
        <CardModalLegalities legalities={card.legalities} />
      </section>

      {/* ── 04 · Pricing & history ───────────────────────────────────────── */}
      <section aria-label={t('card.pricing', 'Pricing')} className="space-y-4">
        <SectionRule
          index="04"
          label={t('card.pricing', 'Pricing & History')}
        />
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <CardModalPurchaseLinks
            card={card}
            displayPrices={displayPrices}
            displayTix={displayTix}
            selectedPrinting={selectedPrinting}
            isLoadingPrintings={isLoadingPrintings}
            onAffiliateClick={handleAffiliateClick}
          />
          <CardPriceHistoryChart
            key={selectedPrinting?.id ?? card.id}
            cardName={card.name}
            scryfallId={selectedPrinting?.id ?? card.id}
          />
        </div>
      </section>

      {/* ── 05 · Printings ───────────────────────────────────────────────── */}
      <section
        aria-label={t('card.printingsSection', 'Printings')}
        className="space-y-4"
      >
        <SectionRule
          index="05"
          label={t('card.printingsLabel', 'Printings')}
          note={isLoadingPrintings ? '—' : String(englishPrintings.length)}
        />
        <CardModalPrintings
          printings={englishPrintings}
          isLoading={isLoadingPrintings}
          selectedPrintingId={selectedPrinting?.id}
          cardId={card.id}
          onSelectPrinting={handleSelectPrinting}
        />
      </section>

      {/* ── 06 · Metadata ────────────────────────────────────────────────── */}
      <section
        aria-label={t('card.metadata', 'Metadata')}
        className="space-y-4"
      >
        <SectionRule index="06" label={t('card.metadata', 'Metadata')} />
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          <div>
            <MetaRow label={t('card.set', 'Set')} value={displaySetName} />
            <MetaRow
              label={t('card.collectorNumber', 'Collector №')}
              value={displayCollectorNumber || undefined}
            />
            <MetaRow label={t('card.rarity', 'Rarity')} value={displayRarity} />
            <MetaRow label={t('card.artist', 'Artist')} value={displayArtist} />
            <MetaRow
              label={t('card.manaValue', 'Mana Value')}
              value={card.cmc !== undefined ? String(card.cmc) : undefined}
            />
          </div>
          <div className="min-w-0">
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

        <div className={comboCount > 0 ? 'pt-2' : 'hidden'}>
          <CardModalCombos
            cardName={card.name}
            onComboCountChange={setComboCount}
          />
        </div>

        <div className="pt-2">
          <CardModalToolbox
            cardName={card.name}
            scryfallUri={card.scryfall_uri}
          />
        </div>
      </section>
    </article>
  );
}

export default CardDetailView;
