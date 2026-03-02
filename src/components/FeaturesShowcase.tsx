/**
 * Showcase section for the home page — highlights OffMeta's core tools.
 * Displayed below the Daily Pick on the landing page.
 */

import { Link } from 'react-router-dom';
import { Search, BookOpen, Compass, Wand2, Swords, FileText } from 'lucide-react';

const FEATURES = [
  {
    icon: Search,
    title: 'Smart Card Search',
    description: 'Type what you want in plain English — we translate it to precise Scryfall syntax instantly.',
    href: '#how-it-works',
    hash: true,
  },
  {
    icon: Wand2,
    title: 'Deck Recommendations',
    description: 'Import your deck from Moxfield and get AI-powered upgrade suggestions categorized by synergy, budget, and strategy.',
    href: '/deck-recs',
  },
  {
    icon: Swords,
    title: 'Combo Finder',
    description: 'Discover powerful card combos for any commander. See prerequisites, steps, and prices at a glance.',
    href: '/combos',
  },
  {
    icon: Compass,
    title: 'Commander Archetypes',
    description: 'Explore popular archetypes like Aristocrats, Voltron, and Spellslinger with curated card lists.',
    href: '/archetypes',
  },
  {
    icon: BookOpen,
    title: 'Search Guides',
    description: '10 progressive guides from beginner to expert — master natural language search in minutes.',
    href: '/guides',
  },
  {
    icon: FileText,
    title: 'Syntax Cheat Sheet',
    description: 'A quick-reference for every Scryfall operator, filter, and shortcut you might need.',
    href: '/docs/syntax',
  },
] as const;

interface FeaturesShowcaseProps {
  onScrollTo?: (id: string) => void;
}

export function FeaturesShowcase({ onScrollTo }: FeaturesShowcaseProps) {
  return (
    <section className="container-main" aria-labelledby="features-heading">
      <div className="text-center mb-6">
        <h2 id="features-heading" className="text-lg sm:text-xl font-bold tracking-tight">
          Everything You Need for MTG Deckbuilding
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
          From card discovery to deck optimization — all powered by natural language and AI.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          const content = (
            <div className="group rounded-xl border border-border/50 bg-card/50 p-5 hover:bg-card hover:border-border hover:shadow-md transition-all flex flex-col gap-3 h-full">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          );

          if ('hash' in feature && feature.hash) {
            return (
              <button
                key={feature.title}
                onClick={() => {
                  if (onScrollTo) {
                    onScrollTo(feature.href.slice(1));
                  } else {
                    const el = document.getElementById(feature.href.slice(1));
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="text-left"
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={feature.title} to={feature.href} className="block">
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
