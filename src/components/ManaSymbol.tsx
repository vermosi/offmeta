import { cn } from "@/lib/utils";

interface ManaSymbolProps {
  symbol: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Convert a mana symbol like "U/P" or "2/W" to the Scryfall SVG filename format.
 * Scryfall uses: {U/P} -> UP.svg, {2/W} -> 2W.svg
 */
function getSymbolFilename(symbol: string): string {
  // Remove curly braces if present
  const cleanSymbol = symbol.replace(/[{}]/g, "");
  // Replace slashes with nothing (U/P -> UP, 2/W -> 2W)
  return cleanSymbol.replace(/\//g, "");
}

/**
 * Renders a single mana symbol using Scryfall's official SVG icons.
 * Supports all MTG symbols including hybrid, phyrexian, and special symbols.
 */
export function ManaSymbol({ symbol, size = "md", className }: ManaSymbolProps) {
  const filename = getSymbolFilename(symbol);
  const svgUrl = `https://svgs.scryfall.io/card-symbols/${filename}.svg`;

  return (
    <img
      src={svgUrl}
      alt={`{${symbol}}`}
      className={cn(sizeClasses[size], "inline-block", className)}
      loading="lazy"
    />
  );
}

interface ManaCostProps {
  cost: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Renders a full mana cost string (e.g., "{2}{U}{U}" or "{2/W}{2/U}{2/B}{2/R}{2/G}")
 * using Scryfall's official SVG icons.
 */
export function ManaCost({ cost, size = "md", className }: ManaCostProps) {
  if (!cost) return null;
  
  const symbols = cost.match(/\{([^}]+)\}/g) || [];
  
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {symbols.map((symbol, index) => (
        <ManaSymbol
          key={index}
          symbol={symbol.replace(/[{}]/g, "")}
          size={size}
        />
      ))}
    </span>
  );
}

interface OracleTextProps {
  text: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Renders oracle text with mana symbols replaced by Scryfall SVG icons.
 * Handles all symbol types including {T}, {Q}, {E}, hybrid mana, phyrexian mana, etc.
 */
export function OracleText({ text, size = "sm", className }: OracleTextProps) {
  if (!text) return null;

  // Split text by mana symbols, keeping the symbols as separate tokens
  const parts = text.split(/(\{[^}]+\})/g);

  return (
    <span className={cn("whitespace-pre-wrap leading-relaxed", className)}>
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
