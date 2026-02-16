/**
 * Hero section displayed on the home page before a search.
 */

import { useRef, useEffect } from 'react';
import { RandomCardButton } from '@/components/RandomCardButton';
import { useTranslation } from '@/lib/i18n';

export function HeroSection() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        if (orb1Ref.current) {
          orb1Ref.current.style.transform = `translate(${scrollY * 0.02}px, ${scrollY * 0.05}px)`;
        }
        if (orb2Ref.current) {
          orb2Ref.current.style.transform = `translate(${-scrollY * 0.03}px, ${scrollY * 0.04}px)`;
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative pt-10 sm:pt-14 lg:pt-20 pb-6 sm:pb-8 lg:pb-10"
      aria-labelledby="hero-heading"
    >
      <div className="container-main text-center stagger-children relative z-10">
        <h1
          id="hero-heading"
          className="mb-5 sm:mb-8 text-foreground text-4xl sm:text-5xl lg:text-7xl font-semibold"
        >
          {t('hero.title')}
          <br />
          <span className="text-gradient">{t('hero.titleAccent')}</span>
        </h1>

        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-lg mx-auto">
          {t('hero.subtitle')}
          <span className="text-foreground font-medium"> {t('hero.subtitleAccent')}</span>
        </p>

        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
          <RandomCardButton />
          <span className="text-xs text-muted-foreground/60">{t('hero.orStartTyping')}</span>
        </div>
      </div>
    </section>
  );
}
