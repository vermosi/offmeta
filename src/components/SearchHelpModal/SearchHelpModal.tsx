import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle, Lightbulb, Sparkles, BookOpen, ExternalLink, Zap, Target, AlertCircle, Share2 } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';
import { EXAMPLE_QUERIES, CONFIDENCE_LEVELS, TIPS, ADVANCED_FEATURES, SCRYFALL_SYNTAX_TIPS } from './data';

interface SearchHelpModalProps { onTryExample?: (query: string) => void; }

export function SearchHelpModal({ onTryExample }: SearchHelpModalProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const handleTryExample = (query: string) => { setOpen(false); onTryExample?.(query); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-full px-2 text-xs text-foreground/90 hover:text-foreground" aria-label={t('help.ariaLabel', 'Search help')} data-testid="search-help-trigger">
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">{t('help.label', 'Help')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl gap-0 p-0" aria-describedby={undefined}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            {t('help.title', 'Search Help')}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="examples" className="flex-1">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="examples" className="gap-2"><Lightbulb className="h-4 w-4" /><span className="hidden sm:inline">{t('help.tabs.examples', 'Examples')}</span></TabsTrigger>
              <TabsTrigger value="advanced" className="gap-2"><Zap className="h-4 w-4" /><span className="hidden sm:inline">{t('help.tabs.advanced', 'Advanced')}</span></TabsTrigger>
              <TabsTrigger value="confidence" className="gap-2"><Target className="h-4 w-4" /><span className="hidden sm:inline">{t('help.tabs.confidence', 'Confidence')}</span></TabsTrigger>
              <TabsTrigger value="tips" className="gap-2"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">{t('help.tabs.tips', 'Tips')}</span></TabsTrigger>
            </TabsList>
          </div>
          <ScrollArea className="h-[400px] px-6 py-4">
            <TabsContent value="examples" className="mt-0 space-y-6">
              <p className="text-sm text-muted-foreground">{t('help.examples.intro', 'Start with these examples to get the hang of natural-language search.')}</p>
              {EXAMPLE_QUERIES.map((category) => (
                <div key={category.categoryKey} className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-foreground"><category.icon className="h-4 w-4 text-primary" />{t(category.categoryKey)}</h3>
                  <div className="grid gap-2">
                    {category.examples.map((example) => (
                      <button key={example.query} onClick={() => handleTryExample(example.query)} className="group flex items-start justify-between gap-3 rounded-lg border border-border/70 bg-card/85 p-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/60">
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-foreground transition-colors group-hover:text-primary">&quot;{example.query}&quot;</p>
                          <p className="text-xs text-muted-foreground">{t(example.descriptionKey)}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">{t('help.tryIt', 'Try it')}</Badge>
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
                  <h3 className="text-sm font-medium text-foreground">{t(feature.categoryKey)}</h3>
                  <div className="space-y-1.5">
                    {feature.items.map((item, idx) => <div key={idx} className="border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground">{t(item)}</div>)}
                  </div>
                </div>
              ))}
              <div className="border-t border-border pt-4">
                <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{t('help.shareable.title', 'Shareable searches')}</p>
                    <p className="text-xs text-muted-foreground">{t('help.shareable.body', 'Copy a query link and send it anywhere.')}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="flex items-center gap-2 text-sm font-medium text-foreground"><Zap className="h-4 w-4 text-primary" />{t('help.syntax.title', 'Scryfall syntax')}</h3>
                <p className="text-sm text-muted-foreground">{t('help.syntax.intro', 'These operators help you narrow searches quickly.')}</p>
                <div className="space-y-2">
                  {SCRYFALL_SYNTAX_TIPS.map((tip) => (
                    <div key={tip.syntax} className="space-y-1 rounded-lg border border-border/70 bg-card/85 p-3">
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">{tip.syntax}</code>
                        <span className="text-sm font-medium text-foreground">{t(tip.meaningKey)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{t(tip.descriptionKey)}</p>
                      <p className="text-xs italic text-muted-foreground">{t(tip.example)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-medium text-foreground">{t('help.docs.title', 'Documentation')}</h3>
                <p className="text-sm text-muted-foreground">{t('help.docs.body', 'Read the full syntax guide for deeper examples and edge cases.')}</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('https://scryfall.com/docs/syntax', '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="h-4 w-4" />
                  {t('help.docs.button', 'Open syntax docs')}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="confidence" className="mt-0 space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{t('help.confidence.intro', 'Confidence tells you how sure OffMeta is about the translation.')}</p>
                <div className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t('help.confidence.note', 'Low confidence usually means the query is ambiguous or very broad.')}</p>
                </div>
              </div>
              <div className="space-y-4">
                {CONFIDENCE_LEVELS.map((level) => (
                  <div key={level.levelKey} className="space-y-2">
                    <Badge variant="outline" className={cn('font-medium', level.color)}>{t(level.levelKey)}</Badge>
                    <p className="pl-1 text-sm text-muted-foreground">{t(level.descriptionKey)}</p>
                    <div className="flex flex-wrap gap-2 pl-1">{level.examples.map((ex) => <span key={ex} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{ex}</span>)}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="mb-3 text-sm font-medium text-foreground">{t('help.confidence.factors')}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-primary">•</span><span><strong>{t('help.confidence.clarityLabel')}</strong> {t('help.confidence.clarityBody')}</span></li>
                  <li className="flex items-start gap-2"><span className="text-primary">•</span><span><strong>{t('help.confidence.termsLabel')}</strong> {t('help.confidence.termsBody')}</span></li>
                  <li className="flex items-start gap-2"><span className="text-primary">•</span><span><strong>{t('help.confidence.ambiguityLabel')}</strong> {t('help.confidence.ambiguityBody')}</span></li>
                  <li className="flex items-start gap-2"><span className="text-primary">•</span><span><strong>{t('help.confidence.complexityLabel')}</strong> {t('help.confidence.complexityBody')}</span></li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="tips" className="mt-0 space-y-6">
              <p className="text-sm text-muted-foreground">{t('help.tips.intro')}</p>
              <div className="space-y-3">
                {TIPS.map((tip, index) => (
                  <div key={tip} className="flex items-start gap-3 rounded-lg border border-border/70 bg-card/85 p-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{index + 1}</div>
                    <p className="text-sm text-foreground">{t(tip)}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-medium text-foreground">{t('help.syntax.advancedTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('help.syntax.advancedBody')}</p>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.open('https://scryfall.com/docs/syntax', '_blank', 'noopener,noreferrer')}>
                  <ExternalLink className="h-4 w-4" />
                  {t('help.docs.button')}
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        <div className="border-t border-border bg-muted/30 p-4">
          <p className="text-center text-xs text-muted-foreground">{t('help.footer')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
