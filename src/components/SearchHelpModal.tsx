/**
 * Search help modal with documentation, examples, and tips.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle, Lightbulb, Sparkles, BookOpen, ExternalLink, Zap, Target, AlertCircle, Mountain, Users, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchHelpModalProps {
  onTryExample?: (query: string) => void;
}

const EXAMPLE_QUERIES = [
  {
    category: "Basic Searches",
    icon: Lightbulb,
    examples: [
      { query: "cheap red creatures", description: "Low-cost red creature cards" },
      { query: "blue card draw spells", description: "Blue instants/sorceries that draw cards" },
      { query: "green ramp cards", description: "Green mana acceleration" },
      { query: "black removal", description: "Black creature destruction spells" },
    ]
  },
  {
    category: "Strategy & Synergy",
    icon: Target,
    examples: [
      { query: "sacrifice outlets for commander", description: "Cards that let you sacrifice permanents" },
      { query: "cards that make treasure tokens", description: "Treasure token generators" },
      { query: "ETB triggers that deal damage", description: "Enter-the-battlefield damage effects" },
      { query: "graveyard recursion in white", description: "White cards that return things from graveyard" },
    ]
  },
  {
    category: "Format-Specific",
    icon: Zap,
    examples: [
      { query: "modern legal counterspells", description: "Counter magic playable in Modern" },
      { query: "pauper staples for mono blue", description: "Common blue cards for Pauper" },
      { query: "commander dragons under $5", description: "Budget legendary dragons" },
      { query: "standard legal board wipes", description: "Mass removal in current Standard" },
    ]
  },
  {
    category: "Mana & Colors",
    icon: Mountain,
    examples: [
      { query: "artifacts that produce 2 mana", description: "Mana rocks with high output" },
      { query: "red or black creatures under 3 mana", description: "Cheap Rakdos-only creatures" },
      { query: "lands that produce any color", description: "Five-color mana fixing" },
      { query: "mana dorks that cost 1", description: "One-mana creature ramp" },
    ]
  },
  {
    category: "Tribal / Typal",
    icon: Users,
    examples: [
      { query: "elf lords", description: "Elves that buff other elves" },
      { query: "zombie tribal payoffs", description: "Cards that reward playing zombies" },
      { query: "dragon commanders under $10", description: "Budget legendary dragons" },
      { query: "goblin token generators", description: "Cards that create goblin tokens" },
    ]
  },
  {
    category: "Complex Queries",
    icon: Sparkles,
    examples: [
      { query: "creatures that double ETB effects", description: "Panharmonicon-style effects" },
      { query: "artifacts that produce 2 mana and cost 4 or less", description: "Efficient mana rocks" },
      { query: "red or black creature that draws cards", description: "Rakdos card advantage creatures" },
      { query: "enchantments that draw cards when creatures die", description: "Death trigger card advantage" },
    ]
  },
];

const CONFIDENCE_LEVELS = [
  {
    level: "High (80-100%)",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    description: "The search engine is very confident it understood your query correctly. Results should closely match what you asked for.",
    examples: ["red creatures", "blue instants", "legendary dragons"]
  },
  {
    level: "Medium (50-79%)",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    description: "The engine made some assumptions about your query. Check the interpretation to see if it matches your intent.",
    examples: ["cards that go infinite", "combo pieces for Yawgmoth"]
  },
  {
    level: "Low (<50%)",
    color: "bg-red-500/10 text-red-600 border-red-500/30",
    description: "The engine is uncertain about the translation. Consider rephrasing or using more specific terms.",
    examples: ["that one card from the set with the thing"]
  },
];

const TIPS = [
  "Be specific about colors, formats, and card types when possible",
  "Use common MTG terminology like 'ETB', 'ramp', 'mill', 'voltron'",
  "Mention price constraints like 'under $5' or 'budget'",
  "Specify formats: 'modern legal', 'commander staple', 'pauper playable'",
  "Describe effects: 'draws cards', 'destroys creatures', 'gains life'",
  "Use color combinations: 'Rakdos', 'Simic', 'Esper', 'Naya'",
  "Reference archetypes: 'aristocrats', 'tokens', 'control', 'aggro'",
  "Search land types: 'fetch lands', 'shock lands', 'check lands', 'triomes'",
  "Tribal searches work: 'goblin lords', 'elf tribal', 'zombie payoffs'",
  "Sort results: 'sorted by price', 'cheapest first', 'by popularity'",
];

const ADVANCED_FEATURES = [
  {
    category: "Land Type Shortcuts",
    items: [
      "fetch lands, shock lands, check lands, pain lands",
      "fast lands, slow lands, dual lands, triomes",
      "bounce lands, filter lands, MDFCs",
    ]
  },
  {
    category: "Sorting & Display",
    items: [
      "sorted by price, cheapest first",
      "sorted by popularity (EDHREC rank)",
      "newest printings, oldest printing",
    ]
  },
  {
    category: "Format Legality",
    items: [
      "banned in commander, restricted in vintage",
      "not legal in modern, legal in pioneer",
      "pauper legal, historic legal",
    ]
  },
  {
    category: "Price Preferences",
    items: [
      "under $5, budget, cheap",
      "under $1 for pauper, expensive staples",
      "cheapest version, premium printing",
    ]
  },
  {
    category: "Commander-Specific",
    items: [
      "partner commanders, backgrounds",
      "cEDH staples, casual commander",
      "fast mana, staples for [color]",
    ]
  },
];

// Advanced Scryfall syntax tips for power users
const SCRYFALL_SYNTAX_TIPS = [
  {
    syntax: "c<=rb",
    meaning: "Color restricted to red/black only",
    example: "\"red or black creature\" → c<=rb t:creature",
    description: "Excludes Gruul, Grixis, etc. — only mono-red, mono-black, or Rakdos"
  },
  {
    syntax: "c>=rb",
    meaning: "Must have BOTH red AND black",
    example: "\"red and black creature\" → c>=rb t:creature",
    description: "Requires both colors — includes Rakdos, Grixis, Mardu, etc."
  },
  {
    syntax: "c=r",
    meaning: "Exactly this color only (mono)",
    example: "\"mono red creature\" → c=r t:creature",
    description: "Excludes all multicolor cards"
  },
  {
    syntax: "id<=br",
    meaning: "Playable in Rakdos commander",
    example: "\"fits in Rakdos deck\" → id<=br",
    description: "Color identity — includes colorless, mono-R, mono-B, and Rakdos"
  },
  {
    syntax: "produces>=2",
    meaning: "Produces 2+ mana",
    example: "\"artifact that makes 2 mana\" → t:artifact produces>=2",
    description: "Filter by mana production amount"
  },
  {
    syntax: "produces:g",
    meaning: "Produces green mana",
    example: "\"lands that tap for green\" → t:land produces:g",
    description: "Filter by mana color production"
  },
  {
    syntax: "mv<=4",
    meaning: "Mana value 4 or less",
    example: "\"cheap dragons\" → t:dragon mv<=4",
    description: "Also: mv=3 (exactly 3), mv>=5 (5+)"
  },
  {
    syntax: "year>=2020",
    meaning: "Printed in 2020 or later",
    example: "\"recent commanders\" → is:commander year>=2020",
    description: "Filter by release year"
  },
];

export function SearchHelpModal({ onTryExample }: SearchHelpModalProps) {
  const [open, setOpen] = useState(false);

  const handleTryExample = (query: string) => {
    setOpen(false);
    onTryExample?.(query);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Search help"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            Search Help
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="examples" className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="examples" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">Examples</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Advanced</span>
              </TabsTrigger>
              <TabsTrigger value="confidence" className="gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Confidence</span>
              </TabsTrigger>
              <TabsTrigger value="tips" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Tips</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[400px] px-6 py-4">
            {/* Examples Tab */}
            <TabsContent value="examples" className="mt-0 space-y-6">
              <p className="text-sm text-muted-foreground">
                OffMeta understands natural language. Just describe what you are looking for!
              </p>

              {EXAMPLE_QUERIES.map((category) => (
                <div key={category.category} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <category.icon className="h-4 w-4 text-primary" />
                    {category.category}
                  </h3>
                  <div className="grid gap-2">
                    {category.examples.map((example) => (
                      <button
                        key={example.query}
                        onClick={() => handleTryExample(example.query)}
                        className="group flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors text-left"
                      >
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            &quot;{example.query}&quot;
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {example.description}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          Try it
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="mt-0 space-y-6">
              <p className="text-sm text-muted-foreground">
                Power-user features for more precise searches:
              </p>

              {ADVANCED_FEATURES.map((feature) => (
                <div key={feature.category} className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {feature.category}
                  </h3>
                  <div className="space-y-1.5">
                    {feature.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-border">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Share2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Shareable Searches
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Every search creates a unique URL you can copy and share! Click the Share button after searching to copy the link.
                    </p>
                  </div>
                </div>
              </div>

              {/* Scryfall Syntax Quick Reference */}
              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Scryfall Syntax Quick Reference
                </h3>
                <p className="text-sm text-muted-foreground">
                  OffMeta translates your natural language to Scryfall syntax. Here are the key operators:
                </p>
                <div className="space-y-2">
                  {SCRYFALL_SYNTAX_TIPS.map((tip) => (
                    <div
                      key={tip.syntax}
                      className="p-3 rounded-lg border border-border bg-card space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-medium">
                          {tip.syntax}
                        </code>
                        <span className="text-sm font-medium text-foreground">
                          {tip.meaning}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {tip.description}
                      </p>
                      <p className="text-xs text-muted-foreground italic">
                        {tip.example}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Full Scryfall Documentation
                </h3>
                <p className="text-sm text-muted-foreground">
                  You can also use Scryfall search syntax directly—our engine will recognize and pass it through.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open('https://scryfall.com/docs/syntax', '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Scryfall Syntax Guide
                </Button>
              </div>
            </TabsContent>

            {/* Confidence Tab */}
            <TabsContent value="confidence" className="mt-0 space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  When you search, OffMeta shows a confidence level indicating how well it understood your query.
                </p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    If results do not match your expectations, try rephrasing your query or check the &quot;Interpreted as&quot; section to see what the search engine understood.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {CONFIDENCE_LEVELS.map((level) => (
                  <div key={level.level} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("font-medium", level.color)}>
                        {level.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-1">
                      {level.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pl-1">
                      {level.examples.map((ex) => (
                        <span key={ex} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">
                  What affects confidence?
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Clarity:</strong> Specific, well-defined queries score higher</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>MTG Terms:</strong> Using game terminology improves accuracy</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Ambiguity:</strong> Vague or multi-interpretation queries score lower</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span><strong>Complexity:</strong> Very complex queries may have lower confidence</span>
                  </li>
                </ul>
              </div>
            </TabsContent>

            {/* Tips Tab */}
            <TabsContent value="tips" className="mt-0 space-y-6">
              <p className="text-sm text-muted-foreground">
                Get better results with these search tips:
              </p>

              <div className="space-y-3">
                {TIPS.map((tip, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground">{tip}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Advanced: Scryfall Syntax
                </h3>
                <p className="text-sm text-muted-foreground">
                  For power users, you can also use Scryfall search syntax directly. Our natural language engine will recognize it and pass it through.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open('https://scryfall.com/docs/syntax', '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Scryfall Syntax Guide
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            Can&apos;t find what you need? Use the feedback button after searching to help us improve!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
