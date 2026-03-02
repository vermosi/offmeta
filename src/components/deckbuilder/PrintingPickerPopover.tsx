/**
 * Popover that lets users change the printing/set of a card in the deck list.
 * Fetches all printings lazily from Scryfall and caches them in a module-level Map.
 * Also exports SetBadge, which displays the current set + price inline.
 *
 * The printingsByName cache is exported so DeckEditor can clear it on unmount.
 *
 * @module components/deckbuilder/PrintingPickerPopover
 */

import { useState, useCallback } from 'react';
import { Loader2, Check, Layers } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { ScryfallCard } from '@/types/card';
import type { CardPrinting } from '@/lib/scryfall/printings';
import { printingsByName } from './constants';

/** CSS filter to tint black SVGs to rarity colors */
const RARITY_FILTER: Record<string, string> = {
  mythic:   'brightness(0) saturate(100%) invert(50%) sepia(90%) saturate(600%) hue-rotate(360deg)',
  rare:     'brightness(0) saturate(100%) invert(70%) sepia(60%) saturate(500%) hue-rotate(15deg)',
  uncommon: 'brightness(0) saturate(100%) invert(70%) sepia(10%) saturate(200%) hue-rotate(180deg)',
  common:   '',
};

function rarityFilter(rarity?: string): React.CSSProperties | undefined {
  const f = rarity ? RARITY_FILTER[rarity] : undefined;
  return f ? { filter: f } : undefined;
}

// ── Set Badge ──────────────────────────────────────────────────────────────────
interface SetBadgeProps {
  cardName: string;
  scryfallId?: string | null;
  scryfallCache: React.RefObject<Map<string, ScryfallCard>>;
  /** Passed purely to trigger a re-render when the cache fills. */
  cacheVersion: number;
}

export function SetBadge({ cardName, scryfallId, scryfallCache, cacheVersion: _cv }: SetBadgeProps) {
  const selectedPrinting = scryfallId
    ? printingsByName.get(cardName)?.find((p) => p.id === scryfallId)
    : undefined;

  const setCode = selectedPrinting
    ? selectedPrinting.set
    : scryfallCache.current?.get(cardName)?.set;

  const card = scryfallCache.current?.get(cardName);
  const rarity = selectedPrinting?.rarity ?? card?.rarity;
  const price = card?.prices?.usd ? `$${card.prices.usd}` : null;

  const setName = selectedPrinting?.set_name;
  const rarityLabel = rarity ? rarity.charAt(0).toUpperCase() + rarity.slice(1) : null;
  const tooltipText = [setName, rarityLabel].filter(Boolean).join(' · ') || setCode?.toUpperCase();

  return (
    <>
      {setCode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="ml-1 shrink-0 inline-flex items-center gap-0.5 text-[9px] font-mono text-muted-foreground/60 bg-muted/40 rounded px-1 py-px leading-tight tracking-wide align-middle select-none cursor-default">
              <img
                src={`https://svgs.scryfall.io/sets/${setCode.toLowerCase()}.svg`}
                alt={setCode.toUpperCase()}
                className="h-2.5 w-2.5 inline-block"
                style={rarityFilter(rarity)}
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              {setCode.toUpperCase()}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      )}
      {price && (
        <span className="ml-1 shrink-0 text-[10px] text-muted-foreground/60 tabular-nums align-middle select-none">
          {price}
        </span>
      )}
    </>
  );
}

// ── Printing Picker Popover ────────────────────────────────────────────────────
interface PrintingPickerPopoverProps {
  cardName: string;
  currentScryfallId: string | null;
  onSelect: (printing: CardPrinting) => void;
}

export function PrintingPickerPopover({ cardName, currentScryfallId, onSelect }: PrintingPickerPopoverProps) {
  const [open, setOpen] = useState(false);
  const [printings, setPrintings] = useState<CardPrinting[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (printingsByName.has(cardName)) {
      setPrintings(printingsByName.get(cardName)!);
      return;
    }
    setLoading(true);
    try {
      const { getCardPrintings } = await import('@/lib/scryfall/printings');
      const data = await getCardPrintings(cardName);
      printingsByName.set(cardName, data);
      setPrintings(data);
    } finally {
      setLoading(false);
    }
  }, [cardName]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) load(); }}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Change printing / set"
        >
          <Layers className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 overflow-hidden" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold truncate">{cardName}</p>
          <p className="text-[10px] text-muted-foreground">Select a printing</p>
        </div>
        <div className="overflow-y-auto max-h-64">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : printings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No printings found</p>
          ) : (
            printings.map((p) => {
              const isSelected = currentScryfallId === p.id;
              return (
                <button
                  key={p.id}
                  className={cn(
                    'flex items-center w-full px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors gap-1',
                    isSelected && 'bg-primary/10 font-semibold',
                  )}
                  onClick={() => { onSelect(p); setOpen(false); }}
                >
                   <img
                      src={`https://svgs.scryfall.io/sets/${p.set.toLowerCase()}.svg`}
                      alt={p.set}
                      className="h-3 w-3 shrink-0"
                      style={rarityFilter(p.rarity)}
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                   <span className="flex-1 truncate">{p.set_name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 mr-2">
                    #{p.collector_number} · {p.lang.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-emerald-500 shrink-0 font-medium">
                    {p.prices.usd ? `$${p.prices.usd}` : '—'}
                  </span>
                  {isSelected && <Check className="h-3 w-3 text-primary ml-1 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
