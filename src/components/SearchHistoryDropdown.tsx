/**
 * Search history dropdown component.
 * Shows recent searches when the search input is focused.
 */

import { Clock, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface SearchHistoryDropdownProps {
  history: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectQuery: (query: string) => void;
  onRemoveQuery: (query: string) => void;
  onClearAll: () => void;
  children: React.ReactNode;
}

export function SearchHistoryDropdown({
  history,
  open,
  onOpenChange,
  onSelectQuery,
  onRemoveQuery,
  onClearAll,
  children,
}: SearchHistoryDropdownProps) {
  if (history.length === 0) {
    return <>{children}</>;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 z-50"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          role="listbox"
          aria-label="Recent searches"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">
              Recent Searches
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClearAll();
              }}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              aria-label="Clear all search history"
            >
              Clear all
            </Button>
          </div>

          {/* History items */}
          <ul className="py-1">
            {history.map((query, index) => (
              <li key={`${query}-${index}`} role="option" aria-selected="false">
                <div className="flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors group">
                  <button
                    onClick={() => onSelectQuery(query)}
                    className="flex-1 flex items-center gap-2 text-left min-w-0"
                    aria-label={`Search for ${query}`}
                  >
                    <Clock
                      className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-sm text-foreground truncate">
                      {query}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveQuery(query);
                    }}
                    className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                    aria-label={`Remove "${query}" from history`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
