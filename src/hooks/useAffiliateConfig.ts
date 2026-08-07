/**
 * Hook to fetch and cache the affiliate base URL from the backend.
 * Caches in sessionStorage to avoid repeated fetches.
 * @module hooks/useAffiliateConfig
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';

const CACHE_KEY = 'offmeta_affiliate_config';

interface AffiliateConfig {
  tcgplayerAffiliateBase: string;
}

let globalConfig: AffiliateConfig | null = null;
let fetchPromise: Promise<AffiliateConfig> | null = null;

async function fetchConfig(): Promise<AffiliateConfig> {
  // Check sessionStorage first
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as AffiliateConfig;
      globalConfig = parsed;
      return parsed;
    } catch { /* fall through */ }
  }

  const { data, error } = await supabase.functions.invoke('get-affiliate-config');

  if (error || !data) {
    logger.warn('Failed to fetch affiliate config');
    return { tcgplayerAffiliateBase: '' };
  }

  const config: AffiliateConfig = {
    tcgplayerAffiliateBase: data.tcgplayerAffiliateBase || '',
  };

  globalConfig = config;
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(config));
  return config;
}

export function useAffiliateConfig(): AffiliateConfig {
  const [config, setConfig] = useState<AffiliateConfig>(
    () => globalConfig || { tcgplayerAffiliateBase: '' },
  );

  useEffect(() => {
    if (globalConfig) return;

    if (!fetchPromise) {
      fetchPromise = fetchConfig();
    }

    let cancelled = false;
    fetchPromise.then((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => { cancelled = true; };
  }, []);

  return config;
}

/**
 * Extracts the actual TCGPlayer product URL from a Scryfall partner redirect
 * link. Scryfall partner links use the query parameter `u` to hold the final
 * destination URL; without extracting it, wrapping the redirect link would keep
 * Scryfall's affiliate attribution instead of the user's.
 */
export function extractTcgplayerDestinationUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === 'partner.tcgplayer.com') {
      const destination = parsed.searchParams.get('u');
      if (destination) return destination;
    }
  } catch {
    // Invalid URL; fall through to return original.
  }
  return url;
}

/**
 * Wraps a TCGPlayer URL with the affiliate base if configured.
 * If Scryfall already provided a partner/redirect link, the destination is
 * extracted first so the user's affiliate attribution is always used.
 */
export function wrapAffiliateUrl(url: string, affiliateBase: string): string {
  if (!affiliateBase) return url;
  const destination = isAlreadyAffiliateUrl(url)
    ? extractTcgplayerDestinationUrl(url)
    : url;
  return `${normalizeAffiliateBase(affiliateBase)}${encodeURIComponent(destination)}`;
}

/**
 * Ensures the affiliate base ends with a query parameter the destination URL can
 * be appended to. Short Impact links (e.g. `https://partner.tcgplayer.com/GKPVxn`)
 * have no `?u=`, and naively concatenating the destination produces a malformed
 * link that TCGplayer rejects.
 */
export function normalizeAffiliateBase(affiliateBase: string): string {
  const base = affiliateBase.trim();
  if (!base) return base;
  if (base.endsWith('=')) return base;
  if (base.endsWith('?') || base.endsWith('&')) return `${base}u=`;
  return base.includes('?') ? `${base}&u=` : `${base}?u=`;
}

/** True when the URL is already an affiliate/redirect link (Impact, partner subdomains). */
export function isAlreadyAffiliateUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'partner.tcgplayer.com' ||
      host.endsWith('.prf.hn') ||
      host.endsWith('.sjv.io') ||
      host.endsWith('.pxf.io') ||
      host.endsWith('.7eer.net') ||
      host.endsWith('.evyy.net')
    );
  } catch {
    return false;
  }
}
