import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScrapeRequest {
  source: 'edhtop16' | 'mtggoldfish' | 'mtgtop8' | 'aetherhub' | 'cedh';
  format?: string;
  colors?: string[];
  budgetMax?: number;
  limit?: number;
}

interface DeckData {
  source: string;
  source_url: string;
  source_deck_id: string;
  name: string;
  description?: string;
  format: string;
  color_identity: string[];
  commander_name?: string;
  mainboard: { name: string; quantity: number }[];
  sideboard: { name: string; quantity: number }[];
  archetype?: string;
  tags: string[];
  strategy_notes?: string;
  win_rate?: number;
  popularity_score?: number;
}

// Source URL patterns
const SOURCE_URLS: Record<string, string> = {
  edhtop16: 'https://edhtop16.com',
  mtggoldfish: 'https://www.mtggoldfish.com',
  mtgtop8: 'https://www.mtgtop8.com',
  aetherhub: 'https://aetherhub.com',
  cedh: 'https://cedh-decklist-database.com',
};

// Format mappings for each source
const FORMAT_PATHS: Record<string, Record<string, string>> = {
  edhtop16: {
    commander: '/commanders',
  },
  mtggoldfish: {
    commander: '/metagame/commander',
    standard: '/metagame/standard',
    pioneer: '/metagame/pioneer',
    modern: '/metagame/modern',
    legacy: '/metagame/legacy',
    vintage: '/metagame/vintage',
    pauper: '/metagame/pauper',
  },
  mtgtop8: {
    commander: '/format?f=EDH',
    standard: '/format?f=ST',
    pioneer: '/format?f=PI',
    modern: '/format?f=MO',
    legacy: '/format?f=LE',
    vintage: '/format?f=VI',
    pauper: '/format?f=PAU',
  },
  aetherhub: {
    commander: '/Metagame/Commander',
    standard: '/Metagame/Standard',
    pioneer: '/Metagame/Pioneer',
    modern: '/Metagame/Modern',
  },
  cedh: {
    cedh: '/database',
    commander: '/database',
  },
};

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<any> {
  console.log(`Scraping URL: ${url}`);
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'links'],
      onlyMainContent: true,
      waitFor: 2000,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error('Firecrawl error:', data);
    throw new Error(data.error || `Scrape failed with status ${response.status}`);
  }

  return data.data || data;
}

function parseColorIdentity(text: string): string[] {
  const colors: string[] = [];
  const colorMap: Record<string, string> = {
    'white': 'W', 'W': 'W',
    'blue': 'U', 'U': 'U',
    'black': 'B', 'B': 'B',
    'red': 'R', 'R': 'R',
    'green': 'G', 'G': 'G',
  };
  
  for (const [key, value] of Object.entries(colorMap)) {
    if (text.toLowerCase().includes(key.toLowerCase()) && !colors.includes(value)) {
      colors.push(value);
    }
  }
  
  return colors;
}

function extractDecksFromMarkdown(markdown: string, source: string, format: string): Partial<DeckData>[] {
  const decks: Partial<DeckData>[] = [];
  
  // Common patterns for deck entries across sites
  const patterns = [
    // Pattern: "### Deck Name" or "## Deck Name"
    /#{2,3}\s+(.+?)(?:\n|$)/gi,
    // Pattern: "[Deck Name](url)"
    /\[([^\]]+)\]\(([^)]+deck[^)]*)\)/gi,
    // Pattern: "Commander: Card Name"
    /commander:?\s*(.+?)(?:\n|$)/gi,
  ];

  // Extract deck links
  const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let match;
  
  while ((match = linkPattern.exec(markdown)) !== null) {
    const [, name, url] = match;
    if (url.includes('deck') || url.includes('archetype') || url.includes('commander')) {
      const deckId = url.split('/').pop() || crypto.randomUUID();
      
      decks.push({
        source,
        source_url: url,
        source_deck_id: `${source}-${deckId}`,
        name: name.trim(),
        format,
        color_identity: parseColorIdentity(name),
        tags: extractTags(name),
      });
    }
  }

  // Extract commander names for EDH sources
  if (format === 'commander' || format === 'cedh') {
    const commanderPattern = /(?:commander|lead|helm)(?:ed by)?:?\s*\[?([^\]\n]+)\]?/gi;
    while ((match = commanderPattern.exec(markdown)) !== null) {
      const commanderName = match[1].trim();
      if (commanderName.length > 2 && commanderName.length < 100) {
        decks.push({
          source,
          source_deck_id: `${source}-cmd-${commanderName.toLowerCase().replace(/\s+/g, '-')}`,
          name: `${commanderName} Deck`,
          commander_name: commanderName,
          format,
          color_identity: [],
          tags: ['commander'],
        });
      }
    }
  }

  return decks;
}

