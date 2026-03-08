/**
 * "How It Works" — 4-step visual flow with connecting gradient line,
 * staggered scroll-reveal animations, and playful descriptions.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import {
  MessageSquareText,
  Eye,
  Grid3X3,
  SlidersHorizontal,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function HowItWorksSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const steps = useMemo(
    () => [
      {
        icon: MessageSquareText,
        title: t('howItWorks.step1Title'),
        description: t('howItWorks.step1Desc'),
        accent: 'Type naturally — no syntax memorization required.',
      },
      {
        icon: Eye,
        title: t('howItWorks.step2Title'),
        description: t('howItWorks.step2Desc'),
        accent: 'See exactly what we searched so you stay in control.',
      },
      {
        icon: Grid3X3,
        title: t('howItWorks.step3Title'),
        description: t('howItWorks.step3Desc'),
        accent: 'Rich card data, prices, and printings at a glance.',
      },
      {
        icon: SlidersHorizontal,
        title: t('howItWorks.step4Title'),
        description: t('howItWorks.step4Desc'),
        accent: 'Narrow results by color, type, price, and more.',
      },
    ],
    [t],
  );

  return (
    <section
      ref={sectionRef}
      className="py-12 sm:py-16 lg:py-20"
      aria-labelledby="how-it-works-heading"
    >
      <div className="container-main">
        <div className="text-center mb-10 sm:mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-accent/20 bg-accent/5 text-accent text-xs font-medium mb-4">
            ✦ Dead simple
          </span>
          <h2
            id="how-it-works-heading"
            className="text-2xl sm:text-3xl lg:text-4xl font-semibold"
          >
            {t('howItWorks.heading')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-md mx-auto">
            From thought to results in under 3 seconds. No learning curve.
          </p>
        </div>

        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Connecting gradient line (desktop only) */}
          <div
            className="hidden lg:block absolute top-[72px] left-[12.5%] right-[12.5%] h-[2px] z-0"
            aria-hidden="true"
            style={{
              background: 'linear-gradient(90deg, hsl(var(--gradient-start) / 0.3), hsl(var(--gradient-end) / 0.3))',
            }}
          />

          {steps.map((step, index) => (
            <div
              key={index}
              className={`relative z-10 flex flex-col items-center text-center p-6 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm transition-all duration-500 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-6'
              }`}
              style={{
                transitionDelay: `${index * 120}ms`,
              }}
            >
              {/* Step number badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-accent to-accent/80 text-accent-foreground">
                {t('howItWorks.step')} {index + 1}
              </div>

              <div className="mt-3 mb-4 p-3 rounded-full bg-accent/10 border border-accent/10">
                <step.icon className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>

              <h3 className="text-base sm:text-lg font-medium mb-1.5">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                {step.description}
              </p>
              <p className="text-xs text-accent/80 font-medium italic">
                {step.accent}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
