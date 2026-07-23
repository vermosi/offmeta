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
import { useTranslation } from '@/lib/i18n';
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
  const { t } = useTranslation();

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
          className="h-8 px-2 gap-1.5 text-xs rounded-full text-foreground/90 hover:text-foreground"
          aria-label={t('help.ariaLabel', 'Search help')}
          data-testid="search-help-trigger"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{t('help.label', 'Help')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0" aria-describedby={undefined}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
          {t('help.title', 'Search Help')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="examples" className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="examples" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">{t('help.tabs.examples', 'Examples')}</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">{t('help.tabs.advanced', 'Advanced')}</span>
              </TabsTrigger>
              <TabsTrigger value="confidence" className="gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">{t('help.tabs.confidence', 'Confidence')}</span>
              </TabsTrigger>
              <TabsTrigger value="tips" className="gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">{t('help.tabs.tips', 'Tips')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[400px] px-6 py-4">
            <TabsContent value="examples" className="mt-0 space-y-6">
              <p className="text-sm text-muted-foreground">{t('help.examples.intro', 'Start with these examples to get the hang of natural-language search.')}</p>

              {EXAMPLE_QUERIES.map((category) => (
                <div key={category.categoryKey} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <category.icon className="h-4 w-4 text-primary" />
                    {t(category.categoryKey)}
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
                            {t(example.descriptionKey)}
                          </p>
                        </div>
                        <Badge
                          variant="secondary"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {t('help.tryIt', 'Try it')}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="advanced" className="mt-0 space-y-6">
              <p className="text-sm text-muted-foreground">{t('help.advanced.intro', 'Use these advanced patterns when you want precise control over the query.')}</p>

              {ADVANCED_FEATURES.map((feature) => (
                <div key={feature.categoryKey} className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {t(feature.categoryKey)}
                  </h3>
                  <div className="space-y-1.5">
                    {feature.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-sm text-muted-foreground pl-3 border-l-2 border-primary/30"
                      >
                        {t(item)}
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
                      {t('help.shareable.title', 'Shareable searches')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('help.shareable.body', 'Copy a query link and send it anywhere.')}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  {t('help.syntax.title', 'Scryfall syntax')}
                </h3>
                <p className="text-sm text-muted-foreground">{t('help.syntax.intro', 'These operators help you narrow searches quickly.')}</p>
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
                          {t(tip.meaningKey)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t(tip.descriptionKey)}</p>
                      <p className="text-xs text-muted-foreground italic">{t(tip.example)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  {t('help.docs.title', 'Documentation')}
                </h3>
                <p className="text-sm text-muted-foreground">{t('help.docs.body', 'Read the full syntax guide for deeper examples and edge cases.')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    window.open('https://scryfall.com/docs/syntax', '_blank', 'noopener,noreferrer')
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('help.docs.button', 'Open syntax docs')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="confidence" className="mt-0 space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('help.confidence.intro', 'Confidence tells you how sure OffMeta is about the translation.')}</p>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{t('help.confidence.note', 'Low confidence usually means the query is ambiguous or very broad.')}</p>
                </div>
              </div>

              <div className="space-y-4">
                {CONFIDENCE_LEVELS.map((level) => (
                  <div key={level.levelKey} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('font-medium', level.color)}>
                        {t(level.levelKey)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-1">
                      {t(level.descriptionKey)}
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
                  {t('help.confidence.factors')}
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>{t('help.confidence.clarityLabel')}</strong> {t('help.confidence.clarityBody')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>{t('help.confidence.termsLabel')}</strong> {t('help.confidence.termsBody')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>{t('help.confidence.ambiguityLabel')}</strong> {t('help.confidence.ambiguityBody')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>{t('help.confidence.complexityLabel')}</strong> {t('help.confidence.complexityBody')}
                    </span>
                  </li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="tips" className="mt-0 space-y-6">
              <p className="text-sm text-muted-foreground">{t('help.tips.intro')}</p>

              <div className="space-y-3">
                {TIPS.map((tip, index) => (
                  <div
                    key={tip}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card"
                  >
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground">{t(tip)}</p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  {t('help.syntax.advancedTitle')}
                </h3>
                <p className="text-sm text-muted-foreground">{t('help.syntax.advancedBody')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() =>
                    window.open('https://scryfall.com/docs/syntax', '_blank', 'noopener,noreferrer')
                  }
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('help.docs.button')}
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">{t('help.footer')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
