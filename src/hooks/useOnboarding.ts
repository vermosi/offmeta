/**
 * Hook managing first-visit onboarding state.
 * Persists completion to localStorage so it only shows once.
 */

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'offmeta_onboarding_done';

export type OnboardingStep = 1 | 2 | 3;

export function useOnboarding() {
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState<OnboardingStep>(1);

  // Check localStorage on mount — only show for first-time visitors
  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        const timer = setTimeout(() => setIsActive(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage unavailable — skip onboarding
    }
    return undefined;
  }, []);

  const advance = useCallback(() => {
    setStep((s) => {
      if (s >= 3) {
        setIsActive(false);
        try { localStorage.setItem(STORAGE_KEY, '1'); } catch {
          // localStorage unavailable
        }
        return s;
      }
      return (s + 1) as OnboardingStep;
    });
  }, []);

  const dismiss = useCallback(() => {
    setIsActive(false);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {
      // localStorage unavailable
    }
  }, []);

  return { isActive, step, advance, dismiss };
}
