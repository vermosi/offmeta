import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, Loader2, CheckCircle2, XCircle, Package, FileUp } from 'lucide-react';

interface CollectionCard {
  name: string;
  setCode?: string;
  quantity: number;
  foilQuantity?: number;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function CollectionImport() {
  const { user } = useAuth();
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const parseCSV = useCallback((content: string): CollectionCard[] => {
    const lines = content.trim().split('\n');
    const cards: CollectionCard[] = [];

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name') || firstLine.includes('quantity') || firstLine.includes('card');
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const csvMatch = line.match(/^"?([^",]+)"?,?\s*"?([^",]*)"?,?\s*(\d+)?,?\s*(\d+)?/);
      const simpleMatch = line.match(/^(\d+)x?\s+(.+)$/);
      const reverseMatch = line.match(/^(.+?)\s+x?(\d+)$/);

      if (csvMatch && csvMatch[1]) {
        cards.push({
          name: csvMatch[1].trim(),
          setCode: csvMatch[2]?.trim() || undefined,
          quantity: parseInt(csvMatch[3]) || 1,
          foilQuantity: parseInt(csvMatch[4]) || 0,
        });
      } else if (simpleMatch) {
        cards.push({
          name: simpleMatch[2].trim(),
          quantity: parseInt(simpleMatch[1]),
        });
      } else if (reverseMatch) {
        cards.push({
          name: reverseMatch[1].trim(),
          quantity: parseInt(reverseMatch[2]),
        });
      } else if (line.length > 2) {
        cards.push({
          name: line,
          quantity: 1,
        });
      }
    }

    return cards;
  }, []);

  const handleImport = async () => {
    if (!user) {
      toast.error('Please sign in to import your collection');
      return;
    }

    if (!csvContent.trim()) {
      toast.error('Please paste your collection data');
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setResult(null);

    const cards = parseCSV(csvContent);
    const total = cards.length;
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      
      try {
        const { error } = await supabase
          .from('collection_cards')
          .upsert({
            user_id: user.id,
            card_id: card.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            card_name: card.name,
            set_code: card.setCode || null,
            quantity: card.quantity,
            foil_quantity: card.foilQuantity || 0,
          }, {
            onConflict: 'user_id,card_id,set_code'
          });

        if (error) throw error;
        success++;
      } catch (error) {
        failed++;
        errors.push(card.name);
        console.error(`Failed to import ${card.name}:`, error);
      }

      setProgress(((i + 1) / total) * 100);

      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    setIsImporting(false);
    setResult({ success, failed, errors });

    if (failed === 0) {
      toast.success(`Imported ${success} cards to your collection!`);
    } else {
      toast.warning(`Imported ${success} cards, ${failed} failed`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      toast.success(`Loaded ${file.name}`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50">
      <div className="flex items-center gap-2 p-4 border-b border-border/50">
        <Package className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Import Collection</span>
      </div>

      <div className="p-4 space-y-4">
        {!user && (
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in to save your collection
            </p>
          </div>
        )}

        {/* File upload */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Upload CSV File</Label>
          <div className="relative">
            <Input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="h-9 file:mr-3 file:h-7 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted file:text-muted-foreground hover:file:bg-muted/80"
            />
          </div>
        </div>

        {/* Or paste text */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Or Paste Card List</Label>
          <Textarea
            placeholder={`Supported formats:
4 Birds of Paradise
Lightning Bolt, M21, 2
"Llanowar Elves", "M19", 4, 2`}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={6}
            className="font-mono text-xs resize-none"
          />
        </div>

        {/* Progress */}
        {isImporting && (
          <div className="space-y-2">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground text-center">
              Importing... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>{result.success} imported</span>
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-1.5 text-red-500">
                  <XCircle className="h-4 w-4" />
                  <span>{result.failed} failed</span>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Failed: {result.errors.slice(0, 5).join(', ')}
                {result.errors.length > 5 && ` and ${result.errors.length - 5} more`}
              </p>
            )}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={isImporting || !csvContent.trim() || !user}
          className="w-full h-9 gap-2"
        >
          {isImporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Import Collection
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          Your collection is always private. Only you can see it.
        </p>
      </div>
    </div>
  );
}
