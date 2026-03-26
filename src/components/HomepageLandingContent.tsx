import { Button } from '@/components/ui/button';

interface HomepageLandingContentProps {
  onTrySearch: (query: string) => void;
}

const EXAMPLE_PROMPTS = [
  'cheap removal',
  'commander board wipes under $5',
  'cards like Lightning Bolt',
  'mono green ramp creatures',
  'graveyard hate in modern',
  'draw spells for blue control',
];

export function HomepageLandingContent({
  onTrySearch,
}: HomepageLandingContentProps) {
  return (
    <section
      className="container-main space-y-10 sm:space-y-12 pt-6 sm:pt-8 pb-6 sm:pb-10"
      aria-label="OffMeta overview"
    >
      <div className="rounded-xl border border-border bg-card/70 p-5 sm:p-6 space-y-5">
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
            Search Magic cards in plain English
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            OffMeta is a natural language Magic card search tool that turns your
            description into a real Scryfall query.
          </p>
          <p className="text-sm text-muted-foreground">
            Type what you want, review how it was interpreted, edit if needed,
            then explore results.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background/70 p-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Example input → generated query
          </p>
          <p className="text-sm text-foreground">
            &ldquo;commander board wipes under $5&rdquo;
          </p>
          <code className="block text-xs sm:text-sm rounded-md border border-border bg-card px-3 py-2 text-foreground overflow-x-auto">
            f:commander otag:boardwipe usd&lt;5
          </code>
          <p className="text-xs text-muted-foreground">
            You can edit this query before running it again.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            How it works
          </h3>
          <ol className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
            <li>1. Type what you want to find.</li>
            <li>2. See the generated Scryfall query.</li>
            <li>3. Adjust the query if you want more control.</li>
            <li>4. Browse results and refine quickly.</li>
          </ol>
        </div>

        <div className="space-y-3">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Popular ways players search
          </h3>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                onClick={() => onTrySearch(prompt)}
                className="text-xs sm:text-sm"
              >
                {prompt}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Why players use OffMeta
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">Clarity:</span>{' '}
              Understand exactly what query is running.
            </li>
            <li>
              <span className="text-foreground font-medium">Transparency:</span>{' '}
              See the plain English to Scryfall translation.
            </li>
            <li>
              <span className="text-foreground font-medium">Flexibility:</span>{' '}
              Edit generated syntax any time.
            </li>
            <li>
              <span className="text-foreground font-medium">Learning:</span>{' '}
              Pick up Scryfall patterns while you search.
            </li>
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-background/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Try a search now
            </h3>
            <p className="text-sm text-muted-foreground">
              Start with an example above, or type your own card request.
            </p>
          </div>
          <Button
            onClick={() => onTrySearch('best white removal spells under $3')}
          >
            Try an instant search
          </Button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground">
        OffMeta is an MTG search tool for practical, transparent Magic card
        search workflows. Use natural language search to generate accurate
        Scryfall search syntax, review the interpretation, and refine results
        without leaving the flow.
      </p>
    </section>
  );
}
