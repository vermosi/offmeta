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
import { type ViewMode, storeViewMode } from '@/lib/view-mode-storage';
import { useTranslation } from '@/lib/i18n';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const { t } = useTranslation();

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
      aria-label={t('view.label')}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="grid"
            aria-label={t('view.grid')}
            className="h-7 sm:h-8 w-7 sm:w-8 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{t('view.grid')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="list"
            aria-label={t('view.list')}
            className="h-7 sm:h-8 w-7 sm:w-8 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
          >
            <List className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{t('view.list')}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToggleGroupItem
            value="images"
            aria-label={t('view.images')}
            className="h-7 sm:h-8 w-7 sm:w-8 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded-md"
          >
            <Image className="h-3.5 w-3.5" />
          </ToggleGroupItem>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{t('view.images')}</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  );
}
