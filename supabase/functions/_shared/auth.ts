/**
 * Shared authentication and security utilities for Supabase Edge Functions
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Dynamic ESM import helper that satisfies both Deno and frontend type-checkers
const importSupabase = (): Promise<{ createClient: (...args: unknown[]) => unknown }> =>
  import(/* @vite-ignore */ 'https://esm.sh/@supabase/supabase-js@2' as string) as Promise<{ createClient: (...args: unknown[]) => unknown }>;

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
  // Lovable Cloud may store the publishable key under a different name
  const supabasePublishableKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

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
  // Check both SUPABASE_ANON_KEY and SUPABASE_PUBLISHABLE_KEY since
  // Lovable Cloud may provision them separately.
  if (
    (supabaseAnonKey && token === supabaseAnonKey) ||
    (supabasePublishableKey && token === supabasePublishableKey)
  ) {
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
    const { createClient } = await importSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userClient: any = (createClient as Function)(supabaseUrl, supabaseAnonKey, {
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
  const endpoint = new URL(req.url).pathname.split('/').filter(Boolean).pop();

  const firstPartyOrigins = [
    'https://offmeta.app',
    'https://www.offmeta.app',
    'https://offmeta.lovable.app',
  ];
  const sensitiveEndpoints = new Set([
    'admin-analytics',
    'cleanup-logs',
    'warmup-cache',
  ]);

  const parseOrigins = (envValue?: string): string[] => {
    if (!envValue) return [];

    return envValue
      .split(',')
      .map((value) => value.trim().replace(/\/+$/, ''))
      .filter((value) => value.length > 0 && value !== '*');
  };

  const generalOrigins = parseOrigins(Deno.env.get('ALLOWED_ORIGINS'));
  const adminOrigins = parseOrigins(Deno.env.get('ALLOWED_ORIGINS_ADMIN'));

  const allowedOrigins = sensitiveEndpoints.has(endpoint ?? '')
    ? adminOrigins.length > 0
      ? adminOrigins
      : generalOrigins
    : generalOrigins;

  const effectiveOrigins =
    allowedOrigins.length > 0 ? allowedOrigins : firstPartyOrigins;

  const corsOrigin =
    origin && effectiveOrigins.includes(origin) ? origin : effectiveOrigins[0];

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
  const { createClient } = await importSupabase();
  const createFn = createClient as Function;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userClient: any = createFn(supabaseUrl, supabaseAnonKey, {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient: any = createFn(supabaseUrl, supabaseServiceKey);
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
