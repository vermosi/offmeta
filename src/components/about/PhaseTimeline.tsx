/**
 * PhaseTimeline — vertical 7-phase timeline for the About page.
 * Uses IntersectionObserver for staggered scroll-reveal animations.
 * @module about/PhaseTimeline
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Zap, Clock, Sparkles } from 'lucide-react';

type PhaseStatus = 'complete' | 'live' | 'in-progress' | 'upcoming';

interface Phase {
  number: number;
  emoji: string;
  name: string;
  tagline: string;
  status: PhaseStatus;
  description: string;
  shipped: string[];
  result: string;
}

const PHASES: Phase[] = [
  {
    number: 1,
    emoji: '🟢',
    name: 'Semantic Search Foundation',
    tagline: 'Natural language → Scryfall query',
    status: 'complete',
    description: 'OffMeta began as a natural-language search engine for Magic players. The goal: let anyone find cards by describing what they want.',
    shipped: [
      'Plain English → Scryfall query translation',
      'Deterministic parser (AI used only when needed)',
      'Query syntax transparency',
      'Search results grid',
    ],
    result: 'Proved that intent-based MTG search works.',
  },
  {
    number: 2,
    emoji: '🔵',
    name: 'Reliability & Cost Optimization',
    tagline: 'Stable, predictable, sustainable',
    status: 'complete',
    description: 'Once search worked, the focus shifted to making it bulletproof without burning through AI credits.',
    shipped: [
      'Request deduplication',
      'Rate limiting',
      'Query caching',
      'Timeout + fallback logic',
      'AI call cost reduction',
      'Improved error handling + logging',
    ],
    result: 'OffMeta became reliable, predictable, and sustainable.',
  },
  {
    number: 3,
    emoji: '🟣',
    name: 'UX & Daily-Use Polish',
    tagline: 'From prototype to product',
    status: 'complete',
    description: 'The interface matured into something players could use every day without friction.',
    shipped: [
      'Card detail modal',
      'Hover image previews',
      'Printing picker',
      'Set badges',
      'Layout and empty-state improvements',
    ],
    result: 'OffMeta started feeling like a real product — not a prototype.',
  },
  {
    number: 4,
    emoji: '🟠',
    name: 'Deckbuilder Expansion',
    tagline: 'Beyond search',
    status: 'complete',
    description: 'OffMeta expanded beyond finding cards into helping players build with them.',
    shipped: [
      'Deckbuilder MVP',
      'Deck import / export',
      'Sort + view modes',
      'Maybeboard support',
      'Companion support',
      'Legality enforcement',
      'Deck recommendations',
    ],
    result: 'OffMeta evolved from search tool → deck construction platform.',
  },
  {
    number: 5,
    emoji: '🔴',
    name: 'Combos & Discovery Layer',
    tagline: 'Search became insight',
    status: 'live',
    description: 'The combo detection layer turned OffMeta into a discovery engine.',
    shipped: [
      'Combo detection UI',
      'Dedicated Combos navigation',
      'Integration into deck workflow',
    ],
    result: 'OffMeta began functioning as a discovery engine, not just a filter.',
  },
  {
    number: 6,
    emoji: '🚧',
    name: 'Refinement & Intelligence',
    tagline: 'Smarter than traditional search',
    status: 'in-progress',
    description: 'Making every interaction sharper, more accurate, and faster. Closing the gap between what players think and what Scryfall understands.',
    shipped: [
      'Semantic accuracy improvements',
      'Recommendation tuning',
      'Edge-case parsing fixes',
      'Performance optimization',
    ],
    result: 'OffMeta feels smarter than traditional search.',
  },
  {
    number: 7,
    emoji: '🔮',
    name: 'Meta Intelligence Platform',
    tagline: 'The full vision',
    status: 'upcoming',
    description: 'The endgame: a living, breathing meta intelligence layer that understands the game as well as experienced players do.',
    shipped: [
      'Meta context layer',
      'Pro tools & advanced filtering',
      'Community & shared decks',
      'Archetype clustering + AI critique',
    ],
    result: 'OffMeta becomes the go-to intelligence layer for competitive and casual MTG players.',
  },
];

const STATUS_CONFIG: Record<PhaseStatus, {
  label: string;
  icon: React.ReactNode;
  dotClass: string;
  borderClass: string;
  badgeClass: string;
}> = {
  complete: {
    label: 'Complete',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    dotClass: 'bg-green-500 shadow-[0_0_8px_hsl(142_71%_45%/0.6)]',
    borderClass: 'border-green-500/30',
    badgeClass: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  live: {
    label: 'Live',
    icon: <Zap className="h-3.5 w-3.5" />,
    dotClass: 'bg-red-500 shadow-[0_0_8px_hsl(0_84%_60%/0.6)] animate-pulse',
    borderClass: 'border-red-500/30',
    badgeClass: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  'in-progress': {
    label: 'In Progress',
    icon: <Clock className="h-3.5 w-3.5" />,
    dotClass: 'bg-yellow-500 shadow-[0_0_8px_hsl(48_96%_53%/0.6)]',
    borderClass: 'border-yellow-500/30',
    badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  },
  upcoming: {
    label: 'Upcoming',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    dotClass: 'bg-muted-foreground/40',
    borderClass: 'border-border/40',
    badgeClass: 'bg-muted/50 text-muted-foreground border-border/40',
  },
};

function PhaseCard({ phase, index }: { phase: Phase; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const cfg = STATUS_CONFIG[phase.status];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), index * 80);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      className={`
        transition-all duration-700 ease-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
    >
      <div className={`
        relative rounded-xl border bg-card/30 backdrop-blur-sm p-6
        hover:bg-card/50 transition-colors duration-300
        ${cfg.borderClass}
      `}>
        {/* Phase number + status badge */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-bold text-muted-foreground/60 tracking-widest uppercase">
            Phase {phase.number}
          </span>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.badgeClass}`}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
          {phase.emoji} {phase.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{phase.tagline}</p>

        {/* Description */}
        <p className="text-sm text-muted-foreground/80 leading-relaxed mb-5">
          {phase.description}
        </p>

        {/* Shipped items */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-2">
            What shipped
          </p>
          <ul className="space-y-1.5">
            {phase.shipped.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className={`mt-1 text-xs ${phase.status === 'upcoming' ? 'text-muted-foreground/30' : 'text-green-400/70'}`}>
                  ✓
                </span>
                <span className="text-sm text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Result callout */}
        <div className={`rounded-lg px-4 py-3 border-l-2 ${phase.status === 'upcoming' ? 'bg-muted/20 border-muted-foreground/20' : 'bg-primary/5 border-primary/30'}`}>
          <p className="text-xs text-muted-foreground italic">
            <span className="font-semibold text-foreground/70 not-italic">Result: </span>
            {phase.result}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PhaseTimeline() {
  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">The Journey</h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Seven phases. One mission: make finding the right Magic card feel like talking to an expert.
          </p>
        </div>

        {/* Timeline with connecting line */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-green-500/50 via-accent/30 to-muted-foreground/10 hidden sm:block" />

          <div className="space-y-6 sm:pl-12">
            {/* Dots on line */}
            <div className="hidden sm:block">
              {PHASES.map((phase, i) => {
                const cfg = STATUS_CONFIG[phase.status];
                return (
                  <div
                    key={phase.number}
                    className={`absolute left-[11px] w-2.5 h-2.5 rounded-full ${cfg.dotClass}`}
                    style={{ top: `calc(${i * (100 / 7)}% + 2.5rem)` }}
                  />
                );
              })}
            </div>

            {PHASES.map((phase, i) => (
              <PhaseCard key={phase.number} phase={phase} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
