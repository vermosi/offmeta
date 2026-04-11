/**
 * Social proof badge — pill style with subtle pulse.
 * @module components/SearchCountBadge
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'offmeta_search_count_cache';
const CACHE_TTL_MS = 60 * 60 * 1000;

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export function SearchCountBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { value, ts } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL_MS) {
          setCount(value);
          return;
        }
      }
    } catch {
      // ignore
    }

    const fetchCount = async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: rowCount, error } = await supabase
        .from('translation_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      if (!error && rowCount !== null) {
        setCount(rowCount);
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ value: rowCount, ts: Date.now() }));
        } catch {
          // ignore
        }
      }
    };

    fetchCount();
  }, []);

  if (count === null || count < 50) return null;

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border border-accent/20 bg-accent/5 text-accent">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      {formatCount(count)} searches this week
    </span>
  );
}
