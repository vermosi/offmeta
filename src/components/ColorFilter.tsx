import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ColorFilterProps {
  selectedColors: string[];
  onColorToggle: (color: string) => void;
}

const colors = [
  { id: "W", name: "White", bg: "bg-amber-100", text: "text-amber-900", symbol: "☀" },
  { id: "U", name: "Blue", bg: "bg-blue-500", text: "text-blue-100", symbol: "💧" },
  { id: "B", name: "Black", bg: "bg-gray-800", text: "text-gray-100", symbol: "💀" },
  { id: "R", name: "Red", bg: "bg-red-500", text: "text-red-100", symbol: "🔥" },
  { id: "G", name: "Green", bg: "bg-green-600", text: "text-green-100", symbol: "🌲" },
  { id: "C", name: "Colorless", bg: "bg-gray-400", text: "text-gray-800", symbol: "◇" },
];

export function ColorFilter({ selectedColors, onColorToggle }: ColorFilterProps) {
  return (
    <div className="flex items-center gap-1">
      {colors.map((color) => {
        const isSelected = selectedColors.includes(color.id);
        return (
          <Tooltip key={color.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onColorToggle(color.id)}
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200",
                  color.bg,
                  color.text,
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                    : "opacity-50 hover:opacity-80 hover:scale-105"
                )}
              >
                {color.id}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{color.name}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
