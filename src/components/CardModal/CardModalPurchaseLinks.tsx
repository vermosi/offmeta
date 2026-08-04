/**
 * Purchase links component for CardModal.
 * Displays buy buttons for TCGplayer, Cardmarket, Cardhoarder.
 * Includes 30-day price trend sparkline when data is available.
 * @module components/CardModal/CardModalPurchaseLinks
 */

import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, Sparkles, Monitor } from 'lucide-react';
import { getTCGPlayerUrl, getCardmarketUrl } from '@/lib/scryfall/printings';
import type { CardModalPurchaseLinksProps } from './types';
import { useTranslation } from '@/lib/i18n';

export function CardModalPurchaseLinks({
  card,
  displayPrices,
  displayTix,
  selectedPrinting,
  isLoadingPrintings,
  onAffiliateClick,
  isMobile = false,
}: CardModalPurchaseLinksProps) {
  const { t } = useTranslation();
  const cardNameEncoded = encodeURIComponent(card.name);

  const getCardhoarderUrl = () => {
    const purchaseUris = card.purchase_uris;
    if (purchaseUris?.cardhoarder) {
      return purchaseUris.cardhoarder;
    }
    return `https://www.cardhoarder.com/cards?data%5Bsearch%5D=${cardNameEncoded}`;
  };

  const foilLabel = t('card.foil', 'Foil');
  const tixLabel = t('card.tix', 'tix');
  const buyLabel = t('card.buyThisCard', 'Buy This Card');
  const checkPriceLabel = t('card.checkPrice', 'Check price');
  const priceUnavailableLabel = t(
    'card.priceUnavailable',
    'Price not available',
  );
  const loadingPricesLabel = t('card.loadingPrices', 'Loading prices…');
  const hasAnyPrice = Boolean(
    displayPrices.usd ||
      displayPrices.eur ||
      displayPrices.usd_foil ||
      displayPrices.eur_foil ||
      displayTix,
  );
  const showFallbackLinks = !hasAnyPrice && !isLoadingPrintings;
  const showLoadingLinks = !hasAnyPrice && isLoadingPrintings;

  const openTcgplayer = () => {
    const url =
      selectedPrinting?.purchase_uris?.tcgplayer || getTCGPlayerUrl(card);
    onAffiliateClick('tcgplayer', url);
  };
  const openCardmarket = () => {
    const url =
      selectedPrinting?.purchase_uris?.cardmarket || getCardmarketUrl(card);
    onAffiliateClick('cardmarket', url);
  };

  const fallbackLinks = (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{priceUnavailableLabel}</p>
      <Button
        size="sm"
        className="gap-2 w-full justify-between"
        onClick={openTcgplayer}
      >
        <span className="flex items-center gap-2">
          <ShoppingCart className="h-3.5 w-3.5" />
          TCGplayer
        </span>
        <span className="text-xs opacity-80">{checkPriceLabel}</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="gap-2 w-full justify-between"
        onClick={openCardmarket}
      >
        <span className="flex items-center gap-2">
          <ShoppingCart className="h-3.5 w-3.5" />
          Cardmarket
        </span>
        <span className="text-xs opacity-80">{checkPriceLabel}</span>
      </Button>
    </div>
  );

  const loadingLinks = (
    <div
      className="space-y-1.5"
      aria-busy="true"
      aria-live="polite"
      data-testid="purchase-links-loading"
    >
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {loadingPricesLabel}
      </p>
      <Button
        size="sm"
        disabled
        className="gap-2 w-full justify-between"
        aria-label={`TCGplayer — ${loadingPricesLabel}`}
      >
        <span className="flex items-center gap-2">
          <ShoppingCart className="h-3.5 w-3.5" />
          TCGplayer
        </span>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled
        className="gap-2 w-full justify-between"
        aria-label={`Cardmarket — ${loadingPricesLabel}`}
      >
        <span className="flex items-center gap-2">
          <ShoppingCart className="h-3.5 w-3.5" />
          Cardmarket
        </span>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    </div>
  );




  if (isMobile) {
    return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {buyLabel}
      </h3>
      <div className="grid grid-cols-2 gap-2">
          {displayPrices.usd && (
            <Button
              size="sm"
              className="gap-1.5 justify-between text-xs"
              onClick={() => {
                const url =
                  selectedPrinting?.purchase_uris?.tcgplayer ||
                  getTCGPlayerUrl(card);
                onAffiliateClick('tcgplayer', url, displayPrices.usd);
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
                const url =
                  selectedPrinting?.purchase_uris?.cardmarket ||
                  getCardmarketUrl(card);
                onAffiliateClick('cardmarket', url, displayPrices.eur);
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
                  const baseUrl =
                    selectedPrinting?.purchase_uris?.tcgplayer ||
                    getTCGPlayerUrl(card);
                  const foilUrl = baseUrl.includes('?')
                    ? `${baseUrl}&Printing=Foil`
                    : `${baseUrl}?Printing=Foil`;
                  onAffiliateClick(
                    'tcgplayer-foil',
                    foilUrl,
                    displayPrices.usd_foil,
                  );
                }}
              >
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {foilLabel}
                </span>
                <span className="font-semibold">${displayPrices.usd_foil}</span>
              </Button>
            )}
            {displayPrices.eur_foil && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 justify-between text-xs"
                onClick={() => {
                  const baseUrl =
                    selectedPrinting?.purchase_uris?.cardmarket ||
                    getCardmarketUrl(card);
                  const foilUrl = baseUrl.includes('?')
                    ? `${baseUrl}&isFoil=Y`
                    : `${baseUrl}?isFoil=Y`;
                  onAffiliateClick(
                    'cardmarket-foil',
                    foilUrl,
                    displayPrices.eur_foil,
                  );
                }}
              >
                <span className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {foilLabel}
                </span>
                <span className="font-semibold">€{displayPrices.eur_foil}</span>
              </Button>
            )}
          </div>
        )}
        {showFallbackLinks && fallbackLinks}
        {showLoadingLinks && loadingLinks}

      </div>
    );
  }

  // Desktop layout
  return (
    <div className="w-full mt-3 max-w-[220px]">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
        {buyLabel}
      </h3>
      <div className="space-y-1.5">
        {displayPrices.usd && (
          <Button
            size="sm"
            className="gap-2 w-full justify-between"
            onClick={() => {
              const url =
                selectedPrinting?.purchase_uris?.tcgplayer ||
                getTCGPlayerUrl(card);
              onAffiliateClick('tcgplayer', url, displayPrices.usd);
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
              const baseUrl =
                selectedPrinting?.purchase_uris?.tcgplayer ||
                getTCGPlayerUrl(card);
              const foilUrl = baseUrl.includes('?')
                ? `${baseUrl}&Printing=Foil`
                : `${baseUrl}?Printing=Foil`;
              onAffiliateClick(
                'tcgplayer-foil',
                foilUrl,
                displayPrices.usd_foil,
              );
            }}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              TCGplayer {foilLabel}
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
              const url =
                selectedPrinting?.purchase_uris?.cardmarket ||
                getCardmarketUrl(card);
              onAffiliateClick('cardmarket', url, displayPrices.eur);
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
              const baseUrl =
                selectedPrinting?.purchase_uris?.cardmarket ||
                getCardmarketUrl(card);
              const foilUrl = baseUrl.includes('?')
                ? `${baseUrl}&isFoil=Y`
                : `${baseUrl}?isFoil=Y`;
              onAffiliateClick(
                'cardmarket-foil',
                foilUrl,
                displayPrices.eur_foil,
              );
            }}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Cardmarket {foilLabel}
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
              onAffiliateClick('cardhoarder', getCardhoarderUrl(), displayTix);
            }}
          >
            <span className="flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5" />
              Cardhoarder (MTGO)
            </span>
            <span className="font-semibold">{displayTix} {tixLabel}</span>
          </Button>
        )}
        {showFallbackLinks && fallbackLinks}
        {showLoadingLinks && loadingLinks}

      </div>
    </div>
  );
}
