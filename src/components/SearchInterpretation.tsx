/**
 * Component to display how the AI interpreted a natural language search.
 * Shows the resulting Scryfall query, confidence level, assumptions made,
 * and alternative query suggestions when confidence is low.
 */

import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Info,
  Share2,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/core/utils';
import { toast } from 'sonner';

interface SearchInterpretationProps {
  scryfallQuery: string;
  originalQuery?: string;
  explanation?: {
    readable: string;
    assumptions: string[];
    confidence: number;
  };
  onTryAlternative?: (query: string) => void;
}

/**
 * Generate intelligent alternative query suggestions based on the original query.
 * Helps users refine their search when confidence is low.
 */
function generateAlternativeSuggestions(
  originalQuery: string,
  scryfallQuery: string,
): string[] {
  const suggestions: string[] = [];
  const lowerQuery = originalQuery.toLowerCase();

  // Check for common issues and suggest fixes

  // 1. If query mentions year/date, suggest proper syntax
  if (/\b(20\d{2}|after|before|since|released|new|recent)\b/.test(lowerQuery)) {
    if (!lowerQuery.includes('year')) {
      suggestions.push(
        originalQuery
          .replace(/\bafter (\d{4})\b/gi, 'released after $1')
          .replace(/\bsince (\d{4})\b/gi, 'released after $1'),
      );
    }
  }

  // 2. If query is about effects, suggest using otag keywords
  const effectMappings: Record<string, string> = {
    draw: 'card draw effects',
    ramp: 'ramp cards',
    removal: 'removal spells',
    counter: 'counterspells',
    mill: 'self-mill cards',
    sacrifice: 'sacrifice outlets',
    lifegain: 'lifegain cards',
    token: 'token generators',
    tutor: 'tutor effects',
  };

  for (const [keyword, suggestion] of Object.entries(effectMappings)) {
    if (lowerQuery.includes(keyword) && !lowerQuery.includes(suggestion)) {
      const colors = extractColors(lowerQuery);
      suggestions.push(colors ? `${colors} ${suggestion}` : suggestion);
      break;
    }
  }

  // 3. If query is complex, suggest simpler version
  const wordCount = originalQuery.split(/\s+/).length;
  if (wordCount > 6) {
    // Extract the core concept
    const coreTerms = originalQuery
      .replace(/\b(that|which|with|and|or|the|a|an|in|for|my|deck)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (coreTerms !== originalQuery && coreTerms.length > 5) {
      suggestions.push(coreTerms);
    }
  }

  // 4. Suggest adding format if not present
  if (
    !/(commander|edh|modern|standard|pioneer|legacy|vintage|pauper)/i.test(
      lowerQuery,
    ) &&
    !/(commander|edh|modern|standard|pioneer|legacy|vintage|pauper)/i.test(
      scryfallQuery,
    )
  ) {
    suggestions.push(`${originalQuery} in commander`);
  }

  // 5. If looking for creatures/cards that "do X", suggest alternative phrasing
  if (/\b(creatures?|cards?|spells?)\s+(that|which)\s+/i.test(lowerQuery)) {
    const simplified = originalQuery
      .replace(/\b(creatures?|cards?|spells?)\s+(that|which)\s+/gi, '')
      .trim();
    if (simplified.length > 3) {
      suggestions.push(simplified);
    }
  }

  // 6. For tribal queries, suggest the type directly
  const tribes = [
    'elf',
    'goblin',
    'zombie',
    'vampire',
    'dragon',
    'angel',
    'demon',
    'merfolk',
    'wizard',
    'warrior',
    'knight',
    'soldier',
    'cleric',
    'shaman',
    'beast',
    'elemental',
    'spirit',
    'horror',
    'giant',
  ];
  for (const tribe of tribes) {
    if (
      lowerQuery.includes(tribe) &&
      !lowerQuery.includes(`${tribe}s`) &&
      !lowerQuery.includes(`${tribe} tribal`)
    ) {
      suggestions.push(`${tribe} tribal support`);
      break;
    }
  }

  // Return unique suggestions, max 3
  return [...new Set(suggestions)]
    .filter((s) => s.toLowerCase() !== originalQuery.toLowerCase())
    .slice(0, 3);
}

function extractColors(query: string): string | null {
  const colorMap: Record<string, string> = {
    white: 'white',
    blue: 'blue',
    black: 'black',
    red: 'red',
    green: 'green',
    azorius: 'azorius',
    dimir: 'dimir',
    rakdos: 'rakdos',
    gruul: 'gruul',
    selesnya: 'selesnya',
    orzhov: 'orzhov',
    izzet: 'izzet',
    golgari: 'golgari',
    boros: 'boros',
    simic: 'simic',
  };

  const lower = query.toLowerCase();
  for (const [key, value] of Object.entries(colorMap)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

export function SearchInterpretation({
  scryfallQuery,
  originalQuery,
  explanation,
  onTryAlternative,
}: SearchInterpretationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(scryfallQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const confidenceLabel = explanation?.confidence
    ? explanation.confidence >= 0.9
      ? 'High'
      : explanation.confidence >= 0.75
        ? 'Good'
        : explanation.confidence >= 0.6
          ? 'Moderate'
          : 'Low'
    : null;

  const confidenceColor = explanation?.confidence
    ? explanation.confidence >= 0.9
      ? 'text-emerald-600 dark:text-emerald-400'
      : explanation.confidence >= 0.75
        ? 'text-amber-600 dark:text-amber-400'
        : explanation.confidence >= 0.6
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-red-500 dark:text-red-400'
    : '';

  // Show suggestions when confidence is below threshold
  const showSuggestions =
    explanation?.confidence && explanation.confidence < 0.75;

  const alternativeSuggestions = useMemo(() => {
    if (!showSuggestions || !originalQuery) return [];
    return generateAlternativeSuggestions(originalQuery, scryfallQuery);
  }, [showSuggestions, originalQuery, scryfallQuery]);

  // Detect if otag: was used
  const usesOracleTag = scryfallQuery.includes('otag:');

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Did you mean section - shows above toggle when confidence is low */}
      {showSuggestions && alternativeSuggestions.length > 0 && (
        <div className="mb-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 animate-fade-in">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Results might not match exactly. Try:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {alternativeSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => onTryAlternative?.(suggestion)}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-200"
                  >
                    <span className="truncate max-w-[200px]">
                      "{suggestion}"
                    </span>
                    <ArrowRight className="h-3 w-3 opacity-0 -translate-x-0.5 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
        aria-expanded={isExpanded}
        aria-controls="search-interpretation-panel"
      >
        <Info className="h-3 w-3" aria-hidden="true" />
        <span>How this was interpreted</span>
        {usesOracleTag && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            otag
          </span>
        )}
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        )}
      </button>

      {/* Screen reader announcement for new results */}
      <div className="sr-only" aria-live="polite">
        {scryfallQuery ? `Search interpreted as: ${scryfallQuery}` : ''}
      </div>

      {/* Expanded panel */}
      {isExpanded && (
        <div
          id="search-interpretation-panel"
          className="mt-2 p-4 surface-elevated space-y-4 animate-reveal"
          role="region"
          aria-label="Search interpretation details"
        >
          {/* Scryfall Query */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Scryfall Query
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="h-7 px-2 text-xs gap-1.5"
                >
                  <Share2 className="h-3 w-3" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 px-2 text-xs gap-1.5"
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
            </div>
            <code className="block w-full p-3 bg-secondary rounded-lg text-xs text-foreground font-mono break-all border border-border">
              {scryfallQuery}
            </code>
          </div>

          {/* Confidence */}
          {explanation?.confidence && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Confidence:</span>
              <span className={cn('font-medium', confidenceColor)}>
                {confidenceLabel} ({Math.round(explanation.confidence * 100)}%)
              </span>
              {usesOracleTag && (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Using Oracle Tags
                </span>
              )}
            </div>
          )}

          {/* Assumptions */}
          {explanation?.assumptions && explanation.assumptions.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Assumptions Made
              </span>
              <ul className="space-y-1.5">
                {explanation.assumptions.map((assumption, index) => (
                  <li
                    key={index}
                    className="text-xs text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-accent mt-0.5">•</span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground pt-3 border-t border-border">
            Powered by Scryfall. Results are not generated—they're real cards.
          </p>
        </div>
      )}
    </div>
  );
}
