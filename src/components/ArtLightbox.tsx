/**
 * Full-screen lightbox for card art.
 * Supports keyboard (←/→/Esc) and swipe navigation.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import type { ScryfallCard } from '@/types/card';
import { getCardImage } from '@/lib/scryfall/client';
import { useFocusTrap } from '@/hooks';

interface ArtLightboxProps {
  cards: ScryfallCard[];
  initialIndex: number;
  onClose: () => void;
}

export function ArtLightbox({
  cards,
  initialIndex,
  onClose,
}: ArtLightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const [loaded, setLoaded] = useState(false);
  const touchStart = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trap focus within the lightbox overlay
  useFocusTrap(containerRef);

  const card = cards[index];
  const artUrl = card ? getCardImage(card, 'large') : '';

  const goNext = useCallback(() => {
    setLoaded(false);
    setIndex((i) => (i + 1) % cards.length);
  }, [cards.length]);

  const goPrev = useCallback(() => {
    setLoaded(false);
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  }, [cards.length]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext();
      else goPrev();
    }
    touchStart.current = null;
  };

  if (!card) return null;

  return (
    <div
      ref={containerRef}
      className="overlay-backdrop fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label={`Art view: ${card.name}`}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="overlay-control absolute top-4 right-4 z-10 rounded-full p-2 transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Card counter (visual) */}
      <span
        className="overlay-counter absolute top-4 left-4 text-xs tabular-nums"
        aria-hidden="true"
      >
        {index + 1} / {cards.length}
      </span>
      {/* Screen reader card position */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Card {index + 1} of {cards.length}: {card.name}
      </div>

      {/* Prev */}
      {cards.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="overlay-control absolute left-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors sm:left-4"
          aria-label="Previous card"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="max-h-[85vh] max-w-[90vw] sm:max-w-[70vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {!loaded && (
          <div className="w-[300px] sm:w-[400px] aspect-[2.5/3.5] rounded-xl bg-muted/20 animate-pulse" />
        )}
        <img
          src={artUrl}
          alt={card.name}
          className={cn(
            'max-h-[85vh] w-auto rounded-xl shadow-2xl transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0 absolute',
          )}
          onLoad={() => setLoaded(true)}
          draggable={false}
        />
      </div>

      {/* Next */}
      {cards.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="overlay-control absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors sm:right-4"
          aria-label="Next card"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      )}

      {/* Card name */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="overlay-caption text-sm sm:text-base font-medium drop-shadow-lg">
          {card.name}
        </p>
        {card.artist && (
          <p className="overlay-caption-muted mt-0.5 text-[11px]">
            Art by {card.artist}
          </p>
        )}
      </div>
    </div>
  );
}
