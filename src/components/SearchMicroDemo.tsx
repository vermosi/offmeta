import { ArrowRight, SearchCode, Sparkles } from 'lucide-react';

interface DemoFlow {
  naturalQuery: string;
  translatedQuery: string;
  preview: string;
}

const DEMO_FLOWS: DemoFlow[] = [
  {
    naturalQuery: 'cards that protect my commander',
    translatedQuery:
      'is:commander (o:hexproof or o:indestructible or o:"phase out")',
    preview: '104 protection options',
  },
  {
    naturalQuery: 'budget board wipes under $5',
    translatedQuery: 'usd<=5 (o:"destroy all creatures" or o:"each creature")',
    preview: '37 budget sweepers',
  },
  {
    naturalQuery: 'mana rocks that cost 2',
    translatedQuery: 't:artifact mv=2 (o:"add {" or o:mana)',
    preview: '63 two-mana ramp cards',
  },
];

export function SearchMicroDemo() {
  return (
    <section
      aria-label="How OffMeta works"
      className="mx-auto w-full max-w-5xl rounded-3xl border border-border/60 bg-card/70 p-4 sm:p-5 lg:p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-left">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>How it works</span>
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">
              Type what you want. OffMeta translates it for you.
            </h2>
            <p className="mt-1 text-sm sm:text-base text-muted-foreground">
              Natural language in, Scryfall-ready search out, plus useful
              results you can act on right away.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {DEMO_FLOWS.map((flow) => (
            <article
              key={flow.naturalQuery}
              className="rounded-2xl border border-border/60 bg-background/70 p-4"
            >
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <SearchCode
                  className="h-3.5 w-3.5 text-accent"
                  aria-hidden="true"
                />
                <span>Example</span>
              </div>
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    You type
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    “{flow.naturalQuery}”
                  </p>
                </div>

                <div className="flex items-center gap-2 text-accent">
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  <span className="text-xs font-medium uppercase tracking-wide">
                    OffMeta translates
                  </span>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Scryfall query
                  </p>
                  <code className="mt-1 block rounded-xl border border-border/60 bg-secondary/60 px-3 py-2 text-xs text-foreground break-words">
                    {flow.translatedQuery}
                  </code>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Result preview
                  </p>
                  <p className="mt-1 text-sm text-foreground">{flow.preview}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
