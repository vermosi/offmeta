import { createClient } from '@supabase/supabase-js';
import { defineTool, type ToolContext } from '@lovable.dev/mcp-js';
import { z } from 'zod';

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: 'get_deck',
  title: 'Get deck details',
  description:
    'Fetch a deck (metadata + full card list grouped by board) the signed-in user owns or that is marked public.',
  inputSchema: {
    deck_id: z.string().uuid().describe('Deck UUID from list_my_decks.'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ deck_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated' }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    const { data: deck, error: deckErr } = await supabase
      .from('decks')
      .select(
        'id, name, format, commander_name, companion_name, color_identity, description, is_public, card_count, updated_at, user_id',
      )
      .eq('id', deck_id)
      .maybeSingle();

    if (deckErr) {
      return {
        content: [{ type: 'text', text: deckErr.message }],
        isError: true,
      };
    }
    if (!deck) {
      return {
        content: [{ type: 'text', text: 'Deck not found or not accessible.' }],
        isError: true,
      };
    }

    const { data: cards, error: cardsErr } = await supabase
      .from('deck_cards')
      .select('card_name, quantity, board, category')
      .eq('deck_id', deck_id)
      .order('board')
      .order('card_name');

    if (cardsErr) {
      return {
        content: [{ type: 'text', text: cardsErr.message }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `${deck.name} — ${deck.format} — ${cards?.length ?? 0} unique cards.`,
        },
      ],
      structuredContent: { deck, cards: cards ?? [] },
    };
  },
});
