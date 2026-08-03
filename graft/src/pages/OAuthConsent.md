# src\pages\OAuthConsent.tsx

- OAuthAuthorizationDetails · type · L23-L28 — type OAuthAuthorizationDetails = { redirect_url?: string; redirect_to?: string; client?: { name?: string; logo_uri?: string; client_uri?: string }; scope?: string; };
- OAuthResult · type · L30-L33 — type OAuthResult = { data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null; };
- OAuthNamespace · type · L35-L44 — type OAuthNamespace = { getAuthorizationDetails( id: string, ): Promise<{ data: OAuthAuthorizationDetails | null; error: { message: string } | null; }>; approveAuthorization(id: string): Promise<OAuthResult>; denyAuthorization(id: string): Promise<OAuthResult>; };
- getOAuthApi · function · L46-L48 — function getOAuthApi(): OAuthNamespace
- OAuthConsent · function · L50-L329 — function OAuthConsent()
