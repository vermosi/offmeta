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
    globalConfig || { tcgplayerAffiliateBase: '' },
  );

  useEffect(() => {
    if (globalConfig) {
      setConfig(globalConfig);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchConfig();
    }

    fetchPromise.then((c) => setConfig(c));
  }, []);

  return config;
}

/**
 * Wraps a TCGPlayer URL with the affiliate base if configured.
 */
export function wrapAffiliateUrl(url: string, affiliateBase: string): string {
  if (!affiliateBase) return url;
  return `${affiliateBase}${encodeURIComponent(url)}`;
}
