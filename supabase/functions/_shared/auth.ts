// deno-lint-ignore-file no-explicit-any
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
export function validateAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiSecret = Deno.env.get('OFFMETA_API_SECRET');

  // If no auth header is present, reject
  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  // Allow service role key
  if (serviceRoleKey && token === serviceRoleKey) {
    return { authorized: true, role: 'service' };
  }

  // Allow custom API secret
  if (apiSecret && token === apiSecret) {
    return { authorized: true, role: 'api' };
  }

  // Allow valid Supabase JWTs (anon key or user tokens)
  // Supabase anon/service keys have iss='supabase'
  // Supabase user JWTs have iss='https://<project>.supabase.co/auth/v1'
  // Both are valid — we accept any well-formed JWT with an exp and role
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      const isSupabaseToken =
        payload.iss === 'supabase' ||
        (typeof payload.iss === 'string' && payload.iss.includes('supabase'));
      if (isSupabaseToken && payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp > now) {
          return { authorized: true, role: payload.role ?? 'authenticated' };
        }
        return { authorized: false, error: 'Token expired' };
      }
    }
  } catch {
    // Invalid JWT format, fall through to reject
  }

  return { authorized: false, error: 'Invalid Authorization token' };
}

/**
 * Standard CORS headers restricted to specific domains if provided.
 */
export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  const allowedOrigins = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || ['*'];

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
