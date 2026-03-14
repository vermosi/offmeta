/**
 * "Surprise Me" button that fetches a random card from Scryfall.
 */

import { useState, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Shuffle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';

const CardModal = lazy(() => import('@/components/CardModal'));

export function RandomCardButton() {
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<ScryfallCard | null>(null);
  const { t } = useTranslation();

  const fetchRandom = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Uses local-first via the updated scryfall client
      const { getRandomCard } = await import('@/lib/scryfall/client');
      const data = await getRandomCard();
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
        {t('surpriseMe')}
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
