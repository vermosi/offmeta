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
  const apiKeyHeader = req.headers.get('apikey');
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
  // The anon key and user tokens are JWTs that contain 'supabase' as issuer
  // We check if the token looks like a valid JWT and has the right structure
  try {
    // Basic JWT validation: check if it has 3 parts and can be decoded
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]));
      // Check for Supabase JWT structure
      if (payload.iss === 'supabase' && payload.role && payload.exp) {
        // Verify token hasn't expired
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp > now) {
          return { authorized: true, role: payload.role };
        }
        return { authorized: false, error: 'Token expired' };
      }
    }
  } catch {
    // Invalid JWT format, continue to reject
  }

  // Also check if apikey header matches the token (Supabase client sends both)
  if (apiKeyHeader && token === apiKeyHeader) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.iss === 'supabase' && payload.role) {
          return { authorized: true, role: payload.role };
        }
      }
    } catch {
      // Invalid format
    }
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
      'authorization, x-client-info, apikey, content-type, x-request-id',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  };
}
