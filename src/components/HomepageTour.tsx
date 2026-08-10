/**
 * HomepageTour — a lightweight, opt-in guided tour of the homepage.
 *
 * Design goals:
 * - Never intrusive: starts as a small dismissible pill, not a modal.
 * - Shown once per visitor (localStorage), replayable from the pill.
 * - Anchors a popover to real page elements and scrolls them into view.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react';
import { trackTourEvent } from '@/lib/analytics/tour';
import { useFocusTrap } from '@/hooks';



interface TourStep {
  /** CSS selector of the element to highlight. */
  selector: string;
  title: string;
  body: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '#hero-heading',
    title: 'Say it in plain English',
    body: 'OffMeta turns everyday phrasing like "budget board wipes under $5" into a real Scryfall query.',
  },
  {
    selector: '#search-input',
    title: 'Start here',
    body: 'Type the job a card needs to do. No operators, no syntax to memorize.',
  },
  {
    selector: '#home-examples',
    title: 'Not sure what to ask?',
    body: 'Tap an example search to see how the translation works before writing your own.',
  },
  {
    selector: '#home-quick-paths',
    title: 'Go deeper',
    body: 'Jump into guides, combos, and "cards like X" once you have a direction.',
  },
];

const SEEN_KEY = 'offmeta_home_tour_seen';
const HIGHLIGHT_CLASS = 'tour-highlight';

interface Position {
  top: number;
  left: number;
  width: number;
  height: number;
}

function readSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // storage unavailable — tour simply shows again next visit
  }
}

