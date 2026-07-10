import { getCorsHeaders, requireAdmin, requireServiceRole } from './auth.ts';
import { checkRateLimit, maybeCleanup } from './rateLimit.ts';

export async function requireAdminJob(
  req: Request,
): Promise<
  | { authorized: true; corsHeaders: Record<string, string> }
  | { authorized: false; response: Response }
> {
  const corsHeaders = getCorsHeaders(req);
  const adminCheck = await requireAdmin(req, corsHeaders);
  if (!adminCheck.authorized) {
    return adminCheck;
  }

  return { authorized: true, corsHeaders };
}

export function requireServiceJob(
  req: Request,
):
  | { authorized: true; corsHeaders: Record<string, string> }
  | { authorized: false; response: Response } {
  const corsHeaders = getCorsHeaders(req);
  const serviceCheck = requireServiceRole(req, corsHeaders);
  if (!serviceCheck.authorized) {
    return serviceCheck;
  }

  return { authorized: true, corsHeaders };
}

export async function applyJobRateLimit(
  req: Request,
  corsHeaders: Record<string, string>,
  options: {
    bucketSize: number;
    globalLimit: number;
    windowMs?: number;
    failOpen?: boolean;
    label?: string;
  },
): Promise<{ allowed: true } | { allowed: false; response: Response }> {
  maybeCleanup();
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter, statusCode } = await checkRateLimit(
    clientIp,
    undefined,
    options.bucketSize,
    options.globalLimit,
    options.windowMs,
    { failOpen: options.failOpen },
  );
  if (!allowed) {
    const status = statusCode ?? 429;
    const retryAfterSeconds = retryAfter ?? 1;
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error:
            status === 503
              ? `${options.label ?? 'Job'} temporarily unavailable. Please retry shortly.`
              : 'Rate limit exceeded',
          success: false,
          retryAfter: retryAfterSeconds,
        }),
        {
          status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfterSeconds),
          },
        },
      ),
    };
  }

  return { allowed: true };
}
