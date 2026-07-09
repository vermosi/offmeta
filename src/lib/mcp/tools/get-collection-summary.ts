import { createClient } from '@supabase/supabase-js';
import { defineTool, type ToolContext } from '@lovable.dev/mcp-js';

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
  name: 'get_collection_summary',
  title: 'Get collection summary',
  description:
    'Return summary stats for the signed-in user\'s Magic card collection: unique cards, total cards, estimated USD value.',
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: 'text', text: 'Not authenticated' }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.rpc('get_public_collection_stats', {
      target_user_id: ctx.getUserId(),
    });
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
          text: `Collection summary: ${JSON.stringify(data)}`,
        },
      ],
      structuredContent: { summary: data },
    };
  },
});
