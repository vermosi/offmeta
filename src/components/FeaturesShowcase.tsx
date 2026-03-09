/**
 * Showcase section — highlights OffMeta's core tools with gradient accents,
 * scroll-reveal animations, and differentiated benefit callouts.
 */

import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Compass, Wand2, Swords, FileText, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const FEATURE_KEYS = [
  { icon: Search, key: 'smartSearch', href: '#how-it-works', hash: true },
  { icon: Wand2, key: 'deckRecs', href: '/deck-recs' },
  { icon: Swords, key: 'comboFinder', href: '/combos' },
  { icon: Compass, key: 'archetypes', href: '/archetypes' },
  { icon: BookOpen, key: 'guides', href: '/guides' },
  { icon: FileText, key: 'syntax', href: '/docs/syntax' },
] as const;

interface FeaturesShowcaseProps {
  onScrollTo?: (id: string) => void;
}

export function FeaturesShowcase({ onScrollTo }: FeaturesShowcaseProps) {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="container-main" aria-labelledby="features-heading">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-medium mb-4">
          {t('features.badge')}
        </span>
        <h2 id="features-heading" className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
          {t('features.heading')}
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
          {t('features.subtitle')}{' '}
          <span className="text-foreground font-medium">{t('features.subtitleAccent')}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_KEYS.map((feature, index) => {
          const Icon = feature.icon;
          const title = t(`features.${feature.key}.title`);
          const description = t(`features.${feature.key}.description`);
          const benefit = t(`features.${feature.key}.benefit`);
          const content = (
            <div
              className={`group rounded-xl border border-border/50 bg-card/50 p-5 hover:bg-card hover:border-accent/20 hover:shadow-hover transition-all duration-300 flex flex-col gap-3 h-full ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-4'
              }`}
              style={{
                transitionDelay: `${index * 80}ms`,
              }}
            >
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/10 flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-accent" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="text-sm font-semibold group-hover:text-accent transition-colors flex items-center gap-1.5">
                  {title}
                  <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 transition-all duration-200" aria-hidden="true" />
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
              <div className="pt-1 border-t border-border/30">
                <span className="text-[10px] sm:text-[11px] font-medium text-accent/70 uppercase tracking-wider">
                  {benefit}
                </span>
              </div>
            </div>
          );

          if ('hash' in feature && feature.hash) {
            return (
              <button
                key={feature.key}
                onClick={() => {
                  if (onScrollTo) {
                    onScrollTo(feature.href.slice(1));
                  } else {
                    const el = document.getElementById(feature.href.slice(1));
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-left"
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={feature.key} to={feature.href} className="block">
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