function extractTags(text: string): string[] {
  const tagKeywords = [
    'aggro', 'control', 'combo', 'midrange', 'tempo', 'ramp',
    'tribal', 'tokens', 'stax', 'voltron', 'aristocrats', 'reanimator',
    'storm', 'mill', 'burn', 'lands', 'artifacts', 'enchantments',
    'sacrifice', 'graveyard', 'blink', 'spellslinger', 'lifegain',
    'infect', 'superfriends', 'wheels', 'hatebears', 'pillowfort',
  ];
  
  const foundTags: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const tag of tagKeywords) {
    if (lowerText.includes(tag)) {
      foundTags.push(tag);
    }
  }
  
  return foundTags;
}

async function calculateBudgetTier(cardNames: string[]): Promise<{ tier: string; price: number }> {
  if (cardNames.length === 0) {
    return { tier: 'medium', price: 0 };
  }

  // Sample a subset of cards to estimate price
  const sampleSize = Math.min(20, cardNames.length);
  const sampledCards = cardNames.slice(0, sampleSize);
  
  let totalPrice = 0;
  
  for (const cardName of sampledCards) {
    try {
      const response = await fetch(
        `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`,
        { headers: { 'Accept': 'application/json' } }
      );
      
      if (response.ok) {
        const card = await response.json();
        const price = parseFloat(card.prices?.usd || card.prices?.usd_foil || '0');
        totalPrice += price;
      }
      
      // Rate limit for Scryfall
      await new Promise(resolve => setTimeout(resolve, 75));
    } catch (e) {
      console.log(`Price lookup failed for ${cardName}`);
    }
  }

  // Extrapolate to full deck
  const estimatedTotal = (totalPrice / sampleSize) * cardNames.length;
  
  let tier: string;
  if (estimatedTotal < 100) {
    tier = 'budget';
  } else if (estimatedTotal < 500) {
    tier = 'medium';
  } else {
    tier = 'expensive';
  }

  return { tier, price: Math.round(estimatedTotal * 100) / 100 };
}

