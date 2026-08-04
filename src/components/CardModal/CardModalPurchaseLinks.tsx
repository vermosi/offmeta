/**
 * Purchase links component for CardModal.
 * Displays buy buttons for TCGplayer, Cardmarket, Cardhoarder.
 * Desktop and mobile share one layout: identical spacing, icons and button heights.
 * @module components/CardModal/CardModalPurchaseLinks
 */

import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2, Sparkles, Monitor } from 'lucide-react';
import { getTCGPlayerUrl, getCardmarketUrl } from '@/lib/scryfall/printings';
import type { CardModalPurchaseLinksProps } from './types';
import { useTranslation } from '@/lib/i18n';

/** Shared visual contract so every buy button matches height, padding and gap. */
const BUTTON_CLASS = 'h-9 w-full justify-between gap-2 px-3 text-xs';
const ICON_CLASS = 'h-3.5 w-3.5 shrink-0';

interface PurchaseLink {
  key: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  primary: boolean;
  onClick: () => void;
}

/** Appends a query parameter to a purchase URL, respecting an existing query string. */
function withParam(url: string, param: string): string {
  return url.includes('?') ? `${url}&${param}` : `${url}?${param}`;
}

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

  const tcgplayerUrl =
    selectedPrinting?.purchase_uris?.tcgplayer || getTCGPlayerUrl(card);
  const cardmarketUrl =
    selectedPrinting?.purchase_uris?.cardmarket || getCardmarketUrl(card);

  const links: PurchaseLink[] = [];

  if (displayPrices.usd) {
    links.push({
      key: 'tcgplayer',
      icon: ShoppingCart,
      label: 'TCGplayer',
      value: `$${displayPrices.usd}`,
      primary: true,
      onClick: () =>
        onAffiliateClick('tcgplayer', tcgplayerUrl, displayPrices.usd),
    });
  }
  if (displayPrices.usd_foil) {
    links.push({
      key: 'tcgplayer-foil',
      icon: Sparkles,
      label: `TCGplayer ${foilLabel}`,
      value: `$${displayPrices.usd_foil}`,
      primary: false,
      onClick: () =>
        onAffiliateClick(
          'tcgplayer-foil',
          withParam(tcgplayerUrl, 'Printing=Foil'),
          displayPrices.usd_foil,
        ),
    });
  }
  if (displayPrices.eur) {
    links.push({
      key: 'cardmarket',
      icon: ShoppingCart,
      label: 'Cardmarket',
      value: `€${displayPrices.eur}`,
      primary: false,
      onClick: () =>
        onAffiliateClick('cardmarket', cardmarketUrl, displayPrices.eur),
    });
  }
  if (displayPrices.eur_foil) {
    links.push({
      key: 'cardmarket-foil',
      icon: Sparkles,
      label: `Cardmarket ${foilLabel}`,
      value: `€${displayPrices.eur_foil}`,
      primary: false,
      onClick: () =>
        onAffiliateClick(
          'cardmarket-foil',
          withParam(cardmarketUrl, 'isFoil=Y'),
          displayPrices.eur_foil,
        ),
    });
  }
  if (displayTix) {
    links.push({
      key: 'cardhoarder',
      icon: Monitor,
      label: 'Cardhoarder (MTGO)',
      value: `${displayTix} ${tixLabel}`,
      primary: false,
      onClick: () =>
        onAffiliateClick('cardhoarder', getCardhoarderUrl(), displayTix),
    });
  }

  const hasAnyPrice = links.length > 0;
  const showFallbackLinks = !hasAnyPrice && !isLoadingPrintings;
  const showLoadingLinks = !hasAnyPrice && isLoadingPrintings;

  const fallbackLinks = (
    <>
      <p className="text-xs text-muted-foreground">{priceUnavailableLabel}</p>
      <Button
        size="sm"
        className={BUTTON_CLASS}
        onClick={() => onAffiliateClick('tcgplayer', tcgplayerUrl)}
      >
        <span className="flex items-center gap-2 truncate">
          <ShoppingCart className={ICON_CLASS} />
          TCGplayer
        </span>
        <span className="opacity-80">{checkPriceLabel}</span>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={BUTTON_CLASS}
        onClick={() => onAffiliateClick('cardmarket', cardmarketUrl)}
      >
        <span className="flex items-center gap-2 truncate">
          <ShoppingCart className={ICON_CLASS} />
          Cardmarket
        </span>
        <span className="opacity-80">{checkPriceLabel}</span>
      </Button>
    </>
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
        className={BUTTON_CLASS}
        aria-label={`TCGplayer — ${loadingPricesLabel}`}
      >
        <span className="flex items-center gap-2 truncate">
          <ShoppingCart className={ICON_CLASS} />
          TCGplayer
        </span>
        <Loader2 className={`${ICON_CLASS} animate-spin`} />
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled
        className={BUTTON_CLASS}
        aria-label={`Cardmarket — ${loadingPricesLabel}`}
      >
        <span className="flex items-center gap-2 truncate">
          <ShoppingCart className={ICON_CLASS} />
          Cardmarket
        </span>
        <Loader2 className={`${ICON_CLASS} animate-spin`} />
      </Button>
    </div>
  );

  return (
    <div className={isMobile ? 'w-full' : 'w-full mt-3 max-w-[220px]'}>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {buyLabel}
      </h3>
      <div className="space-y-1.5">
        {links.map(({ key, icon: Icon, label, value, primary, onClick }) => (
          <Button
            key={key}
            size="sm"
            variant={primary ? 'default' : 'outline'}
            className={BUTTON_CLASS}
            onClick={onClick}
          >
            <span className="flex items-center gap-2 truncate">
              <Icon className={ICON_CLASS} />
              <span className="truncate">{label}</span>
            </span>
            <span className="font-semibold shrink-0">{value}</span>
          </Button>
        ))}
        {showFallbackLinks && fallbackLinks}
        {showLoadingLinks && loadingLinks}
      </div>
    </div>
  );
}
