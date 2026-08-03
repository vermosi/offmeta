# src\lib\security\authentication.test.ts

- validateAuth · function · L18-L61 — function validateAuth(authHeader: string | null): { authorized: boolean; error?: string; role?: string; }
- checkReplay · function · L164-L170 — function checkReplay(tokenId: string): boolean
- checkReplay · function · L190-L194 — function checkReplay(jti: string): boolean
- checkRolePermission · function · L207-L221 — function checkRolePermission( userRole: string, requiredRole: string, ): boolean
- validateApiKey · function · L273-L279 — function validateApiKey( providedKey: string | null, validKeys: Set<string>, ): boolean
- generateSessionId · function · L364-L366 — function generateSessionId(): string
- isValidSessionId · function · L389-L403 — function isValidSessionId(id: string): boolean
- AuthResult · type · L418-L420 — type AuthResult = | { authorized: true; role: string } | { authorized: false; error: string };
- validateAuthWithVerifier · function · L422-L458 — async function validateAuthWithVerifier( authHeader: string | null, verifyUserToken: (token: string) => Promise<{ id: string } | null>, config: { serviceRoleKey?: string; apiSecret?: string; anonKey?: string }, ): Promise<AuthResult>
