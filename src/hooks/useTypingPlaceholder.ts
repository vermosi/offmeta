/**
 * Hook that produces a typewriter effect cycling through demo phrases.
 * Runs whenever enabled and respects reduced motion.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

const DEMO_PHRASES = [
  'creatures that make treasure tokens',
  'board wipes under $5 for commander',
  'green ramp spells in modern',
  'legendary dragons with flying',
];

const TYPE_SPEED = 45; // ms per character
const PAUSE_AFTER = 1800; // ms to hold completed phrase
const DELETE_SPEED = 25; // ms per character when deleting
const PAUSE_BETWEEN = 400; // ms pause between delete and next phrase

export function useTypingPlaceholder(fallback: string, enabled: boolean) {
  const [text, setText] = useState('');
  const cancelledRef = useRef(false);

  const shouldAnimate = useCallback(() => {
    if (!enabled) return false;
    if (typeof window === 'undefined') return false;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  }, [enabled]);

  const isAnimating = shouldAnimate();

  useEffect(() => {
    if (!shouldAnimate()) {
      cancelledRef.current = true;
      return;
    }

    cancelledRef.current = false;

    let timeout: ReturnType<typeof setTimeout>;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, ms);
      });

    async function run() {
      while (!cancelledRef.current) {
        for (let p = 0; p < DEMO_PHRASES.length; p++) {
          if (cancelledRef.current) return;
          const phrase = DEMO_PHRASES[p];

          // Type forward
          for (let i = 0; i <= phrase.length; i++) {
            if (cancelledRef.current) return;
            setText(phrase.slice(0, i));
            await sleep(TYPE_SPEED);
          }

          await sleep(PAUSE_AFTER);
          if (cancelledRef.current) return;

          // Delete before next phrase
          for (let i = phrase.length; i >= 0; i--) {
            if (cancelledRef.current) return;
            setText(phrase.slice(0, i));
            await sleep(DELETE_SPEED);
          }

          await sleep(PAUSE_BETWEEN);
        }
      }
    }

    run();

    return () => {
      cancelledRef.current = true;
      clearTimeout(timeout);
      setText('');
    };
  }, [shouldAnimate]);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    setText('');
  }, []);

  return {
    placeholder: fallback,
    typingText: isAnimating ? text : '',
    isAnimating,
    stop,
  };
}
