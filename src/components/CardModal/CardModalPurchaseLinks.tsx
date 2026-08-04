/**
 * Purchase links component for CardModal.
 * Displays simple, centered buy buttons for TCGplayer, Cardmarket, and Cardhoarder.
 * @module components/CardModal/CardModalPurchaseLinks
 */

import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Sparkles, Monitor } from 'lucide-react';
import { getTCGPlayerUrl, getCardmarketUrl } from '@/lib/scryfall/printings';
import type { CardModalPurchaseLinksProps } from './types';
import { useTranslation } from '@/lib/i18n';
import { useAffiliateConfig, wrapAffiliateUrl } from '@/hooks';

const BUTTON_CLASS =
  'h-10 w-full grid grid-cols-[1fr_auto] items-center gap-2 px-3 text-sm';
const LEFT_CLASS = 'flex items-center gap-2 truncate';
const RIGHT_CLASS = 'font-semibold shrink-0';
const ICON_CLASS = 'h-4 w-4 shrink-0';


interface PurchaseLink {
  key: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href: string;
  onClick: () => void;
}

function withParam(url: string, param: string): string {
  return url.includes('?') ? `${url}&${param}` : `${url}?${param}`;
}

export function CardModalPurchaseLinks({
  card,
  displayPrices,
  displayTix,
  selectedPrinting,
  onAffiliateClick,
}: CardModalPurchaseLinksProps) {
  const { t } = useTranslation();
  const affiliateConfig = useAffiliateConfig();
  const { tcgplayerAffiliateBase } = affiliateConfig;
  const cardNameEncoded = encodeURIComponent(card.name);

  const wrapIfTcgplayer = (url: string, marketplace: string) =>
    marketplace.includes('tcgplayer') && tcgplayerAffiliateBase
      ? wrapAffiliateUrl(url, tcgplayerAffiliateBase)
      : url;

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
      href: wrapIfTcgplayer(tcgplayerUrl, 'tcgplayer'),
      onClick: () =>
        onAffiliateClick('tcgplayer', tcgplayerUrl, displayPrices.usd),
    });
  }
  if (displayPrices.usd_foil) {
    const foilUrl = withParam(tcgplayerUrl, 'Printing=Foil');
    links.push({
      key: 'tcgplayer-foil',
      icon: Sparkles,
      label: `TCGplayer ${foilLabel}`,
      value: `$${displayPrices.usd_foil}`,
      href: wrapIfTcgplayer(foilUrl, 'tcgplayer-foil'),
      onClick: () =>
        onAffiliateClick('tcgplayer-foil', foilUrl, displayPrices.usd_foil),
    });
  }
  if (displayPrices.eur) {
    links.push({
      key: 'cardmarket',
      icon: ShoppingCart,
      label: 'Cardmarket',
      value: `€${displayPrices.eur}`,
      href: cardmarketUrl,
      onClick: () =>
        onAffiliateClick('cardmarket', cardmarketUrl, displayPrices.eur),
    });
  }
  if (displayPrices.eur_foil) {
    const foilUrl = withParam(cardmarketUrl, 'isFoil=Y');
    links.push({
      key: 'cardmarket-foil',
      icon: Sparkles,
      label: `Cardmarket ${foilLabel}`,
      value: `€${displayPrices.eur_foil}`,
      href: foilUrl,
      onClick: () =>
        onAffiliateClick('cardmarket-foil', foilUrl, displayPrices.eur_foil),
    });
  }
  if (displayTix) {
    const cardhoarderUrl = getCardhoarderUrl();
    links.push({
      key: 'cardhoarder',
      icon: Monitor,
      label: 'Cardhoarder (MTGO)',
      value: `${displayTix} ${tixLabel}`,
      href: cardhoarderUrl,
      onClick: () =>
        onAffiliateClick('cardhoarder', cardhoarderUrl, displayTix),
    });
  }

  const getBuyLinkAriaLabel = (vendor: string) =>
    t(
      'card.buyLinkAriaLabel',
      'Buy {cardName} on {vendor} (opens in a new tab)',
      { cardName: card.name, vendor },
    );

  return (
    <div className="w-full">
      <h3 className="text-center mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {buyLabel}
      </h3>
      <div className="space-y-2">
        {links.length > 0 ? (
          links.map(({ key, icon: Icon, label, value, href, onClick }) => (
            <Button
              key={key}
              size="sm"
              variant={key === 'tcgplayer' ? 'default' : 'outline'}
              className={BUTTON_CLASS}
              asChild
            >
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={getBuyLinkAriaLabel(label)}
                onClick={onClick}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className={ICON_CLASS} />
                  <span className="truncate">{label}</span>
                </span>
                <span className="font-semibold shrink-0">{value}</span>
              </a>
            </Button>
          ))
        ) : (
          <>
            <Button size="sm" className={BUTTON_CLASS} asChild>
              <a
                href={wrapIfTcgplayer(tcgplayerUrl, 'tcgplayer')}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={getBuyLinkAriaLabel('TCGplayer')}
                onClick={() => onAffiliateClick('tcgplayer', tcgplayerUrl)}
              >
                <span className="flex items-center gap-2 truncate">
                  <ShoppingCart className={ICON_CLASS} />
                  TCGplayer
                </span>
                <span className="opacity-80">{checkPriceLabel}</span>
              </a>
            </Button>
            <Button size="sm" variant="outline" className={BUTTON_CLASS} asChild>
              <a
                href={cardmarketUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={getBuyLinkAriaLabel('Cardmarket')}
                onClick={() => onAffiliateClick('cardmarket', cardmarketUrl)}
              >
                <span className="flex items-center gap-2 truncate">
                  <ShoppingCart className={ICON_CLASS} />
                  Cardmarket
                </span>
                <span className="opacity-80">{checkPriceLabel}</span>
              </a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
