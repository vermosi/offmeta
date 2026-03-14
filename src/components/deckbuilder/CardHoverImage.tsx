/**
 * Wraps children in a hover-triggered floating card image preview.
 * Uses local database for card images first, falling back to Scryfall.
 *
 * @module components/deckbuilder/CardHoverImage
 */

import { useState, useRef, useCallback } from 'react';
import type { ScryfallCard } from '@/types/card';
import { cardImageFetchCache } from './constants';
import { getLocalCardImage } from '@/services/local-cards';

interface CardHoverImageProps {
  cardName: string;
  scryfallCache: React.RefObject<Map<string, ScryfallCard>>;
  children: React.ReactNode;
}

export function CardHoverImage({ cardName, scryfallCache, children }: CardHoverImageProps) {
  const [imgUrl, setImgUrl] = useState<string | null | undefined>(undefined);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(async () => {
    timerRef.current = setTimeout(async () => {
      setVisible(true);
      if (cardImageFetchCache.has(cardName)) {
        setImgUrl(cardImageFetchCache.get(cardName) ?? null);
        return;
      }
      const cached = scryfallCache.current?.get(cardName);
      if (cached) {
        const url = cached.image_uris?.normal ?? cached.card_faces?.[0]?.image_uris?.normal ?? null;
        cardImageFetchCache.set(cardName, url);
        setImgUrl(url);
        return;
      }

      // Try local DB first
      try {
        const localUrl = await getLocalCardImage(cardName);
        if (localUrl) {
          cardImageFetchCache.set(cardName, localUrl);
          setImgUrl(localUrl);
          return;
        }
      } catch {
        // Fall through to Scryfall
      }

      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
        if (res.ok) {
          const data = await res.json();
          scryfallCache.current?.set(cardName, data);
          const url = data.image_uris?.normal ?? data.card_faces?.[0]?.image_uris?.normal ?? null;
          cardImageFetchCache.set(cardName, url);
          setImgUrl(url);
        } else {
          cardImageFetchCache.set(cardName, null);
          setImgUrl(null);
        }
      } catch {
        cardImageFetchCache.set(cardName, null);
        setImgUrl(null);
      }
    }, 350);
  }, [cardName, scryfallCache]);

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return (
    <span className="relative flex-1 truncate min-w-0" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {children}
      {visible && imgUrl && (
        <span
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 rounded-xl shadow-2xl border border-border overflow-hidden"
          style={{ width: 146, height: 204 }}
        >
          <img src={imgUrl} alt={cardName} width={146} height={204} className="block object-cover w-full h-full" loading="lazy" />
        </span>
      )}
    </span>
  );
}
