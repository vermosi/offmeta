import {
  MessageSquareText,
  Eye,
  Grid3X3,
  SlidersHorizontal,
} from 'lucide-react';

const STEPS = [
  {
    icon: MessageSquareText,
    title: "Describe what you're looking for",
    description:
      "Type a natural language description of the cards you want to find. For example: 'green creatures that ramp' or 'board wipes under $5 for commander'.",
  },
  {
    icon: Eye,
    title: 'Review the translation',
    description:
      'OffMeta shows you the Scryfall query it generated from your description. You can see exactly what syntax was used and edit it if needed.',
  },
  {
    icon: Grid3X3,
    title: 'Browse your results',
    description:
      'Scroll through the matching cards. Click any card to see full details including oracle text, prices, legalities, and all printings.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Refine with filters',
    description:
      'Use the filter chips to narrow results by color, format, card type, mana cost, price, or rarity without rewriting your search.',
  },
];

export function HowItWorksSection() {
  return (
    <section
      className="py-12 sm:py-16 border-t border-border/50"
      aria-labelledby="how-it-works-heading"
    >
      <div className="container-main">
        <h2
          id="how-it-works-heading"
          className="text-2xl sm:text-3xl font-semibold text-center mb-8 sm:mb-12"
        >
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {STEPS.map((step, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center text-center p-6 rounded-xl border border-border/50 bg-card/50 animate-reveal"
              style={{
                animationDelay: `${index * 150}ms`,
                animationFillMode: 'forwards',
              }}
            >
              {/* Step number */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                Step {index + 1}
              </div>

              {/* Icon */}
              <div className="mt-2 mb-4 p-3 rounded-full bg-accent/10">
                <step.icon className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>

              {/* Content */}
              <h3 className="text-base sm:text-lg font-medium mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
