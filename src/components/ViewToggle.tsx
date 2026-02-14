/**
 * View mode toggle for search results: Grid, List, or Image-only.
 */

import { LayoutGrid, List, Image } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type ViewMode, storeViewMode } from '@/components/view-mode-storage';

// Re-exported from view-mode-storage for convenience
// eslint-disable-next-line react-refresh/only-export-components
export { type ViewMode, getStoredViewMode } from '@/components/view-mode-storage';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const handleChange = (val: string) => {
    if (val) {
      const mode = val as ViewMode;
      onChange(mode);
      storeViewMode(mode);
    }
  };

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={handleChange}
      className="h-8 sm:h-9 border border-border rounded-lg p-0.5 bg-muted/30"
      aria-label="View mode"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="grid"
            aria-label="Grid view"
            className="h-7 sm:h-8 w-7 sm:w-8 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Grid view</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="list"
            aria-label="List view"
            className="h-7 sm:h-8 w-7 sm:w-8 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
          >
            <List className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">List view</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="images"
            aria-label="Image-only view"
            className="h-7 sm:h-8 w-7 sm:w-8 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
          >
            <Image className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">Images only</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
