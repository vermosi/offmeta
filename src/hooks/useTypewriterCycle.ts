/**
 * Hook that endlessly cycles through phrases with a typewriter effect.
 * Respects `prefers-reduced-motion` — returns the first phrase statically
 * if the user has requested reduced motion.
 * @module hooks/useTypewriterCycle
 */

import { useState, useEffect, useRef } from 'react';

const TYPE_SPEED = 60;     // ms per character typed
const DELETE_SPEED = 35;   // ms per character deleted
const PAUSE_AFTER = 2000;  // ms to hold completed phrase
const PAUSE_BETWEEN = 400; // ms gap between delete and next phrase

export function useTypewriterCycle(phrases: readonly string[]): string {
  const [display, setDisplay] = useState('');
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!phrases.length) return;

    // Respect reduced-motion preference — just show the first phrase statically
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setDisplay(phrases[0]);
      return;
    }

    cancelledRef.current = false;

    let timeout: ReturnType<typeof setTimeout>;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, ms);
      });

    async function run() {
      let index = 0;
      while (!cancelledRef.current) {
        const phrase = phrases[index % phrases.length];

        // Type forward
        for (let i = 0; i <= phrase.length; i++) {
          if (cancelledRef.current) return;
          setDisplay(phrase.slice(0, i));
          await sleep(TYPE_SPEED);
        }

        await sleep(PAUSE_AFTER);
        if (cancelledRef.current) return;

        // Delete backwards
        for (let i = phrase.length; i >= 0; i--) {
          if (cancelledRef.current) return;
          setDisplay(phrase.slice(0, i));
          await sleep(DELETE_SPEED);
        }

        await sleep(PAUSE_BETWEEN);
        index++;
      }
    }

    run();

    return () => {
      cancelledRef.current = true;
      clearTimeout(timeout);
    };
  }, [phrases]);

  return display;
}
