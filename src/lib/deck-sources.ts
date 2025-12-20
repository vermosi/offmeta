import { supabase } from '@/integrations/supabase/client';

export interface ScrapedDeck {
  id: string;
  source: string;
  source_url: string | null;
  source_deck_id: string | null;
  name: string;
  description: string | null;
  format: string;
  color_identity: string[];
  commander_name: string | null;
  mainboard: { name: string; quantity: number }[];
  sideboard: { name: string; quantity: number }[];
  budget_tier: string;
  estimated_price: number | null;
  win_rate: number | null;
  popularity_score: number | null;
  archetype: string | null;
  tags: string[];
  strategy_notes: string | null;
  scraped_at: string;
}

export type DeckSource = 'edhtop16' | 'mtggoldfish' | 'mtgtop8' | 'aetherhub' | 'cedh' | 'all';

export type DeckFormat = 
  | 'commander' 
  | 'cedh' 
  | 'standard' 
  | 'pioneer' 
  | 'modern' 
  | 'legacy' 
  | 'vintage' 
  | 'pauper';

export interface DeckFilters {
  source?: DeckSource;
  format?: DeckFormat;
  colors?: string[];
  budgetTier?: 'budget' | 'medium' | 'expensive';
  search?: string;
}

export const SOURCE_INFO: Record<string, { name: string; description: string; formats: DeckFormat[] }> = {
  edhtop16: {
    name: 'EDHTOP16',
    description: 'Competitive EDH tournament data with win rates',
    formats: ['commander'],
  },
  mtggoldfish: {
    name: 'MTGGoldfish',
    description: 'Popular deck aggregator with price tracking',
    formats: ['commander', 'standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'],
  },
  mtgtop8: {
    name: 'MTGTop8',
    description: 'Tournament results across all formats',
    formats: ['commander', 'standard', 'pioneer', 'modern', 'legacy', 'vintage', 'pauper'],
  },
  aetherhub: {
    name: 'AetherHub',
    description: 'Community decks with popularity metrics',
    formats: ['commander', 'standard', 'pioneer', 'modern'],
  },
  cedh: {
    name: 'cEDH Database',
    description: 'Competitive Commander decklists',
    formats: ['cedh', 'commander'],
  },
};

export const FORMAT_INFO: Record<DeckFormat, { name: string; description: string }> = {
  commander: { name: 'Commander / EDH', description: '100-card singleton format' },
  cedh: { name: 'cEDH', description: 'Competitive Commander' },
  standard: { name: 'Standard', description: 'Rotating 60-card format' },
  pioneer: { name: 'Pioneer', description: 'Non-rotating from Return to Ravnica' },
  modern: { name: 'Modern', description: 'Non-rotating from 8th Edition' },
  legacy: { name: 'Legacy', description: 'Eternal format with banned list' },
  vintage: { name: 'Vintage', description: 'Eternal format with restricted list' },
  pauper: { name: 'Pauper', description: 'Commons only' },
};

export async function fetchScrapedDecks(filters: DeckFilters = {}): Promise<ScrapedDeck[]> {
  let query = supabase
    .from('scraped_decks')
    .select('*')
    .order('popularity_score', { ascending: false, nullsFirst: false })
    .order('scraped_at', { ascending: false });

  if (filters.source && filters.source !== 'all') {
    query = query.eq('source', filters.source);
  }

  if (filters.format) {
    query = query.eq('format', filters.format);
  }

  if (filters.budgetTier) {
    query = query.eq('budget_tier', filters.budgetTier);
  }

  if (filters.colors && filters.colors.length > 0) {
    query = query.contains('color_identity', filters.colors);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,commander_name.ilike.%${filters.search}%,archetype.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Error fetching scraped decks:', error);
    return [];
  }

  return (data || []).map(d => ({
    id: d.id,
    source: d.source,
    source_url: d.source_url,
    source_deck_id: d.source_deck_id,
    name: d.name,
    description: d.description,
    format: d.format,
    color_identity: d.color_identity || [],
    commander_name: d.commander_name,
    mainboard: parseJsonArray(d.mainboard),
    sideboard: parseJsonArray(d.sideboard),
    budget_tier: d.budget_tier,
    estimated_price: d.estimated_price,
    win_rate: d.win_rate,
    popularity_score: d.popularity_score,
    archetype: d.archetype,
    tags: d.tags || [],
    strategy_notes: d.strategy_notes,
    scraped_at: d.scraped_at,
  })) as ScrapedDeck[];
}

function parseJsonArray(json: unknown): { name: string; quantity: number }[] {
  if (!json || !Array.isArray(json)) return [];
  return json.filter(item => 
    typeof item === 'object' && 
    item !== null && 
    'name' in item && 
    'quantity' in item
  ) as { name: string; quantity: number }[];
}

export async function triggerDeckScrape(
  source: DeckSource,
  format: DeckFormat,
  colors?: string[],
  budgetMax?: number
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (source === 'all') {
    return { success: false, error: 'Cannot scrape all sources at once' };
  }

  const { data, error } = await supabase.functions.invoke('scrape-decks', {
    body: {
      source,
      format,
      colors,
      budgetMax,
      limit: 20,
    },
  });

  if (error) {
    console.error('Scrape error:', error);
    return { success: false, error: error.message };
  }

  return {
    success: data.success,
    count: data.count,
    error: data.error,
  };
}

export function getColorName(color: string): string {
  const colorNames: Record<string, string> = {
    W: 'White',
    U: 'Blue',
    B: 'Black',
    R: 'Red',
    G: 'Green',
  };
  return colorNames[color] || color;
}

export function getBudgetLabel(tier: string): string {
  const labels: Record<string, string> = {
    budget: 'Budget (<$100)',
    medium: 'Mid-Range ($100-$500)',
    expensive: 'High-End ($500+)',
  };
  return labels[tier] || tier;
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return 'Unknown';
  return `$${price.toFixed(2)}`;
}