async function scrapeDeckDetails(deckUrl: string, apiKey: string): Promise<Partial<DeckData>> {
  try {
    const data = await scrapeWithFirecrawl(deckUrl, apiKey);
    const markdown = data.markdown || '';
    
    // Parse decklist from markdown
    const mainboard: { name: string; quantity: number }[] = [];
    const sideboard: { name: string; quantity: number }[] = [];
    
    // Pattern: "4 Card Name" or "4x Card Name"
    const cardPattern = /^(\d+)x?\s+(.+?)$/gm;
    let match;
    let inSideboard = false;
    
    const lines = markdown.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('sideboard')) {
        inSideboard = true;
        continue;
      }
      
      const cardMatch = line.match(/^(\d+)x?\s+(.+?)$/);
      if (cardMatch) {
        const quantity = parseInt(cardMatch[1]);
        const name = cardMatch[2].trim();
        
        if (name.length > 1 && name.length < 100 && quantity > 0 && quantity <= 99) {
          if (inSideboard) {
            sideboard.push({ name, quantity });
          } else {
            mainboard.push({ name, quantity });
          }
        }
      }
    }

    // Extract strategy notes
    const strategyMatch = markdown.match(/(?:strategy|gameplan|description|about)[:.]?\s*([^#]+)/i);
    const strategyNotes = strategyMatch ? strategyMatch[1].trim().slice(0, 500) : undefined;

    return {
      mainboard,
      sideboard,
      strategy_notes: strategyNotes,
      tags: extractTags(markdown),
    };
  } catch (error) {
    console.error(`Failed to scrape deck details from ${deckUrl}:`, error);
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { source, format = 'commander', colors, budgetMax, limit = 20 }: ScrapeRequest = await req.json();

    if (!source || !SOURCE_URLS[source]) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid source specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting scrape: source=${source}, format=${format}, colors=${colors?.join(',')}, limit=${limit}`);

    // Build the URL to scrape
    const baseUrl = SOURCE_URLS[source];
    const formatPath = FORMAT_PATHS[source]?.[format] || '';
    const targetUrl = `${baseUrl}${formatPath}`;

    console.log(`Scraping: ${targetUrl}`);

    // Scrape the main page to get deck listings
    const mainPageData = await scrapeWithFirecrawl(targetUrl, firecrawlApiKey);
    const markdown = mainPageData.markdown || '';
    const links = mainPageData.links || [];

    console.log(`Found ${links.length} links on page`);

    // Extract deck data from the scraped content
    let decks = extractDecksFromMarkdown(markdown, source, format);

    // Also extract from links array
    for (const link of links.slice(0, 50)) {
      if (typeof link === 'string' && (link.includes('deck') || link.includes('archetype'))) {
        const deckId = link.split('/').pop() || '';
        const existingDeck = decks.find(d => d.source_url === link);
        if (!existingDeck && deckId) {
          decks.push({
            source,
            source_url: link,
            source_deck_id: `${source}-${deckId}`,
            name: deckId.replace(/-/g, ' ').replace(/_/g, ' '),
            format,
            color_identity: [],
            tags: [],
          });
        }
      }
    }

    console.log(`Extracted ${decks.length} potential decks`);

    // Filter by colors if specified
    if (colors && colors.length > 0) {
      decks = decks.filter(deck => {
        if (!deck.color_identity || deck.color_identity.length === 0) return true;
        return colors.every(c => deck.color_identity?.includes(c));
      });
    }

    // Limit results
    decks = decks.slice(0, limit);

    // For each deck, try to get more details (rate limited)
    const enrichedDecks: DeckData[] = [];
    
    for (const deck of decks.slice(0, 5)) { // Only enrich first 5 to avoid rate limits
      if (deck.source_url) {
        try {
          console.log(`Enriching deck: ${deck.name}`);
          const details = await scrapeDeckDetails(deck.source_url, firecrawlApiKey);
          
          // Calculate budget if we have cards
          let budgetInfo = { tier: 'medium', price: 0 };
          if (details.mainboard && details.mainboard.length > 0) {
            const cardNames = details.mainboard.map(c => c.name);
            budgetInfo = await calculateBudgetTier(cardNames);
          }

          // Filter by budget if specified
          if (budgetMax && budgetInfo.price > budgetMax) {
            continue;
          }

          enrichedDecks.push({
            source: deck.source!,
            source_url: deck.source_url!,
            source_deck_id: deck.source_deck_id!,
            name: deck.name!,
            description: details.strategy_notes,
            format: deck.format!,
            color_identity: deck.color_identity || [],
            commander_name: deck.commander_name,
            mainboard: details.mainboard || [],
            sideboard: details.sideboard || [],
            archetype: deck.name,
            tags: [...(deck.tags || []), ...(details.tags || [])].filter((v, i, a) => a.indexOf(v) === i),
            strategy_notes: details.strategy_notes,
            popularity_score: 0,
          } as DeckData);

          // Small delay between scrapes
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.error(`Failed to enrich deck ${deck.name}:`, e);
        }
      }
    }

    // Add remaining decks without full enrichment
    for (const deck of decks.slice(5)) {
      enrichedDecks.push({
        source: deck.source!,
        source_url: deck.source_url || `${baseUrl}/deck/${deck.source_deck_id}`,
        source_deck_id: deck.source_deck_id!,
        name: deck.name!,
        format: deck.format!,
        color_identity: deck.color_identity || [],
        commander_name: deck.commander_name,
        mainboard: [],
        sideboard: [],
        tags: deck.tags || [],
      } as DeckData);
    }

    console.log(`Saving ${enrichedDecks.length} decks to database`);

    // Upsert decks to database
    if (enrichedDecks.length > 0) {
      const { error: upsertError } = await supabase
        .from('scraped_decks')
        .upsert(
          enrichedDecks.map(d => ({
            source: d.source,
            source_url: d.source_url,
            source_deck_id: d.source_deck_id,
            name: d.name,
            description: d.description,
            format: d.format,
            color_identity: d.color_identity,
            commander_name: d.commander_name,
            mainboard: d.mainboard,
            sideboard: d.sideboard,
            archetype: d.archetype,
            tags: d.tags,
            strategy_notes: d.strategy_notes,
            scraped_at: new Date().toISOString(),
          })),
          { onConflict: 'source,source_deck_id' }
        );

      if (upsertError) {
        console.error('Database upsert error:', upsertError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        decks: enrichedDecks,
        count: enrichedDecks.length,
        source: targetUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scrape error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
