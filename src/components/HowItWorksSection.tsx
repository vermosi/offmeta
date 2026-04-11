/**
 * "How It Works" — horizontal timeline with animated gradient connectors.
 * Mobile: vertical timeline with gradient line on left.
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
      className="container-main py-12 sm:py-16"
      aria-label="How it works"
    >
      <h2 className="text-center text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground mb-10 sm:mb-14 tracking-tight">
        How it works
      </h2>

      {/* Desktop: horizontal timeline */}
      <div className="hidden sm:flex items-start justify-center gap-0 max-w-4xl mx-auto">
        {STEPS.map(({ icon: Icon, number, title, detail }, i) => (
          <div key={number} className="flex items-start flex-1">
            <div className="flex flex-col items-center text-center flex-1 stagger-children">
              {/* Number badge */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold mb-4 bg-gradient-to-br from-accent to-accent/50 text-accent-foreground shadow-lg shadow-accent/20">
                {number}
              </div>

              <Icon
                className="h-7 w-7 text-accent mb-3 flex-shrink-0"
                aria-hidden="true"
              />
              <h3 className="text-base font-semibold text-foreground mb-2">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
                {detail}
              </p>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div className="flex-shrink-0 w-16 lg:w-24 mt-7 px-2" aria-hidden="true">
                <div className="h-[2px] w-full bg-gradient-to-r from-accent/60 to-accent/10 rounded-full" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical timeline */}
      <div className="sm:hidden relative pl-10">
        {/* Gradient vertical line */}
        <div
          className="absolute left-4 top-2 bottom-2 w-[2px] rounded-full"
          style={{
            background: 'linear-gradient(to bottom, hsl(var(--accent)), hsl(var(--accent) / 0.1))',
          }}
          aria-hidden="true"
        />

        <div className="space-y-8">
          {STEPS.map(({ icon: Icon, number, title, detail }) => (
            <div key={number} className="relative">
              {/* Node on the line */}
              <div className="absolute -left-10 top-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent/50 flex items-center justify-center text-xs font-bold text-accent-foreground shadow-md shadow-accent/20">
                {number}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-5 w-5 text-accent flex-shrink-0" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
