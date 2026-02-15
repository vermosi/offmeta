/**
 * Hero section displayed on the home page before a search.
 */

import { useRef, useEffect } from 'react';
import { RandomCardButton } from '@/components/RandomCardButton';

export function HeroSection() {
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
      className="relative pt-8 sm:pt-14 lg:pt-20 pb-6 sm:pb-10"
      aria-labelledby="hero-heading"
    >
      <div className="container-main text-center stagger-children relative z-10">
        <h1
          id="hero-heading"
          className="mb-5 sm:mb-8 text-foreground text-4xl sm:text-5xl lg:text-7xl font-semibold"
        >
          Find Magic Cards
          <br />
          <span className="text-gradient">Like You Think</span>
        </h1>

        <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-8">
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
            Describe what you're looking for in plain English.
          </p>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground">
            No complex syntax. No guessing.
          </p>
          <p className="text-base sm:text-lg lg:text-xl text-foreground font-medium mt-3">
            Just natural conversation.
          </p>
        </div>

        <div className="flex justify-center">
          <RandomCardButton />
        </div>
      </div>
    </section>
  );
}
