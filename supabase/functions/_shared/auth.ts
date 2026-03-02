/**
 * Shared authentication and security utilities for Supabase Edge Functions
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

/**
 * Validates that the request has a valid authorization header.
 * For public edge functions, we accept:
 * - The anon key (for unauthenticated public access)
 * - The service role key (for admin access)
 * - A valid Supabase JWT (for authenticated users)
 * - Custom API secret (for internal integrations)
 */
type AuthResult =
  | { authorized: true; role: string }
  | { authorized: false; error: string };

export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiSecret = Deno.env.get('OFFMETA_API_SECRET');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  // If no auth header is present, reject
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Invalid Authorization token' };
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return { authorized: false, error: 'Invalid Authorization token' };
  }

  // Allow machine auth tokens in controlled contexts.
  if (serviceRoleKey && token === serviceRoleKey) {
    return { authorized: true, role: 'service' };
  }

  // Allow explicit public anon key for unauthenticated end-user access.
  if (supabaseAnonKey && token === supabaseAnonKey) {
    return { authorized: true, role: 'anon' };
  }

  // Allow custom API secret
  if (apiSecret && token === apiSecret) {
    return { authorized: true, role: 'api' };
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return { authorized: false, error: 'Auth verification unavailable' };
  }

  try {
    // @ts-expect-error: Deno esm.sh import
    const { createClient } =
      await import('https://esm.sh/@supabase/supabase-js@2');
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error,
    } = await userClient.auth.getUser(token);

    if (error || !user) {
      return { authorized: false, error: 'Invalid Authorization token' };
    }

    return { authorized: true, role: 'authenticated' };
  } catch {
    return { authorized: false, error: 'Invalid Authorization token' };
  }
}

/**
 * Standard CORS headers restricted to specific domains if provided.
 */
export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  const allowedOrigins = (
    Deno.env.get('ALLOWED_ORIGINS')?.split(',') || ['*']
  ).map((o) => o.trim().replace(/\/+$/, ''));

  let corsOrigin = '*';
  if (
    origin &&
    (allowedOrigins.includes('*') || allowedOrigins.includes(origin))
  ) {
    corsOrigin = origin;
  } else if (!allowedOrigins.includes('*')) {
    corsOrigin = allowedOrigins[0]; // Fallback to first allowed origin
  }

  return {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-request-id, x-session-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}

/**
 * Verifies the caller is an authenticated user with the 'admin' role.
 * Uses getUser() + user_roles query (same pattern as admin-analytics).
 *
 * Returns `{ authorized: true, userId }` on success, or
 * `{ authorized: false, response }` with a ready-to-return Response on failure.
 */
export async function requireAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<
  | { authorized: true; userId: string }
  | { authorized: false; response: Response }
> {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 401, headers },
      ),
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: 'Server misconfigured', success: false }),
        { status: 500, headers },
      ),
    };
  }

  // @ts-expect-error: Deno esm.sh import
  const { createClient } =
    await import('https://esm.sh/@supabase/supabase-js@2');

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({ error: 'Unauthorized', success: false }),
        { status: 401, headers },
      ),
    };
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) {
    return {
      authorized: false,
      response: new Response(
        JSON.stringify({
          error: 'Forbidden: admin role required',
          success: false,
        }),
        { status: 403, headers },
      ),
    };
  }

  return { authorized: true, userId: user.id };
}
