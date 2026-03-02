import { useMemo } from 'react';
import {
  MessageSquareText,
  Eye,
  Grid3X3,
  SlidersHorizontal,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = useMemo(
    () => [
      { icon: MessageSquareText, title: t('howItWorks.step1Title'), description: t('howItWorks.step1Desc') },
      { icon: Eye, title: t('howItWorks.step2Title'), description: t('howItWorks.step2Desc') },
      { icon: Grid3X3, title: t('howItWorks.step3Title'), description: t('howItWorks.step3Desc') },
      { icon: SlidersHorizontal, title: t('howItWorks.step4Title'), description: t('howItWorks.step4Desc') },
    ],
    [t],
  );

  return (
    <section
      className="py-10 sm:py-14 lg:py-16"
      aria-labelledby="how-it-works-heading"
    >
      <div className="container-main">
        <h2
          id="how-it-works-heading"
          className="text-2xl sm:text-3xl font-semibold text-center mb-8 sm:mb-10"
        >
          {t('howItWorks.heading')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center text-center p-6 rounded-xl border border-border/50 bg-card/50 animate-reveal"
              style={{
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'forwards',
              }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                {t('howItWorks.step')} {index + 1}
              </div>

              <div className="mt-2 mb-4 p-3 rounded-full bg-accent/10">
                <step.icon className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>

              <h3 className="text-base sm:text-lg font-medium mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
