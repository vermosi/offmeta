import { cn } from "@/lib/utils";

interface ManaSymbolProps {
  symbol: string;
  size?: "sm" | "md" | "lg";
}

const symbolColors: Record<string, string> = {
  W: "bg-amber-100 text-amber-900",
  U: "bg-blue-400 text-blue-950",
  B: "bg-gray-800 text-gray-100",
  R: "bg-red-500 text-red-100",
  G: "bg-green-500 text-green-950",
  C: "bg-gray-400 text-gray-800",
};

const sizeClasses = {
  sm: "h-5 w-5 text-xs",
  md: "h-6 w-6 text-sm",
  lg: "h-8 w-8 text-base",
};

export function ManaSymbol({ symbol, size = "md" }: ManaSymbolProps) {
  const isNumber = !isNaN(parseInt(symbol));
  const colorClass = symbolColors[symbol] || "bg-gray-500 text-gray-100";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold shadow-md",
        sizeClasses[size],
        isNumber ? "bg-gray-400 text-gray-800" : colorClass
      )}
    >
      {symbol}
    </span>
  );
}

interface ManaCostProps {
  cost: string;
  size?: "sm" | "md" | "lg";
}

export function ManaCost({ cost, size = "md" }: ManaCostProps) {
  if (!cost) return null;
  
  const symbols = cost.match(/\{([^}]+)\}/g) || [];
  
  return (
    <div className="flex items-center gap-0.5">
      {symbols.map((symbol, index) => (
        <ManaSymbol
          key={index}
          symbol={symbol.replace(/[{}]/g, "")}
          size={size}
        />
      ))}
    </div>
  );
}
