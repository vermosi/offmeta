/**
 * EvolutionArc — horizontal milestone timeline showing the 2025→2026 product journey.
 * @module about/EvolutionArc
 */

const MILESTONES = [
  { year: '2025', label: 'AI-powered Scryfall translator' },
  { year: 'Early 2026', label: 'Search + Deckbuilder' },
  { year: 'Mid 2026', label: 'Discovery + Combos' },
  { year: 'Late 2026', label: 'Meta Intelligence Platform' },
];

export function EvolutionArc() {
  return (
    <section className="py-16 sm:py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3 text-foreground">
          The Big Picture
        </h2>
        <p className="text-center text-muted-foreground text-sm mb-12 max-w-xl mx-auto">
          From a query translator to a full meta-intelligence platform — this is where OffMeta is going.
        </p>

        {/* Desktop horizontal layout */}
        <div className="hidden sm:block relative">
          {/* Connecting line */}
          <div className="absolute top-5 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary/30 via-accent/60 to-muted-foreground/20" />

          <div className="grid grid-cols-4 gap-4 relative">
            {MILESTONES.map((m, i) => (
              <div key={m.year} className="flex flex-col items-center gap-3 text-center">
                {/* Dot */}
                <div
                  className="relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                  style={{
                    borderColor: i < 2 ? 'hsl(var(--accent))' : i === 2 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    background: i < 2 ? 'hsl(var(--accent) / 0.15)' : i === 2 ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--muted) / 0.5)',
                    color: i < 2 ? 'hsl(var(--accent))' : i === 2 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.year}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile vertical layout */}
        <div className="sm:hidden relative pl-8">
          <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-accent/60 via-primary/40 to-muted-foreground/20" />
          <div className="space-y-8">
            {MILESTONES.map((m, i) => (
              <div key={m.year} className="relative flex items-start gap-4">
                <div
                  className="absolute -left-5 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: i < 2 ? 'hsl(var(--accent))' : i === 2 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    background: i < 2 ? 'hsl(var(--accent) / 0.15)' : 'hsl(var(--muted) / 0.5)',
                  }}
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{m.year}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">{m.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
