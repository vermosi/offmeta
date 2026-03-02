/**
 * Deck Import Modal — import from Moxfield URL, paste, or upload a file.
 * @module components/deckbuilder/DeckImportModal
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, Link as LinkIcon, FileText, Loader2, File } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileContent = useCallback((text: string, fileName: string) => {
    setUploadedFileName(fileName);
    setUploadedText(text);
  }, []);

  const processFile = (file: File) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['txt', 'dec', 'cod'].includes(ext || '')) {
      toast({ title: t('deckImport.invalidFile'), description: t('deckImport.invalidFileDesc'), variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      handleFileContent(text, file.name);
    };
    reader.readAsText(file);
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
    if (!uploadedText.trim()) return;
    const parsed = parseDecklist(uploadedText);
    if (parsed.cards.length === 0) {
      toast({ title: t('deckImport.noCards'), description: t('deckImport.noCardsDesc'), variant: 'destructive' });
      return;
    }
    onImport({ commander: parsed.commander, cards: parsed.cards });
    setUploadedText('');
    setUploadedFileName(null);
    onOpenChange(false);
    toast({ title: t('deckImport.success'), description: t('deckImport.successParsed').replace('{count}', String(parsed.totalCards)) });
  };

  const TABS: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: 'moxfield', icon: <LinkIcon className="h-3 w-3" />, label: t('deckImport.moxfieldUrl') },
    { key: 'paste', icon: <FileText className="h-3 w-3" />, label: t('deckImport.pasteList') },
    { key: 'upload', icon: <Upload className="h-3 w-3" />, label: t('deckImport.uploadFile') },
  ];

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
          {TABS.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
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
        )}

        {tab === 'paste' && (
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

        {tab === 'upload' && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.dec,.cod"
              className="hidden"
              onChange={handleFileInputChange}
            />
            {!uploadedFileName ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
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
              <div className="border border-border rounded-lg p-4 flex items-center gap-3 bg-secondary/20">
                <File className="h-8 w-8 text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadedFileName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {parseDecklist(uploadedText).totalCards} {t('deckImport.cardsFound')}
                  </p>
                </div>
                <button
                  onClick={() => { setUploadedFileName(null); setUploadedText(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('deckImport.change')}
                </button>
              </div>
            )}
            <Button onClick={handleUploadImport} disabled={!uploadedText.trim()} className="w-full gap-2">
              <Upload className="h-4 w-4" />
              {t('deckImport.importFile')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
