import { defineTool } from '@lovable.dev/mcp-js';
import { z } from 'zod';

/**
 * Search Magic: The Gathering cards using Scryfall's advanced search syntax.
 * `game:paper` is appended automatically to exclude Alchemy-only printings,
 * matching the app-wide search convention.
 */
export default defineTool({
  name: 'search_cards',
  title: 'Search MTG cards',
  description:
    'Search Magic: The Gathering cards using Scryfall search syntax (e.g. "o:draw c:u mv<=2 f:commander"). Returns up to 20 matching cards with name, mana cost, type line, oracle text, prices, and image URL.',
  inputSchema: {
    query: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .describe('Scryfall-syntax query. Example: "o:treasure c:r mv<=2".'),
    unique: z
      .enum(['cards', 'art', 'prints'])
      .optional()
      .describe('Deduplication mode. Defaults to "cards".'),
    order: z
      .enum(['name', 'released', 'usd', 'edhrec', 'cmc', 'power', 'toughness'])
      .optional()
      .describe('Sort order. Defaults to "name".'),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async ({ query, unique, order }) => {
    const scryfallQuery = /\bgame:/i.test(query) ? query : `${query} game:paper`;
    const params = new URLSearchParams({
      q: scryfallQuery,
      unique: unique ?? 'cards',
      order: order ?? 'name',
    });

    const res = await fetch(`https://api.scryfall.com/cards/search?${params}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.status === 404) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `No cards found for query: ${scryfallQuery}`,
          },
        ],
        structuredContent: { total: 0, cards: [] },
      };
    }

    if (!res.ok) {
      const body = await res.text();
      return {
        content: [
          {
            type: 'text' as const,
            text: `Scryfall error [${res.status}]: ${body.slice(0, 500)}`,
          },
        ],
        isError: true,
      };
    }

    const data = (await res.json()) as {
      total_cards?: number;
      data?: Array<{
        name: string;
        mana_cost?: string;
        type_line?: string;
        oracle_text?: string;
        prices?: { usd?: string | null; eur?: string | null };
        image_uris?: { normal?: string };
        scryfall_uri?: string;
      }>;
    };

    const cards = (data.data ?? []).slice(0, 20).map((c) => ({
      name: c.name,
      mana_cost: c.mana_cost ?? '',
      type_line: c.type_line ?? '',
      oracle_text: c.oracle_text ?? '',
      price_usd: c.prices?.usd ?? null,
      price_eur: c.prices?.eur ?? null,
      image_url: c.image_uris?.normal ?? null,
      scryfall_url: c.scryfall_uri ?? null,
    }));

    return {
      content: [
        {
          type: 'text' as const,
          text: `Found ${data.total_cards ?? cards.length} cards. Showing ${cards.length}.`,
        },
      ],
      structuredContent: { total: data.total_cards ?? cards.length, cards },
    };
  },
});
