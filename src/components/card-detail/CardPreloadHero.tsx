/**
 * First-paint hero for a prerendered card page. Renders the build-time card
 * payload (art, name, type line, oracle text, price) while the full Scryfall
 * record loads, so the page shows real content instead of skeletons.
 * @module components/card-detail/CardPreloadHero
 */

import type { CardPreload } from '@/lib/card-preload';
import { useTranslation } from '@/lib/i18n';

export interface CardPreloadHeroProps {
  preload: CardPreload;
}

export function CardPreloadHero({ preload }: CardPreloadHeroProps) {
  const { t } = useTranslation();
  const oracleParagraphs = (preload.oracle_text ?? '').split(/\n+/).filter(Boolean);

  return (
    <div className="grid gap-6 sm:gap-8 md:grid-cols-[320px_1fr]">
      <div className="mx-auto w-full max-w-[260px] sm:max-w-[320px] md:mx-0">
        {preload.image_url ? (
          <img
            src={preload.image_url}
            alt={preload.name}
            width={488}
            height={680}
            fetchPriority="high"
            decoding="async"
            className="aspect-[488/680] w-full rounded-xl object-cover shadow-lg"
          />
        ) : (
          <div className="aspect-[488/680] w-full rounded-xl bg-muted" aria-hidden="true" />
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{preload.name}</h1>
          {preload.mana_cost && (
            <span className="font-mono text-sm text-muted-foreground">{preload.mana_cost}</span>
          )}
        </div>

        {preload.type_line && (
          <p className="text-sm text-muted-foreground">{preload.type_line}</p>
        )}

        {oracleParagraphs.length > 0 && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-4 text-sm text-foreground">
            {oracleParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {preload.rarity && (
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              {preload.rarity}
            </span>
          )}
          {preload.price_usd && (
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-foreground">
              ${preload.price_usd}
            </span>
          )}
          {preload.price_usd_foil && (
            <span className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground">
              {t('card.foilPrice', 'Foil ${price}', { price: preload.price_usd_foil })}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {t('card.loadingDetails', 'Loading rulings, legality and printings…')}
        </p>
      </div>
    </div>
  );
}
