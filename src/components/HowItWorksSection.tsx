/**
 * "How It Works" — 3-step visual flow with glass cards.
 * @module components/HowItWorksSection
 */

import { MessageSquare, Sparkles, LayoutGrid } from 'lucide-react';

const STEPS = [
  {
    icon: MessageSquare,
    number: '1',
    title: 'Describe what you need',
    detail: '"budget board wipes under $5"',
  },
  {
    icon: Sparkles,
    number: '2',
    title: 'We translate it',
    detail: 'AI converts to precise Scryfall syntax',
  },
  {
    icon: LayoutGrid,
    number: '3',
    title: 'Get real results',
    detail: 'Instant cards from the full MTG database',
  },
] as const;

export function HowItWorksSection() {
  return (
    <section
      className="container-main py-8 sm:py-12"
      aria-label="How it works"
    >
      <h2 className="text-center text-lg sm:text-xl font-semibold text-foreground mb-6 sm:mb-8 tracking-tight">
        How it works
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 stagger-children max-w-3xl mx-auto">
        {STEPS.map(({ icon: Icon, number, title, detail }) => (
          <div
            key={number}
            className="glass-card relative flex flex-col items-center text-center p-5 sm:p-6 rounded-2xl"
          >
            {/* Number badge */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-3 bg-gradient-to-br from-accent to-accent/60 text-accent-foreground shadow-sm">
              {number}
            </div>

            <Icon
              className="h-6 w-6 text-accent mb-2 flex-shrink-0"
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {detail}
            </p>

            {/* Connector arrow (hidden on mobile, only between cards) */}
            {number !== '3' && (
              <div
                className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 text-lg z-10"
                aria-hidden="true"
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
