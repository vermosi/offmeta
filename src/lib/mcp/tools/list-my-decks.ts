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
  name: 'list_my_decks',
  title: 'List my decks',
  description:
    'List the signed-in user\'s decks (name, format, commander, card count, public/private, updated_at). Use get_deck for full card lists.',
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe('Default 25.'),
    format: z
      .string()
      .max(50)
      .optional()
      .describe('Filter to one format, e.g. "commander".'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, format }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated' }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from('decks')
      .select(
        'id, name, format, commander_name, color_identity, card_count, is_public, updated_at',
      )
      .eq('user_id', ctx.getUserId())
      .order('updated_at', { ascending: false })
      .limit(limit ?? 25);

    if (format) query = query.eq('format', format);

    const { data, error } = await query;
    if (error) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: `Found ${data?.length ?? 0} deck(s).`,
        },
      ],
      structuredContent: { decks: data ?? [] },
    };
  },
});