export function HomepageTour() {
  const [invitationVisible, setInvitationVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stepStartedAtRef = useRef<number>(0);
  const maxStepRef = useRef(0);

  const step = stepIndex === null ? null : (TOUR_STEPS[stepIndex] ?? null);

  useEffect(() => {
    if (readSeen()) return undefined;
    const timer = window.setTimeout(() => {
      setInvitationVisible(true);
      trackTourEvent('tour_offered', { total_steps: TOUR_STEPS.length });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  // One `tour_step_viewed` event per step so PostHog can chart drop-off.
  useEffect(() => {
    if (stepIndex === null || !step) return;
    stepStartedAtRef.current = Date.now();
    maxStepRef.current = Math.max(maxStepRef.current, stepIndex + 1);
    trackTourEvent('tour_step_viewed', {
      step_index: stepIndex + 1,
      step_title: step.title,
      total_steps: TOUR_STEPS.length,
      is_last_step: stepIndex + 1 === TOUR_STEPS.length,
    });
  }, [stepIndex, step]);


  const measure = useCallback(() => {
    if (!step) {
      setPosition(null);
      return;
    }
    const el = document.querySelector(step.selector);
    if (!(el instanceof HTMLElement)) {
      setPosition(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
      height: rect.height,
    });
  }, [step]);

  // Scroll target into view, highlight it, and track its position.
  useEffect(() => {
    if (!step) return undefined;
    const el = document.querySelector(step.selector);
    if (!(el instanceof HTMLElement)) {
      // Defer so the effect never triggers a synchronous cascading render.
      const clear = window.requestAnimationFrame(() => setPosition(null));
      return () => window.cancelAnimationFrame(clear);
    }


    el.classList.add(HIGHLIGHT_CLASS);
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const raf = window.requestAnimationFrame(measure);
    const timer = window.setTimeout(measure, 450);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });

    return () => {
      el.classList.remove(HIGHLIGHT_CLASS);
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [step, measure]);

  /** Close the tour. `reason` distinguishes skip / completion / dismissal. */
  const closeTour = useCallback(
    (reason: 'skip' | 'escape' | 'complete' | 'invite_dismissed') => {
      const shared = {
        total_steps: TOUR_STEPS.length,
        furthest_step: maxStepRef.current,
        duration_ms: startedAtRef.current
          ? Date.now() - startedAtRef.current
          : 0,
      };

      if (reason === 'invite_dismissed') {
        trackTourEvent('tour_invite_dismissed', {
          total_steps: TOUR_STEPS.length,
        });
      } else if (reason === 'complete') {
        trackTourEvent('tour_completed', {
          ...shared,
          furthest_step: TOUR_STEPS.length,
        });
      } else {
        trackTourEvent('tour_skipped', {
          ...shared,
          step_index: (stepIndex ?? 0) + 1,
          step_title: TOUR_STEPS[stepIndex ?? 0]?.title,
          exit_method: reason,
          ms_on_step: stepStartedAtRef.current
            ? Date.now() - stepStartedAtRef.current
            : 0,
        });
      }

      setStepIndex(null);
      setInvitationVisible(false);
      markSeen();
    },
    [stepIndex],
  );

  const endTour = useCallback(() => {
    closeTour(stepIndex === null ? 'invite_dismissed' : 'skip');
  }, [closeTour, stepIndex]);

  const startTour = useCallback(() => {
    setInvitationVisible(false);
    startedAtRef.current = Date.now();
    maxStepRef.current = 0;
    trackTourEvent('tour_started', { total_steps: TOUR_STEPS.length });
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    if (stepIndex === null) return;
    if (stepIndex + 1 >= TOUR_STEPS.length) {
      closeTour('complete');
      return;
    }
    setStepIndex(stepIndex + 1);
  }, [stepIndex, closeTour]);

  const previous = useCallback(() => {
    setStepIndex((current) =>
      current === null ? null : Math.max(0, current - 1),
    );
  }, []);

  // Keyboard model: Escape exits, arrow keys move between steps,
  // Home/End jump to the first/last step. Tab is trapped in the popover.
  useEffect(() => {
    if (stepIndex === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          closeTour('escape');
          break;
        case 'ArrowRight':
          event.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          previous();
          break;
        case 'Home':
          event.preventDefault();
          setStepIndex(0);
          break;
        case 'End':
          event.preventDefault();
          setStepIndex(TOUR_STEPS.length - 1);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIndex, closeTour, next, previous]);

  const popoverStyle = useMemo(() => {
    if (!position) return undefined;
    const width = 320;
    const viewportWidth =
      typeof window === 'undefined' ? width : window.innerWidth;
    const left = Math.min(
      Math.max(position.left + position.width / 2 - width / 2, 12),
      Math.max(viewportWidth - width - 12, 12),
    );
    return {
      top: position.top + position.height + 12,
      left,
      width,
    } as const;
  }, [position]);

  if (stepIndex === null && !invitationVisible) return null;

  if (stepIndex === null) {
    return (
      <aside
        aria-label="Homepage tour invitation"
        className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]"
      >
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <Compass className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <p id={inviteTextId} className="text-xs text-muted-foreground">
            New here? Take a 20-second tour.
          </p>
          <button
            type="button"
            onClick={startTour}
            aria-describedby={inviteTextId}
            className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-full bg-accent px-4 text-xs font-medium text-accent-foreground"
          >
            Start tour
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={endTour}
            aria-label="Dismiss tour invitation"
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </aside>
    );
  }

  const currentStep = (stepIndex ?? 0) + 1;
  const isLastStep = currentStep === TOUR_STEPS.length;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      className="absolute z-50 rounded-2xl border border-accent/40 bg-card p-4 shadow-2xl"
      style={
        popoverStyle ?? {
          top: window.scrollY + 80,
          left: 16,
          width: 320,
        }
      }
    >
      {/* Announces each step to screen readers as the tour advances. */}
      <p aria-live="polite" className="sr-only">
        {`Step ${currentStep} of ${TOUR_STEPS.length}: ${step?.title ?? ''}. ${
          step?.body ?? ''
        }`}
      </p>

      <div className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="text-sm font-semibold text-foreground">
          <span className="sr-only">{`Step ${currentStep} of ${TOUR_STEPS.length}: `}</span>
          {step?.title}
        </h2>
        <button
          type="button"
          onClick={endTour}
          aria-label="Close tour"
          className="focus-ring -mr-1 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p id={bodyId} className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {step?.body}
      </p>
      <p className="sr-only">
        Use the left and right arrow keys to move between steps, or press
        Escape to leave the tour.
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          {currentStep} / {TOUR_STEPS.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={previous}
            disabled={currentStep === 1}
            aria-label="Previous step"
            className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={endTour}
            className="focus-ring rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={isLastStep ? 'Finish tour' : 'Next step'}
            className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground"
          >
            {isLastStep ? 'Done' : 'Next'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

}
