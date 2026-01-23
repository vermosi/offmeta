/**
 * Shared authentication and security utilities for Supabase Edge Functions
 */

/**
 * Validates that the request has a valid authorization header.
 * For internal functions, we check for the service role key or a custom secret.
 */
export function validateAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const apiSecret = Deno.env.get('OFFMETA_API_SECRET');

  if (!authHeader) {
    return { authorized: false, error: 'Missing Authorization header' };
  }

  // Allow service role key
  if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
    return { authorized: true };
  }

  // Allow custom API secret
  if (apiSecret && authHeader === `Bearer ${apiSecret}`) {
    return { authorized: true };
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
