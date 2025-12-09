import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ColorFilterProps {
  selectedColors: string[];
  onColorToggle: (color: string) => void;
}

const colors = [
  { id: "W", name: "White", bg: "bg-amber-50 dark:bg-amber-100", text: "text-amber-900", border: "border-amber-200 dark:border-amber-300" },
  { id: "U", name: "Blue", bg: "bg-blue-500", text: "text-white", border: "border-blue-400" },
  { id: "B", name: "Black", bg: "bg-zinc-800", text: "text-zinc-100", border: "border-zinc-600" },
  { id: "R", name: "Red", bg: "bg-red-500", text: "text-white", border: "border-red-400" },
  { id: "G", name: "Green", bg: "bg-emerald-600", text: "text-white", border: "border-emerald-500" },
  { id: "C", name: "Colorless", bg: "bg-slate-300 dark:bg-slate-500", text: "text-slate-700 dark:text-slate-100", border: "border-slate-400" },
];

export function ColorFilter({ selectedColors, onColorToggle }: ColorFilterProps) {
  return (
    <div className="flex items-center gap-1.5">
      {colors.map((color) => {
        const isSelected = selectedColors.includes(color.id);
        return (
          <Tooltip key={color.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onColorToggle(color.id)}
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 border",
                  color.bg,
                  color.text,
                  color.border,
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-md"
                    : "opacity-60 hover:opacity-90 hover:scale-105"
                )}
              >
                {color.id}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {color.name}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
