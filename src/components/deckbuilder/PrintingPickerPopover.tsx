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
import type { ScryfallCard } from '@/types/card';
import type { CardPrinting } from '@/lib/scryfall/printings';
import { printingsByName } from './constants';

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

  const set = selectedPrinting
    ? selectedPrinting.set.toUpperCase()
    : scryfallCache.current?.get(cardName)?.set?.toUpperCase();

  const card = scryfallCache.current?.get(cardName);
  const price = card?.prices?.usd ? `$${card.prices.usd}` : null;

  return (
    <>
      {set && (
        <span className="ml-1 shrink-0 text-[9px] font-mono text-muted-foreground/60 bg-muted/40 rounded px-1 py-px leading-tight tracking-wide align-middle select-none">
          {set}
        </span>
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

  const rarityDot = (rarity: string) =>
    cn(
      'h-2 w-2 rounded-full flex-shrink-0 inline-block mr-1.5',
      rarity === 'mythic' && 'bg-orange-500',
      rarity === 'rare' && 'bg-amber-500',
      rarity === 'uncommon' && 'bg-slate-400',
      rarity === 'common' && 'bg-slate-600',
    );

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
                  <span className={rarityDot(p.rarity)} />
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
