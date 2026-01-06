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

export interface ConditionPricing {
  condition: string;
  conditionAbbr: string;
  price: number;
  shipping: number;
  sellerName: string;
  sellerRating: number;
  listingId: number;
  printing: string;
}

export interface LiveListingsData {
  conditionPrices: ConditionPricing[];
  priceStats: {
    min: number;
    max: number;
    avg: number;
  } | null;
  totalListings: number;
  lastUpdated: string | null;
}

// Cache for market data
const marketDataCache = new Map<number, { data: TCGPlayerMarketData; timestamp: number }>();
const liveListingsCache = new Map<string, { data: LiveListingsData; timestamp: number }>();
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
 * Fetch live listings with condition-based pricing from tcgapis.com
 * @param setName - The expansion name (e.g., "Alpha Edition")
 * @param cardName - The card name (e.g., "Tundra")
 */
export async function getLiveListings(setName: string, cardName: string): Promise<LiveListingsData | null> {
  const cacheKey = `${setName}|${cardName}`;
  
  // Check cache first
  const cached = liveListingsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      game: 'Magic: The Gathering',
      expansion: setName,
      name: cardName,
    });

    const response = await fetch(`https://tcgapis.com/api/v1/catalog/card-details?${params}`);

    if (!response.ok) {
      console.error('tcgapis.com API error:', response.status);
      return null;
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      return null;
    }

    const data = result.data;
    const cheapestByCondition = data.live_listings?.cheapestByConditionAndPrinting || {};
    
    // Map condition abbreviations
    const conditionMap: Record<string, string> = {
      'Near Mint': 'NM',
      'Lightly Played': 'LP',
      'Moderately Played': 'MP',
      'Heavily Played': 'HP',
      'Damaged': 'DM',
    };

    // Extract cheapest prices per condition (Normal variant only)
    const conditionPrices: ConditionPricing[] = [];
    const conditionOrder = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged'];
    
    for (const condition of conditionOrder) {
      const key = `${condition}|Normal`;
      const listing = cheapestByCondition[key];
      if (listing) {
        conditionPrices.push({
          condition,
          conditionAbbr: conditionMap[condition] || condition,
          price: listing.price,
          shipping: listing.shipping || 0,
          sellerName: listing.sellerName,
          sellerRating: listing.sellerRating,
          listingId: listing.listingId,
          printing: 'Normal',
        });
      }
    }

    // Also check for Foil variants
    for (const condition of conditionOrder) {
      const key = `${condition}|Foil`;
      const listing = cheapestByCondition[key];
      if (listing) {
        conditionPrices.push({
          condition,
          conditionAbbr: conditionMap[condition] || condition,
          price: listing.price,
          shipping: listing.shipping || 0,
          sellerName: listing.sellerName,
          sellerRating: listing.sellerRating,
          listingId: listing.listingId,
          printing: 'Foil',
        });
      }
    }

    const liveListingsData: LiveListingsData = {
      conditionPrices,
      priceStats: data.live_listings?.priceStats || null,
      totalListings: data.live_listings?.totalListings || 0,
      lastUpdated: data.live_listings?.lastUpdated || null,
    };

    // Cache the result
    liveListingsCache.set(cacheKey, { data: liveListingsData, timestamp: Date.now() });

    return liveListingsData;
  } catch (error) {
    console.error('Failed to fetch live listings:', error);
    return null;
  }
}

/**
 * Extract TCGPlayer product ID from a Scryfall card
 */
export function getTCGPlayerProductId(card: any): number | null {
  return card.tcgplayer_id ?? null;
}
