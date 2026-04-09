/**
 * Local-storage caching utilities for AI deck critique results.
 * @module components/deckbuilder/critique-cache
 */

import { type DeckCard } from '@/hooks';

export interface CritiqueResult {
  summary: string;
  cuts: {
    card_name: string;
    reason: string;
    severity: 'weak' | 'underperforming' | 'off-strategy';
  }[];
  additions: {
    card_name: string;
    reason: string;
    replaces?: string;
    category: string;
  }[];
  mana_curve_notes?: string;
  confidence?: number;
}

const CACHE_PREFIX = 'offmeta_critique_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedCritiqueEnvelope {
  data: CritiqueResult;
  expiresAt: number;
}

export function buildCacheKey(deckId: string, cards: DeckCard[]): string {
  const cardFingerprint = cards
    .map((c) => `${c.card_name}:${c.quantity}`)
    .sort()
    .join(',');
  let hash = 0;
  for (let i = 0; i < cardFingerprint.length; i++) {
    hash = ((hash << 5) - hash + cardFingerprint.charCodeAt(i)) | 0;
  }
  return `${CACHE_PREFIX}${deckId}_${hash >>> 0}`;
}

export function loadCachedCritique(key: string): CritiqueResult | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCritiqueEnvelope | CritiqueResult;

    if ('data' in parsed && 'expiresAt' in parsed) {
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    }

    return parsed as CritiqueResult;
  } catch {
    return null;
  }
}

export function saveCritique(key: string, data: CritiqueResult): void {
  try {
    const payload: CachedCritiqueEnvelope = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota exceeded — ignore */
  }
}
