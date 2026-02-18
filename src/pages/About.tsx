/**
 * About page — showcases OffMeta's 7-phase product journey.
 * Cinematic narrative from v1 search translator to meta-intelligence platform.
 * @module pages/About
 */

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { StatCounters } from '@/components/about/StatCounters';
import { PhaseTimeline } from '@/components/about/PhaseTimeline';
import { EvolutionArc } from '@/components/about/EvolutionArc';
import { NextPhaseCards } from '@/components/about/NextPhaseCards';
import { Link } from 'react-router-dom';
import { Search, Layers, Swords } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative py-20 sm:py-32 px-4 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-accent/5 blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-[400px] h-[200px] rounded-full bg-primary/5 blur-3xl" />
          </div>

          <div className="relative max-w-3xl mx-auto text-center">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4 border border-border/50 rounded-full px-3 py-1">
              The OffMeta Story
            </span>

            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Built for players who{' '}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                think in text
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-12 max-w-2xl mx-auto">
              OffMeta started as a simple question: <em>"What if you could find Magic cards just by describing what you want?"</em> 
              Seven phases later, it's becoming something much bigger.
            </p>

            <StatCounters />
          </div>
        </section>

        {/* ── Phase Timeline ── */}
        <div className="border-t border-border/30">
          <PhaseTimeline />
        </div>

        {/* ── Evolution Arc ── */}
        <div className="border-t border-border/30 bg-card/20">
          <EvolutionArc />
        </div>

        {/* ── Phase 7 Next Cards ── */}
        <div className="border-t border-border/30">
          <NextPhaseCards />
        </div>

        {/* ── CTA ── */}
        <section className="border-t border-border/30 bg-card/20 py-16 sm:py-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
              Ready to search smarter?
            </h2>
            <p className="text-muted-foreground text-sm mb-10 max-w-lg mx-auto">
              Every phase brought OffMeta closer to the tool serious Magic players deserve. 
              Try it now — all of it is free.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Search className="h-4 w-4" />
                Try the Search
              </Link>
              <Link
                to="/deckbuilder"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card/50 text-foreground text-sm font-medium hover:bg-card transition-colors"
              >
                <Layers className="h-4 w-4" />
                Open Deck Builder
              </Link>
              <Link
                to="/combos"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card/50 text-foreground text-sm font-medium hover:bg-card transition-colors"
              >
                <Swords className="h-4 w-4" />
                Find Combos
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
