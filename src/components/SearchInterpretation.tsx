/**
 * Component to display how the AI interpreted a natural language search.
 * Shows the resulting Scryfall query, confidence level, and assumptions made.
 * @module components/SearchInterpretation
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchInterpretationProps {
  /** The translated Scryfall query string */
  scryfallQuery: string;
  /** Optional explanation from the AI including confidence and assumptions */
  explanation?: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
}

/**
 * Expandable panel showing search interpretation details.
 * Users can copy the Scryfall query and see what assumptions were made.
 */
export function SearchInterpretation({ scryfallQuery, explanation }: SearchInterpretationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(scryfallQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confidenceLabel = explanation?.confidence 
    ? explanation.confidence >= 0.9 ? 'High' 
    : explanation.confidence >= 0.7 ? 'Good' 
    : 'Moderate'
    : null;

  const confidenceColor = explanation?.confidence
    ? explanation.confidence >= 0.9 ? 'text-emerald-500'
    : explanation.confidence >= 0.7 ? 'text-amber-500'
    : 'text-orange-500'
    : '';

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Collapsed view - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <Info className="h-3 w-3" />
        <span>How this was interpreted</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="mt-2 p-4 bg-muted/30 border border-border/50 rounded-xl space-y-3 animate-fade-in">
          {/* Scryfall Query */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Scryfall Query
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 px-2 text-xs gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <code className="block w-full p-2.5 bg-background/80 border border-border/50 rounded-lg text-xs text-foreground font-mono break-all">
              {scryfallQuery}
            </code>
          </div>

          {/* Confidence */}
          {explanation?.confidence && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Confidence:</span>
              <span className={cn("font-medium", confidenceColor)}>
                {confidenceLabel} ({Math.round(explanation.confidence * 100)}%)
              </span>
            </div>
          )}

          {/* Assumptions */}
          {explanation?.assumptions && explanation.assumptions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Assumptions Made
              </span>
              <ul className="space-y-1">
                {explanation.assumptions.map((assumption, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/30">
            Powered by Scryfall. Results are not generated—they're real cards.
          </p>
        </div>
      )}
    </div>
  );
}
