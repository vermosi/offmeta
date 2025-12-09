import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, FileUp, Loader2, CheckCircle2, XCircle, Package } from 'lucide-react';

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

    // Try to detect header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name') || firstLine.includes('quantity') || firstLine.includes('card');
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Try different formats
      // Format 1: CSV with columns (Name, Set, Quantity, Foil)
      // Format 2: Simple "Quantity Name"
      // Format 3: "Name,Set,Quantity"

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
        // Just a card name
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
        // Upsert into collection
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

      // Rate limiting
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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Import Collection
        </CardTitle>
        <CardDescription>
          Upload a CSV or paste your card list to track your collection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!user && (
          <div className="p-4 rounded-lg bg-muted text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Sign in to save your collection
            </p>
          </div>
        )}

        {/* File upload */}
        <div className="space-y-2">
          <Label>Upload CSV File</Label>
          <div className="flex gap-2">
            <Input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="flex-1"
            />
          </div>
        </div>

        {/* Or paste text */}
        <div className="space-y-2">
          <Label>Or Paste Card List</Label>
          <Textarea
            placeholder={`Supported formats:
4 Birds of Paradise
Lightning Bolt, M21, 2
"Llanowar Elves", "M19", 4, 2

Name, Set (optional), Quantity, Foil Quantity`}
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
        </div>

        {/* Progress */}
        {isImporting && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Importing... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="p-4 rounded-lg bg-muted space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                <span>{result.success} imported</span>
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-4 w-4" />
                  <span>{result.failed} failed</span>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Failed: {result.errors.slice(0, 5).join(', ')}
                {result.errors.length > 5 && ` and ${result.errors.length - 5} more`}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={isImporting || !csvContent.trim() || !user}
          className="w-full gap-2"
        >
          {isImporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Import Collection
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Your collection is always private. Only you can see it.
        </p>
      </CardContent>
    </Card>
  );
}
