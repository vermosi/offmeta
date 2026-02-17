/**
 * Deck Import Modal — import from Moxfield URL or paste decklist.
 * @module components/deckbuilder/DeckImportModal
 */

import { useState } from 'react';
import { Upload, Link as LinkIcon, FileText, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { parseDecklist } from '@/lib/decklist-parser';
import { toast } from '@/hooks/useToast';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';

interface DeckImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (data: {
    name?: string;
    format?: string;
    commander?: string | null;
    colorIdentity?: string[];
    cards: { name: string; quantity: number }[];
  }) => void;
}

export function DeckImportModal({ open, onOpenChange, onImport }: DeckImportModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'moxfield' | 'paste'>('moxfield');
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMoxfieldImport = async () => {
    if (!moxfieldUrl.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-moxfield-deck', {
        body: { url: moxfieldUrl.trim() },
      });
      if (error || !data?.decklist) {
        toast({ title: t('deckImport.failed'), description: data?.error || t('deckImport.failedDesc'), variant: 'destructive' });
        return;
      }
      const parsed = parseDecklist(data.decklist);
      onImport({
        name: data.deckName,
        format: data.format,
        commander: data.commander || parsed.commander,
        colorIdentity: data.colorIdentity,
        cards: parsed.cards,
      });
      setMoxfieldUrl('');
      onOpenChange(false);
      toast({ title: t('deckImport.success'), description: t('deckImport.successCards').replace('{count}', String(parsed.totalCards)).replace('{name}', data.deckName) });
    } catch {
      toast({ title: 'Error', description: t('deckImport.failedDesc'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasteImport = () => {
    if (!pasteText.trim()) return;
    const parsed = parseDecklist(pasteText);
    if (parsed.cards.length === 0) {
      toast({ title: t('deckImport.noCards'), description: t('deckImport.noCardsDesc'), variant: 'destructive' });
      return;
    }
    onImport({
      commander: parsed.commander,
      cards: parsed.cards,
    });
    setPasteText('');
    onOpenChange(false);
    toast({ title: t('deckImport.success'), description: t('deckImport.successParsed').replace('{count}', String(parsed.totalCards)) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t('deckImport.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex gap-1 p-0.5 bg-secondary/50 rounded-lg">
          <button
            onClick={() => setTab('moxfield')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors',
              tab === 'moxfield' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LinkIcon className="h-3 w-3" />
            {t('deckImport.moxfieldUrl')}
          </button>
          <button
            onClick={() => setTab('paste')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors',
              tab === 'paste' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <FileText className="h-3 w-3" />
            {t('deckImport.pasteList')}
          </button>
        </div>

        {tab === 'moxfield' ? (
          <div className="space-y-3">
            <Input
              value={moxfieldUrl}
              onChange={(e) => setMoxfieldUrl(e.target.value)}
              placeholder={t('deckImport.urlPlaceholder')}
              onKeyDown={(e) => e.key === 'Enter' && handleMoxfieldImport()}
            />
            <p className="text-[10px] text-muted-foreground">{t('deckImport.urlHint')}</p>
            <Button onClick={handleMoxfieldImport} disabled={loading || !moxfieldUrl.trim()} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {loading ? t('deckImport.importing') : t('deckImport.importMoxfield')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={t('deckImport.pastePlaceholder')}
              rows={8}
              className="text-sm font-mono"
            />
            <p className="text-[10px] text-muted-foreground">{t('deckImport.pasteHint')}</p>
            <Button onClick={handlePasteImport} disabled={!pasteText.trim()} className="w-full gap-2">
              <FileText className="h-4 w-4" />
              {t('deckImport.importList')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
