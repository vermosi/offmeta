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
  name: 'list_saved_searches',
  title: 'List saved searches',
  description:
    'List the signed-in user\'s saved natural-language searches with their translated Scryfall queries.',
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe('Default 25.'),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated' }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from('saved_searches')
      .select('id, natural_query, scryfall_query, label, created_at')
      .eq('user_id', ctx.getUserId())
      .order('created_at', { ascending: false })
      .limit(limit ?? 25);

    if (error) {
      return {
        content: [{ type: 'text', text: error.message }],
        isError: true,
      };
    }
    return {
      content: [
        { type: 'text', text: `Found ${data?.length ?? 0} saved search(es).` },
      ],
      structuredContent: { saved_searches: data ?? [] },
    };
  },
});
