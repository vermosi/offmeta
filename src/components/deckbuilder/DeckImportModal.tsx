/**
 * Deck Import Modal — import from Moxfield URL, paste, or upload a file.
 * @module components/deckbuilder/DeckImportModal
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Link as LinkIcon, FileText, Loader2, File } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { parseDecklist } from '@/lib/decklist-parser';
import Uppy from '@uppy/core';
// @ts-expect-error - sortablejs has no bundled types
import Sortable from 'sortablejs';
import { toast } from '@/hooks';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';
import { ImportedDeckStruct } from '@/lib/validation/deckImport';

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

type Tab = 'moxfield' | 'paste' | 'upload';

export function DeckImportModal({ open, onOpenChange, onImport }: DeckImportModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('moxfield');
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedText, setUploadedText] = useState('');
  const [uploadedCards, setUploadedCards] = useState<{ name: string; quantity: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadedListRef = useRef<HTMLUListElement>(null);
  const uppyRef = useRef<Uppy | null>(null);

  useEffect(() => {
    const uppy = new Uppy({
      autoProceed: false,
      restrictions: {
        allowedFileTypes: ['.txt', '.dec', '.cod'],
        maxNumberOfFiles: 1,
      },
    });

    uppy.on('file-added', async (file) => {
      const data = file.data;
      if (!(data instanceof File)) return;
      const text = await data.text();
      setUploadedFileName(file.name);
      setUploadedText(text);
      setUploadedCards(parseDecklist(text).cards);
    });

    uppy.on('restriction-failed', (file, error) => {
      toast({
        title: t('deckImport.invalidFile'),
        description: error?.message ?? t('deckImport.invalidFileDesc'),
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    });

    uppyRef.current = uppy;
    return () => {
      uppy.destroy();
      uppyRef.current = null;
    };
  }, [t]);

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
    onImport({ commander: parsed.commander, cards: parsed.cards });
    setPasteText('');
    onOpenChange(false);
    toast({ title: t('deckImport.success'), description: t('deckImport.successParsed').replace('{count}', String(parsed.totalCards)) });
  };

  const processFile = (file: File) => {
    if (!file) return;
    uppyRef.current?.cancelAll();
    void uppyRef.current?.addFile({
      name: file.name,
      type: file.type,
      data: file,
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleUploadImport = () => {
    if (uploadedCards.length === 0) return;
    const parsed = parseDecklist(uploadedText);
    if (parsed.cards.length === 0) {
      toast({ title: t('deckImport.noCards'), description: t('deckImport.noCardsDesc'), variant: 'destructive' });
      return;
    }
    const importedDeck = {
      commander: parsed.commander,
      cards: uploadedCards,
    };
    const validation = ImportedDeckStruct.create(importedDeck);
    onImport(validation);
    setUploadedText('');
    setUploadedFileName(null);
    setUploadedCards([]);
    onOpenChange(false);
    toast({ title: t('deckImport.success'), description: t('deckImport.successParsed').replace('{count}', String(parsed.totalCards)) });
  };

  useEffect(() => {
    if (!uploadedListRef.current || uploadedCards.length === 0) return undefined;

    const sortable = Sortable.create(uploadedListRef.current, {
      animation: 150,
      handle: '[data-drag-handle="true"]',
      ghostClass: 'opacity-60',
      onEnd: ({ oldIndex, newIndex }) => {
        if (oldIndex == null || newIndex == null || oldIndex === newIndex) return;
        setUploadedCards((current) => {
          const next = [...current];
          const [moved] = next.splice(oldIndex, 1);
          if (moved) next.splice(newIndex, 0, moved);
          return next;
        });
      },
    });

    return () => sortable.destroy();
  }, [uploadedCards.length]);

  const uploadedCardTotal = useMemo(
    () => uploadedCards.reduce((sum, card) => sum + card.quantity, 0),
    [uploadedCards],
  );

  const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'moxfield', icon: <LinkIcon className="h-3 w-3" />, label: t('deckImport.moxfieldUrl') },
    { key: 'paste', icon: <FileText className="h-3 w-3" />, label: t('deckImport.pasteList') },
    { key: 'upload', icon: <Upload className="h-3 w-3" />, label: t('deckImport.uploadFile') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t('deckImport.title')}
          </DialogTitle>
        </DialogHeader>

        {/* Tab toggle */}
        <div className="flex gap-1 p-0.5 bg-secondary/50 rounded-lg" role="tablist" aria-label={t('deckImport.title')}>
          {TABS.map(({ key, icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              role="tab"
              aria-selected={tab === key}
              aria-controls={`deck-import-panel-${key}`}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors',
                tab === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {tab === 'moxfield' && (
          <div id="deck-import-panel-moxfield" role="tabpanel" aria-label={t('deckImport.moxfieldUrl')} className="space-y-3">
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
        )}

        {tab === 'paste' && (
          <div id="deck-import-panel-paste" role="tabpanel" aria-label={t('deckImport.pasteList')} className="space-y-3">
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

        {tab === 'upload' && (
          <div id="deck-import-panel-upload" role="tabpanel" aria-label={t('deckImport.uploadFile')} className="space-y-3">
            <input ref={fileInputRef} type="file" accept=".txt,.dec,.cod" className="hidden" onChange={handleFileInputChange} />
            {!uploadedFileName ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label={t('deckImport.uploadDrop')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  dragging ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50 hover:bg-secondary/30',
                )}
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">{t('deckImport.uploadDrop')}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{t('deckImport.uploadHint')}</p>
              </div>
            ) : (
              <div className="space-y-3 border border-border rounded-lg p-4 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadedFileName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {uploadedCardTotal} {t('deckImport.cardsFound')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName(null);
                      setUploadedText('');
                      setUploadedCards([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      uppyRef.current?.cancelAll();
                    }}
                    aria-label={t('deckImport.change')}
                    title={t('deckImport.change')}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t('deckImport.change')}
                  </button>
                </div>
                <ul ref={uploadedListRef} className="max-h-48 overflow-y-auto space-y-1">
                  {uploadedCards.map((card) => (
                    <li
                      key={`${card.name}-${card.quantity}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 py-2 text-xs"
                    >
                      <span data-drag-handle="true" className="cursor-grab select-none text-muted-foreground">
                        ::
                      </span>
                      <span className="flex-1 truncate">{card.name}</span>
                      <span className="font-medium tabular-nums text-muted-foreground">{card.quantity}x</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button onClick={handleUploadImport} disabled={uploadedCards.length === 0} className="w-full gap-2">
              <Upload className="h-4 w-4" />
              {t('deckImport.importFile')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
