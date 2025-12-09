import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { getCardByName } from "@/lib/scryfall";
import { ScryfallCard } from "@/types/card";
import { Deck, addCardToDeck } from "@/lib/deck";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DeckImportProps {
  deck: Deck;
  onDeckChange: (deck: Deck) => void;
}

interface ParsedLine {
  quantity: number;
  cardName: string;
  line: string;
}

interface ImportResult {
  cardName: string;
  quantity: number;
  status: "success" | "error" | "pending";
  card?: ScryfallCard;
  error?: string;
}

function parseDeckList(text: string): ParsedLine[] {
  const lines = text.split("\n");
  const parsed: ParsedLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) {
      continue;
    }

    // Skip section headers like "Mainboard", "Sideboard", "Commander", etc.
    if (/^(mainboard|sideboard|commander|companion|deck|maybeboard):?$/i.test(trimmed)) {
      continue;
    }

    // Try to match patterns like:
    // "4 Birds of Paradise"
    // "4x Birds of Paradise"
    // "Birds of Paradise x4"
    // "Birds of Paradise"
    let match = trimmed.match(/^(\d+)x?\s+(.+)$/i);
    if (match) {
      parsed.push({
        quantity: parseInt(match[1], 10),
        cardName: match[2].trim(),
        line: trimmed,
      });
      continue;
    }

    // Try "Card Name x4" pattern
    match = trimmed.match(/^(.+?)\s+x(\d+)$/i);
    if (match) {
      parsed.push({
        quantity: parseInt(match[2], 10),
        cardName: match[1].trim(),
        line: trimmed,
      });
      continue;
    }

    // Assume single copy if no quantity
    if (trimmed.length > 0) {
      parsed.push({
        quantity: 1,
        cardName: trimmed,
        line: trimmed,
      });
    }
  }

  return parsed;
}

export function DeckImport({ deck, onDeckChange }: DeckImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deckText, setDeckText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [importPhase, setImportPhase] = useState<"input" | "importing" | "results">("input");

  const handleImport = async () => {
    const parsed = parseDeckList(deckText);
    
    if (parsed.length === 0) {
      toast.error("No valid card entries found");
      return;
    }

    setIsImporting(true);
    setImportPhase("importing");
    
    const importResults: ImportResult[] = parsed.map((p) => ({
      cardName: p.cardName,
      quantity: p.quantity,
      status: "pending" as const,
    }));
    setResults(importResults);

    let newDeck = { ...deck };
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < parsed.length; i++) {
      const { quantity, cardName } = parsed[i];
      
      try {
        // Add delay to respect rate limits
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const card = await getCardByName(cardName);
        
        // Add card to deck
        for (let j = 0; j < quantity; j++) {
          newDeck = addCardToDeck(newDeck, card, "mainboard");
        }

        importResults[i] = {
          ...importResults[i],
          status: "success",
          card,
        };
        successCount++;
      } catch (error) {
        importResults[i] = {
          ...importResults[i],
          status: "error",
          error: `Card not found: ${cardName}`,
        };
        errorCount++;
      }

      setResults([...importResults]);
    }

    setIsImporting(false);
    setImportPhase("results");
    onDeckChange(newDeck);

    if (successCount > 0) {
      toast.success(`Imported ${successCount} card${successCount !== 1 ? "s" : ""}${errorCount > 0 ? ` (${errorCount} failed)` : ""}`);
    } else {
      toast.error("Failed to import any cards");
    }
  };

  const handleReset = () => {
    setDeckText("");
    setResults([]);
    setImportPhase("input");
  };

  const handleClose = () => {
    setIsOpen(false);
    // Reset after animation
    setTimeout(handleReset, 300);
  };

  const successResults = results.filter((r) => r.status === "success");
  const errorResults = results.filter((r) => r.status === "error");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Import Deck List
          </DialogTitle>
        </DialogHeader>

        {importPhase === "input" && (
          <>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Paste your deck list below. Supports formats like:
              </p>
              <div className="text-xs bg-muted p-3 rounded-lg font-mono space-y-1">
                <p>4 Birds of Paradise</p>
                <p>4x Lightning Bolt</p>
                <p>2 Counterspell</p>
                <p>1 Black Lotus</p>
              </div>
              <Textarea
                value={deckText}
                onChange={(e) => setDeckText(e.target.value)}
                placeholder="Paste your deck list here..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                variant="gold"
                onClick={handleImport}
                disabled={!deckText.trim()}
              >
                Import Cards
              </Button>
            </DialogFooter>
          </>
        )}

        {importPhase === "importing" && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-semibold">Importing cards...</p>
                <p className="text-sm text-muted-foreground">
                  {results.filter((r) => r.status !== "pending").length} / {results.length} processed
                </p>
              </div>
            </div>
            
            <ScrollArea className="h-40 mt-4">
              <div className="space-y-1">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 text-sm px-2 py-1"
                  >
                    {result.status === "pending" && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {result.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {result.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className={result.status === "error" ? "text-destructive" : ""}>
                      {result.quantity}x {result.cardName}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {importPhase === "results" && (
          <>
            <div className="space-y-4">
              {successResults.length > 0 && (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-400">
                    Successfully imported {successResults.length} card{successResults.length !== 1 ? "s" : ""}
                  </AlertDescription>
                </Alert>
              )}

              {errorResults.length > 0 && (
                <div className="space-y-2">
                  <Alert className="bg-destructive/10 border-destructive/30">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      Failed to import {errorResults.length} card{errorResults.length !== 1 ? "s" : ""}
                    </AlertDescription>
                  </Alert>
                  
                  <ScrollArea className="h-32">
                    <div className="space-y-1 text-sm">
                      {errorResults.map((result, index) => (
                        <div key={index} className="text-destructive px-2">
                          • {result.quantity}x {result.cardName}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>
                Import More
              </Button>
              <Button variant="gold" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
