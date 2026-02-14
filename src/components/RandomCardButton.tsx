/**
 * "Surprise Me" button that fetches a random card from Scryfall.
 */

import { useState, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle, Loader2 } from 'lucide-react';
import type { ScryfallCard } from '@/types/card';

const CardModal = lazy(() => import('@/components/CardModal'));

export function RandomCardButton() {
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<ScryfallCard | null>(null);

  const fetchRandom = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('https://api.scryfall.com/cards/random');
      if (!res.ok) throw new Error('Failed to fetch');
      const data: ScryfallCard = await res.json();
      setCard(data);
    } catch {
      // Silently fail — button stays clickable
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={fetchRandom}
        disabled={loading}
        className="gap-2 h-9 text-sm"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Shuffle className="h-4 w-4" aria-hidden="true" />
        )}
        Surprise Me
      </Button>

      {card && (
        <Suspense fallback={null}>
          <CardModal
            card={card}
            open={true}
            onClose={() => setCard(null)}
          />
        </Suspense>
      )}
    </>
  );
}
