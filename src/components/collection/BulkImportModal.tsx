/**
 * Bulk import modal for collection management.
 * Supports pasted text lists and CSV file uploads.
 * @module components/collection/BulkImportModal
 */

import { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAddToCollection } from '@/hooks/useCollection';
import { toast } from 'sonner';

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedEntry {
  name: string;
  quantity: number;
  foil: boolean;
}

const MAX_IMPORT_LINES = 5000;
const MAX_TEXT_LENGTH = 100_000;

/** Parse a text list like "4 Lightning Bolt" or "1x Sol Ring (CMR) 350 *F*" */
function parseTextList(raw: string): ParsedEntry[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const entries: ParsedEntry[] = [];

  for (const line of lines.slice(0, MAX_IMPORT_LINES)) {
    // Skip section headers
    if (/^(\/\/|#|Sideboard|Maybeboard|COMMANDER)/i.test(line)) continue;

    const foil = /\*F\*/i.test(line) || /\bfoil\b/i.test(line);
    const cleaned = line.replace(/\*[A-Z]+\*/gi, '').trim();

    const m = cleaned.match(/^(?:(\d+)x?\s+)?(.+?)(?:\s+\([\w]+\)\s+\d+.*)?$/i);
    if (!m) continue;

    const qty = m[1] ? parseInt(m[1], 10) : 1;
    const name = m[2].trim();
    if (!name || name.length > 200) continue;

    entries.push({ name, quantity: Math.min(qty, 999), foil });
  }

  return entries;
}

/** Parse CSV with headers: name/card_name, quantity/qty, foil */
function parseCsv(raw: string): ParsedEntry[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(',').map((c) => c.replace(/"/g, '').trim());

  const nameIdx = cols.findIndex((c) => ['name', 'card_name', 'card name', 'card'].includes(c));
  const qtyIdx = cols.findIndex((c) => ['quantity', 'qty', 'count'].includes(c));
  const foilIdx = cols.findIndex((c) => ['foil', 'is_foil'].includes(c));

  if (nameIdx < 0) return [];

  const entries: ParsedEntry[] = [];
  for (const line of lines.slice(1, MAX_IMPORT_LINES + 1)) {
    // Simple CSV parse (handles quoted fields)
    const fields = parseCsvLine(line);
    const name = fields[nameIdx]?.trim();
    if (!name || name.length > 200) continue;

    const qty = qtyIdx >= 0 ? parseInt(fields[qtyIdx], 10) || 1 : 1;
    const foil = foilIdx >= 0 ? ['true', 'yes', '1'].includes(fields[foilIdx]?.toLowerCase()) : false;

    entries.push({ name, quantity: Math.min(qty, 999), foil });
  }

  return entries;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Parse Moxfield export CSV format (has Count, Name, Edition, Collector Number, etc.) */
function parseMoxfieldCsv(raw: string): ParsedEntry[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const cols = header.split(',').map((c) => c.replace(/"/g, '').trim());

  const nameIdx = cols.findIndex((c) => c === 'name');
  const countIdx = cols.findIndex((c) => c === 'count');
  const foilIdx = cols.findIndex((c) => c === 'foil' || c === 'is foil');

  if (nameIdx < 0) return [];

  const entries: ParsedEntry[] = [];
  for (const line of lines.slice(1, MAX_IMPORT_LINES + 1)) {
    const fields = parseCsvLine(line);
    const name = fields[nameIdx]?.trim();
    if (!name || name.length > 200) continue;

    const qty = countIdx >= 0 ? parseInt(fields[countIdx], 10) || 1 : 1;
    const foil = foilIdx >= 0 ? ['true', 'yes', '1'].includes(fields[foilIdx]?.toLowerCase()) : false;

    entries.push({ name, quantity: Math.min(qty, 999), foil });
  }

  return entries;
}

type ImportTab = 'text' | 'csv' | 'moxfield';

export function BulkImportModal({ open, onOpenChange }: BulkImportModalProps) {
  const [tab, setTab] = useState<ImportTab>('text');
  const [textInput, setTextInput] = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedEntry[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const addToCollection = useAddToCollection();

  const handleParseText = useCallback(() => {
    if (!textInput.trim()) return;
    const entries = parseTextList(textInput.slice(0, MAX_TEXT_LENGTH));
    setParsed(entries);
    if (entries.length === 0) {
      toast.error('No valid card entries found. Check the format.');
    }
  }, [textInput]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const entries = parseCsv(text.slice(0, MAX_TEXT_LENGTH));
      setParsed(entries);
      if (entries.length === 0) {
        toast.error('No valid entries found. Ensure CSV has a "name" or "card_name" column header.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(async () => {
    if (!parsed || parsed.length === 0) return;
    setImporting(true);
    setProgress({ done: 0, total: parsed.length });

    let success = 0;
    let failed = 0;

    // Process in sequential batches to avoid overwhelming the DB
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i];
      try {
        await addToCollection.mutateAsync({
          cardName: entry.name,
          quantity: entry.quantity,
          foil: entry.foil,
        });
        success++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: parsed.length });
    }

    setImporting(false);
    toast.success(`Imported ${success} cards${failed > 0 ? ` (${failed} failed)` : ''}`);
    setParsed(null);
    setTextInput('');
    setCsvFileName(null);
    onOpenChange(false);
  }, [parsed, addToCollection, onOpenChange]);

  const handleClose = useCallback((v: boolean) => {
    if (importing) return;
    onOpenChange(v);
    if (!v) {
      setParsed(null);
      setTextInput('');
      setCsvFileName(null);
    }
  }, [importing, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bulk Import
          </DialogTitle>
          <DialogDescription>
            Add multiple cards at once from a text list or CSV file.
          </DialogDescription>
        </DialogHeader>

        {/* Tab selector */}
        <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit flex-wrap">
          <button
            onClick={() => { setTab('text'); setParsed(null); }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
              tab === 'text' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Paste List
          </button>
          <button
            onClick={() => { setTab('csv'); setParsed(null); }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
              tab === 'csv' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            CSV File
          </button>
          <button
            onClick={() => { setTab('moxfield'); setParsed(null); }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
              tab === 'moxfield' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Moxfield
          </button>
        </div>

        {tab === 'text' ? (
          <div className="space-y-3">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={`4 Lightning Bolt\n2x Sol Ring\n1 Rhystic Study *F*\n3 Counterspell (MH2) 267`}
              className="min-h-[200px] font-mono text-xs"
              maxLength={MAX_TEXT_LENGTH}
            />
            <Button onClick={handleParseText} variant="secondary" className="w-full" disabled={!textInput.trim()}>
              Parse List
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                {csvFileName || 'Click to upload CSV'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Columns: name, quantity, foil (max 5MB)
              </p>
            </button>
          </div>
        )}

        {/* Preview */}
        {parsed && parsed.length > 0 && !importing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">
                {parsed.length} cards ready to import
              </p>
            </div>
            <div className="max-h-[150px] overflow-y-auto text-xs font-mono text-muted-foreground space-y-0.5 border border-border rounded-lg p-2">
              {parsed.slice(0, 50).map((e, i) => (
                <div key={i}>
                  {e.quantity}x {e.name}{e.foil ? ' ✨' : ''}
                </div>
              ))}
              {parsed.length > 50 && (
                <div className="text-primary">...and {parsed.length - 50} more</div>
              )}
            </div>
            <Button onClick={handleImport} className="w-full gap-2">
              <Upload className="h-4 w-4" />
              Import {parsed.length} Cards
            </Button>
          </div>
        )}

        {/* Progress */}
        {importing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <p className="text-sm">
                Importing... {progress.done}/{progress.total}
              </p>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-200"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {parsed?.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            No valid card entries found.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
