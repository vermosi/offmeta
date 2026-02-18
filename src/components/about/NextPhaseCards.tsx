/**
 * NextPhaseCards — teaser cards for Phase 7 upcoming features.
 * Styled with dashed borders and a "coming soon" treatment.
 * @module about/NextPhaseCards
 */

import { TrendingUp, Wrench, Users, Brain } from 'lucide-react';

interface PhaseCard {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  features: string[];
}

const PHASE_7_CARDS: PhaseCard[] = [
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Meta Context',
    subtitle: 'Trend-aware search',
    features: [
      'Trend overlays',
      'Popularity indicators',
      '"Why this card?" explanations',
      'Format-aware weighting',
    ],
  },
  {
    icon: <Wrench className="h-5 w-5" />,
    title: 'Pro Tools',
    subtitle: 'Power-user controls',
    features: [
      'Advanced filtering controls',
      'Price delta comparisons',
      'Semantic neighbors panel',
      'Export search → shareable image',
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Community',
    subtitle: 'Shared discovery',
    features: [
      'Public shared decks',
      'Search snapshots',
      'Saved searches (URL-based)',
      'Community archetypes',
    ],
  },
  {
    icon: <Brain className="h-5 w-5" />,
    title: 'Intelligence',
    subtitle: 'AI-powered insight',
    features: [
      'Archetype clustering',
      'Commander synergy scoring',
      'AI deck critique mode',
      'Semantic card neighbors',
    ],
  },
];

export function NextPhaseCards() {
  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-3 border border-border/50 rounded-full px-3 py-1">
            Phase 7 — Upcoming
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">What's Next</h2>
          <p className="text-muted-foreground text-sm max-w-xl mx-auto">
            The roadmap ahead. OffMeta evolves from a search tool into a full meta-intelligence platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PHASE_7_CARDS.map((card) => (
            <div
              key={card.title}
              className="relative rounded-xl border border-dashed border-border/60 bg-card/20 p-5 flex flex-col gap-4 hover:border-primary/40 hover:bg-card/40 transition-all duration-300 group"
            >
              {/* Coming soon badge */}
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-medium text-muted-foreground/60 tracking-wide uppercase">
                  Soon
                </span>
              </div>

              {/* Icon */}
              <div className="w-9 h-9 rounded-lg bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-300">
                {card.icon}
              </div>

              <div>
                <h3 className="font-semibold text-sm text-foreground">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{card.subtitle}</p>
              </div>

              <ul className="space-y-1.5 mt-auto">
                {card.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="text-muted-foreground/40 mt-0.5 text-xs">—</span>
                    <span className="text-xs text-muted-foreground/70">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
