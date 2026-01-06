/**
 * TCGPlayer API utilities for fetching market data.
 * @module lib/tcgplayer
 */

export interface TCGPlayerMarketData {
  marketPrice: number | null;
  medianPrice: number | null;
  lowestPrice: number | null;
  lowestPriceWithShipping: number | null;
  sellers: number;
  listings: number;
  productId: number;
  productName: string;
  tcgplayerTip: string | null;
  skus: {
    condition: string;
    variant: string;
    language: string;
  }[];
}

// Cache for market data
const marketDataCache = new Map<number, { data: TCGPlayerMarketData; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch market data from TCGPlayer API
 * @param tcgplayerId - The TCGPlayer product ID
 */
export async function getTCGPlayerMarketData(tcgplayerId: number): Promise<TCGPlayerMarketData | null> {
  // Check cache first
  const cached = marketDataCache.get(tcgplayerId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `https://mp-search-api.tcgplayer.com/v2/product/${tcgplayerId}/details`
    );

    if (!response.ok) {
      console.error('TCGPlayer API error:', response.status);
      return null;
    }

    const data = await response.json();

    const marketData: TCGPlayerMarketData = {
      marketPrice: data.marketPrice ?? null,
      medianPrice: data.medianPrice ?? null,
      lowestPrice: data.lowestPrice ?? null,
      lowestPriceWithShipping: data.lowestPriceWithShipping ?? null,
      sellers: data.sellers ?? 0,
      listings: data.listings ?? 0,
      productId: data.productId,
      productName: data.productName,
      tcgplayerTip: data.formattedAttributes?.['TCGplayer Tip'] ?? null,
      skus: (data.skus || []).slice(0, 10).map((sku: any) => ({
        condition: sku.condition,
        variant: sku.variant,
        language: sku.language,
      })),
    };

    // Cache the result
    marketDataCache.set(tcgplayerId, { data: marketData, timestamp: Date.now() });

    return marketData;
  } catch (error) {
    console.error('Failed to fetch TCGPlayer market data:', error);
    return null;
  }
}

/**
 * Extract TCGPlayer product ID from a Scryfall card
 */
export function getTCGPlayerProductId(card: any): number | null {
  return card.tcgplayer_id ?? null;
}
