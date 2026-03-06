/**
 * First-visit onboarding walkthrough — 3-step tooltip overlay
 * that guides new visitors to try a search immediately.
 */

import { useEffect, useState, useCallback, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, Sparkles, MousePointerClick, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingStep } from '@/hooks/useOnboarding';
import { useTranslation } from '@/lib/i18n';
import { useIsMobile } from '@/hooks/useMobile';

interface OnboardingWalkthroughProps {
  isActive: boolean;
  step: OnboardingStep;
  onAdvance: () => void;
  onDismiss: () => void;
  /** Ref to the search bar container */
  searchBarRef: RefObject<HTMLElement | null>;
  /** Callback to auto-fill an example query */
  onFillExample: () => void;
}

interface TooltipPosition {
  top: number;
  left: number;
  width: number;
  spotlightRect: DOMRect | null;
}

const STEP_CONFIG: Record<OnboardingStep, {
  iconKey: 'sparkles' | 'click' | 'party';
  titleKey: string;
  descKey: string;
  actionKey: string;
}> = {
  1: {
    iconKey: 'sparkles',
    titleKey: 'onboarding.step1Title',
    descKey: 'onboarding.step1Desc',
    actionKey: 'onboarding.step1Action',
  },
  2: {
    iconKey: 'click',
    titleKey: 'onboarding.step2Title',
    descKey: 'onboarding.step2Desc',
    actionKey: 'onboarding.step2Action',
  },
  3: {
    iconKey: 'party',
    titleKey: 'onboarding.step3Title',
    descKey: 'onboarding.step3Desc',
    actionKey: 'onboarding.step3Action',
  },
};

const ICONS = {
  sparkles: Sparkles,
  click: MousePointerClick,
  party: PartyPopper,
};

export function OnboardingWalkthrough({
  isActive,
  step,
  onAdvance,
  onDismiss,
  searchBarRef,
  onFillExample,
}: OnboardingWalkthroughProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hasFilledExample = useRef(false);

  // Calculate position relative to the search bar
  const updatePosition = useCallback(() => {
    const el = searchBarRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 12,
      left: rect.left,
      width: rect.width,
      spotlightRect: rect,
    });
  }, [searchBarRef]);

  useEffect(() => {
    if (!isActive) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isActive, updatePosition, step]);

  // Auto-fill example on step 2
  useEffect(() => {
    if (step === 2 && !hasFilledExample.current) {
      hasFilledExample.current = true;
      onFillExample();
    }
  }, [step, onFillExample]);

  // Escape to dismiss
  useEffect(() => {
    if (!isActive) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isActive, onDismiss]);

  if (!isActive || !position) return null;

  const config = STEP_CONFIG[step];
  const Icon = ICONS[config.iconKey];
  const spotRect = position.spotlightRect;

  return createPortal(
    <div className="fixed inset-0 z-[9998]" aria-hidden="true">
      {/* Backdrop with spotlight cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="onboarding-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotRect && (
              <rect
                x={spotRect.left - 8}
                y={spotRect.top - 8}
                width={spotRect.width + 16}
                height={spotRect.height + 16}
                rx="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="hsl(270 45% 6% / 0.5)"
          mask="url(#onboarding-mask)"
          style={{ pointerEvents: 'auto' }}
          onClick={onDismiss}
        />
      </svg>

      {/* Spotlight ring */}
      {spotRect && (
        <div
          className="absolute rounded-2xl border-2 border-accent/60 animate-pulse pointer-events-none"
          style={{
            top: spotRect.top - 8,
            left: spotRect.left - 8,
            width: spotRect.width + 16,
            height: spotRect.height + 16,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-label={t('onboarding.title')}
        className="absolute z-[9999] animate-scale-in"
        style={{
          top: position.top,
          left: isMobile ? 16 : position.left,
          width: isMobile ? 'calc(100vw - 32px)' : Math.min(position.width, 420),
        }}
      >
        <div className="bg-card border border-border rounded-xl shadow-xl p-4 sm:p-5 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {t(config.titleKey)}
              </h3>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0"
              aria-label={t('a11y.close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t(config.descKey)}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            {/* Step dots */}
            <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'w-4 bg-accent'
                      : s < step
                        ? 'w-1.5 bg-accent/40'
                        : 'w-1.5 bg-border'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onDismiss}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                {t('onboarding.skip')}
              </button>
              <Button
                variant="accent"
                size="sm"
                onClick={onAdvance}
                className="h-8 px-3 text-xs gap-1"
              >
                {t(config.actionKey)}
                {step < 3 && <ArrowRight className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
