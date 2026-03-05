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

type JwtPayload = {
  iss?: string;
  ref?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const decoded = globalThis.atob(padded);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as JwtPayload;
  } catch {
    return null;
  }
}

function extractProjectRef(supabaseUrl?: string): string | null {
  if (!supabaseUrl) return null;

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split('.')[0];
    return projectRef || null;
  } catch {
    return null;
  }
}

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

  // Allow valid project anon JWT used by browser clients.
  // This avoids calling /auth/v1/user for anon tokens (which fails due no `sub` claim).
  const apikeyHeader = req.headers.get('apikey')?.trim() ?? '';
  const jwtPayload = decodeJwtPayload(token);
  const projectRef = extractProjectRef(supabaseUrl);
  const tokenExpMs =
    typeof jwtPayload?.exp === 'number' ? jwtPayload.exp * 1000 : null;

  const isProjectAnonJwt =
    !!jwtPayload &&
    jwtPayload.iss === 'supabase' &&
    jwtPayload.role === 'anon' &&
    typeof jwtPayload.ref === 'string' &&
    (projectRef === null || jwtPayload.ref === projectRef) &&
    tokenExpMs !== null &&
    tokenExpMs > Date.now() &&
    apikeyHeader.length > 0 &&
    apikeyHeader === token;

  if (isProjectAnonJwt) {
    return { authorized: true, role: 'anon' };
  }

  // Allow explicit public anon/publishable key for unauthenticated access.
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type
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

  // Also allow Lovable preview/development domains (strict pattern matching)
  const isLovablePreview = (() => {
    if (!origin) return false;
    try {
      const { hostname } = new URL(origin);
      // Match UUID-based preview domains: <id>.lovableproject.com or <id>-preview--<id>.lovable.app
      return (
        hostname.endsWith('.lovableproject.com') ||
        /^[a-z0-9-]+-preview--[a-z0-9-]+\.lovable\.app$/.test(hostname) ||
        hostname === 'localhost' ||
        hostname.startsWith('localhost:')
      );
    } catch {
      return false;
    }
  })();

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

  // Allow Lovable preview domains for non-sensitive endpoints
  const corsOrigin =
    origin && effectiveOrigins.includes(origin)
      ? origin
      : isLovablePreview && !sensitiveEndpoints.has(endpoint ?? '')
        ? origin!
        : effectiveOrigins[0];

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
/**
 * Best-effort logging of auth failures to `analytics_events` for admin monitoring.
 * Uses the service role key so inserts bypass RLS.
 */
export async function logAuthFailure(
  req: Request,
  error: string,
  functionName: string,
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) return;

    const { createClient } = await importSupabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-function-type
    const client: any = (createClient as Function)(supabaseUrl, serviceKey);

    const origin = req.headers.get('Origin') ?? 'unknown';
    const ua = req.headers.get('User-Agent') ?? '';

    await client.from('analytics_events').insert({
      event_type: 'auth_failure',
      event_data: {
        error,
        origin,
        user_agent_prefix: ua.slice(0, 100),
        function_name: functionName,
      },
    });
  } catch {
    // best-effort, don't block response
  }
}

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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
