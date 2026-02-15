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
import {
  HelpCircle,
  Lightbulb,
  Sparkles,
  BookOpen,
  ExternalLink,
  Zap,
  Target,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import {
  EXAMPLE_QUERIES,
  CONFIDENCE_LEVELS,
  TIPS,
  ADVANCED_FEATURES,
  SCRYFALL_SYNTAX_TIPS,
} from './data';

interface SearchHelpModalProps {
  onTryExample?: (query: string) => void;
}

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
          size="sm"
          className="h-8 px-2 gap-1.5 text-xs rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Search help"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Help</span>
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
                OffMeta understands natural language. Just describe what you are
                looking for!
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
                        <Badge
                          variant="secondary"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
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
                      Every search creates a unique URL you can copy and share!
                      Click the Share button after searching to copy the link.
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
                  OffMeta translates your natural language to Scryfall syntax.
                  Here are the key operators:
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
                  You can also use Scryfall search syntax directly—our engine
                  will recognize and pass it through.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    window.open('https://scryfall.com/docs/syntax', '_blank')
                  }
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
                  When you search, OffMeta shows a confidence level indicating
                  how well it understood your query.
                </p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    If results do not match your expectations, try rephrasing
                    your query or check the &quot;Interpreted as&quot; section
                    to see what the search engine understood.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {CONFIDENCE_LEVELS.map((level) => (
                  <div key={level.level} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('font-medium', level.color)}
                      >
                        {level.level}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-1">
                      {level.description}
                    </p>
                    <div className="flex flex-wrap gap-2 pl-1">
                      {level.examples.map((ex) => (
                        <span
                          key={ex}
                          className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                        >
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
                    <span>
                      <strong>Clarity:</strong> Specific, well-defined queries
                      score higher
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>MTG Terms:</strong> Using game terminology
                      improves accuracy
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Ambiguity:</strong> Vague or multi-interpretation
                      queries score lower
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Complexity:</strong> Very complex queries may have
                      lower confidence
                    </span>
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
                  For power users, you can also use Scryfall search syntax
                  directly. Our natural language engine will recognize it and
                  pass it through.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    window.open('https://scryfall.com/docs/syntax', '_blank')
                  }
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
            Can&apos;t find what you need? Use the feedback button after
            searching to help us improve!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
