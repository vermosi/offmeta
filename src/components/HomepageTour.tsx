/**
 * HomepageTour — a lightweight, opt-in guided tour of the homepage.
 *
 * Design goals:
 * - Never intrusive: starts as a small dismissible pill, not a modal.
 * - Shown once per visitor (localStorage), replayable from the pill.
 * - Anchors a popover to real page elements and scrolls them into view.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Compass, X } from 'lucide-react';

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

  const step = stepIndex === null ? null : (TOUR_STEPS[stepIndex] ?? null);

  useEffect(() => {
    if (readSeen()) return undefined;
    const timer = window.setTimeout(() => setInvitationVisible(true), 1500);
    return () => window.clearTimeout(timer);
  }, []);

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
      setPosition(null);
      return undefined;
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

  const endTour = useCallback(() => {
    setStepIndex(null);
    setInvitationVisible(false);
    markSeen();
  }, []);

  const startTour = useCallback(() => {
    setInvitationVisible(false);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    setStepIndex((current) => {
      if (current === null) return null;
      if (current + 1 >= TOUR_STEPS.length) {
        markSeen();
        return null;
      }
      return current + 1;
    });
  }, []);

  useEffect(() => {
    if (stepIndex === null) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') endTour();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepIndex, endTour]);

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
      <div className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <Compass className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">
            New here? Take a 20-second tour.
          </span>
          <button
            type="button"
            onClick={startTour}
            className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground"
          >
            Start
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={endTour}
            aria-label="Dismiss tour invitation"
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Homepage tour"
      className="absolute z-50 rounded-2xl border border-accent/40 bg-card/98 p-4 shadow-2xl backdrop-blur-sm"
      style={
        popoverStyle ?? {
          top: window.scrollY + 80,
          left: 16,
          width: 320,
        }
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{step?.title}</p>
        <button
          type="button"
          onClick={endTour}
          aria-label="Close tour"
          className="focus-ring -mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {step?.body}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {(stepIndex ?? 0) + 1} / {TOUR_STEPS.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={endTour}
            className="focus-ring rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={next}
            className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground"
          >
            {(stepIndex ?? 0) + 1 === TOUR_STEPS.length ? 'Done' : 'Next'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
