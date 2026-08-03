# supabase\functions\_shared\jobGuards.ts

- requireAdminJob · function · L4-L17 — async function requireAdminJob( req: Request, ): Promise< | { authorized: true; corsHeaders: Record<string, string> } | { authorized: false; response: Response } >
- requireServiceJob · function · L19-L31 — function requireServiceJob( req: Request, ): | { authorized: true; corsHeaders: Record<string, string> } | { authorized: false; response: Response }
- applyJobRateLimit · function · L33-L82 — async function applyJobRateLimit( req: Request, corsHeaders: Record<string, string>, options: { bucketSize: number; globalLimit: number; windowMs?: number; failOpen?: boolean; label?: string; }, ): Promise<{ allowed: true } | { allowed: false; response: Response }>
