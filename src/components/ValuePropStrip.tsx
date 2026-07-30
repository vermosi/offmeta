import { Search, Sparkles, WandSparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const VALUE_PROPS = [
  {
    icon: Search,
    titleKey: 'valueProp.searchTitle',
    titleFallback: 'Describe the card you want',
    bodyKey: 'valueProp.searchBody',
    bodyFallback: 'Type plain English and let OffMeta translate the intent.',
  },
  {
    icon: WandSparkles,
    titleKey: 'valueProp.translateTitle',
    titleFallback: 'Get a precise Scryfall query',
    bodyKey: 'valueProp.translateBody',
    bodyFallback: 'See the exact search syntax before you commit to it.',
  },
  {
    icon: Sparkles,
    titleKey: 'valueProp.discoverTitle',
    titleFallback: 'Find better follow-up cards',
    bodyKey: 'valueProp.discoverBody',
    bodyFallback: 'Surface similar, budget, and synergy ideas instantly.',
  },
] as const;

export function ValuePropStrip() {
  const { t } = useTranslation();

  return (
    <section
      className="py-8 sm:py-10"
      aria-label={t('valueProp.ariaLabel', 'Key benefits')}
    >
      <div className="container-main">
        <div className="grid gap-3 md:grid-cols-3">
          {VALUE_PROPS.map(({ icon: Icon, titleKey, titleFallback, bodyKey, bodyFallback }) => (
            <div
              key={titleKey}
              className="rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
                <span>{t(titleKey, titleFallback)}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {t(bodyKey, bodyFallback)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
