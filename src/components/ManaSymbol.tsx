import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ManaSymbolProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

/**
 * English descriptions for common mana symbols.
 * Based on Scryfall's symbology API.
 */
const SYMBOL_DESCRIPTIONS: Record<string, string> = {
  // Basic mana
  W: 'one white mana',
  U: 'one blue mana',
  B: 'one black mana',
  R: 'one red mana',
  G: 'one green mana',
  C: 'one colorless mana',

  // Generic mana
  '0': 'zero mana',
  '1': 'one generic mana',
  '2': 'two generic mana',
  '3': 'three generic mana',
  '4': 'four generic mana',
  '5': 'five generic mana',
  '6': 'six generic mana',
  '7': 'seven generic mana',
  '8': 'eight generic mana',
  '9': 'nine generic mana',
  '10': 'ten generic mana',
  '11': 'eleven generic mana',
  '12': 'twelve generic mana',
  '13': 'thirteen generic mana',
  '14': 'fourteen generic mana',
  '15': 'fifteen generic mana',
  '16': 'sixteen generic mana',
  X: 'X generic mana',
  Y: 'Y generic mana',
  Z: 'Z generic mana',

  // Phyrexian mana
  'W/P': 'one white mana or two life',
  'U/P': 'one blue mana or two life',
  'B/P': 'one black mana or two life',
  'R/P': 'one red mana or two life',
  'G/P': 'one green mana or two life',
  'C/P': 'one colorless mana or two life',

  // Hybrid mana
  'W/U': 'one white or blue mana',
  'W/B': 'one white or black mana',
  'U/B': 'one blue or black mana',
  'U/R': 'one blue or red mana',
  'B/R': 'one black or red mana',
  'B/G': 'one black or green mana',
  'R/G': 'one red or green mana',
  'R/W': 'one red or white mana',
  'G/W': 'one green or white mana',
  'G/U': 'one green or blue mana',

  // Hybrid Phyrexian mana
  'W/U/P': 'one white mana, one blue mana, or two life',
  'W/B/P': 'one white mana, one black mana, or two life',
  'U/B/P': 'one blue mana, one black mana, or two life',
  'U/R/P': 'one blue mana, one red mana, or two life',
  'B/R/P': 'one black mana, one red mana, or two life',
  'B/G/P': 'one black mana, one green mana, or two life',
  'R/G/P': 'one red mana, one green mana, or two life',
  'R/W/P': 'one red mana, one white mana, or two life',
  'G/W/P': 'one green mana, one white mana, or two life',
  'G/U/P': 'one green mana, one blue mana, or two life',

  // Two-brid mana (2 generic or 1 colored)
  '2/W': 'two generic mana or one white mana',
  '2/U': 'two generic mana or one blue mana',
  '2/B': 'two generic mana or one black mana',
  '2/R': 'two generic mana or one red mana',
  '2/G': 'two generic mana or one green mana',

  // Special symbols
  T: 'tap this permanent',
  Q: 'untap this permanent',
  S: 'one snow mana',
  E: 'one energy counter',
  P: 'Phyrexian mana',
  CHAOS: 'chaos',
  A: 'one acorn counter',
  TK: 'one ticket',

  // Half mana (Un-sets)
  HW: 'one-half white mana',
  HU: 'one-half blue mana',
  HB: 'one-half black mana',
  HR: 'one-half red mana',
  HG: 'one-half green mana',
  '½': 'one-half generic mana',

  // Infinity (Un-sets)
  '∞': 'infinite generic mana',
};

/**
 * Get the English description for a mana symbol.
 */
function getSymbolDescription(symbol: string): string {
  // Check for exact match first
  if (SYMBOL_DESCRIPTIONS[symbol]) {
    return SYMBOL_DESCRIPTIONS[symbol];
  }

  // Handle numeric values not in the list
  const num = parseInt(symbol);
  if (!isNaN(num)) {
    return `${symbol} generic mana`;
  }

  // Default fallback
  return `{${symbol}}`;
}

/**
 * Convert a mana symbol like "U/P" or "2/W" to the Scryfall SVG filename format.
 * Scryfall uses: {U/P} -> UP.svg, {2/W} -> 2W.svg
 */
function getSymbolFilename(symbol: string): string {
  // Remove curly braces if present
  const cleanSymbol = symbol.replace(/[{}]/g, '');
  // Replace slashes with nothing (U/P -> UP, 2/W -> 2W)
  return cleanSymbol.replace(/\//g, '');
}

/**
 * Renders a single mana symbol using Scryfall's official SVG icons.
 * Supports all MTG symbols including hybrid, phyrexian, and special symbols.
 * Includes a tooltip showing the English description.
 */
export function ManaSymbol({
  symbol,
  size = 'md',
  className,
}: ManaSymbolProps) {
  const filename = getSymbolFilename(symbol);
  const svgUrl = `https://svgs.scryfall.io/card-symbols/${filename}.svg`;
  const description = getSymbolDescription(symbol);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <img
            src={svgUrl}
            alt={`{${symbol}}`}
            className={cn(
              sizeClasses[size],
              'inline-block cursor-help',
              className,
            )}
            loading="lazy"
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs capitalize">
          {description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ManaCostProps {
  cost: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Renders a full mana cost string (e.g., "{2}{U}{U}" or "{2/W}{2/U}{2/B}{2/R}{2/G}")
 * using Scryfall's official SVG icons.
 */
export function ManaCost({ cost, size = 'md', className }: ManaCostProps) {
  if (!cost) return null;

  const symbols = cost.match(/\{([^}]+)\}/g) || [];

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {symbols.map((symbol, index) => (
        <ManaSymbol
          key={index}
          symbol={symbol.replace(/[{}]/g, '')}
          size={size}
        />
      ))}
    </span>
  );
}

interface OracleTextProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Renders oracle text with mana symbols replaced by Scryfall SVG icons.
 * Handles all symbol types including {T}, {Q}, {E}, hybrid mana, phyrexian mana, etc.
 */
export function OracleText({ text, size = 'sm', className }: OracleTextProps) {
  if (!text) return null;

  // Split text by mana symbols, keeping the symbols as separate tokens
  const parts = text.split(/(\{[^}]+\})/g);

  return (
    <span className={cn('whitespace-pre-wrap leading-relaxed', className)}>
      {parts.map((part, index) => {
        // Check if this part is a mana symbol
        const symbolMatch = part.match(/^\{([^}]+)\}$/);
        if (symbolMatch) {
          return (
            <ManaSymbol
              key={index}
              symbol={symbolMatch[1]}
              size={size}
              className="align-text-bottom mx-0.5"
            />
          );
        }
        // Regular text
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}
