/**
 * OAuth 2.1 consent screen for MCP clients (Claude, ChatGPT, etc.)
 * connecting to the app's MCP server as the signed-in user.
 *
 * Route: /.lovable/oauth/consent?authorization_id=...
 *
 * Unauthenticated visitors are shown an inline sign-in surface here
 * (email/password + Google). The redirect target is preserved on EVERY
 * sign-in method so the user always lands back on this consent page.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';

// The Supabase JS `auth.oauth` namespace is beta; type it locally rather than
// depending on typings in @supabase/supabase-js catching up.
type OAuthAuthorizationDetails = {
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string; logo_uri?: string; client_uri?: string };
  scope?: string;
};

type OAuthResult = {
  data: { redirect_url?: string; redirect_to?: string } | null;
  error: { message: string } | null;
};

type OAuthNamespace = {
  getAuthorizationDetails(
    id: string,
  ): Promise<{ data: OAuthAuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization(id: string): Promise<OAuthResult>;
  denyAuthorization(id: string): Promise<OAuthResult>;
};

function getOAuthApi(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const returnTo = window.location.pathname + window.location.search;

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [details, setDetails] = useState<OAuthAuthorizationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signInBusy, setSignInBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('Missing authorization_id in URL.');
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!active) return;
      if (!sess.session) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const { data, error: detailsError } =
        await getOAuthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (detailsError) {
        setError(detailsError.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  const handlePasswordSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSignInBusy(true);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setSignInBusy(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      // Reload the same consent URL so the authorization flow resumes.
      window.location.href = returnTo;
    },
    [email, password, returnTo],
  );

  const handleGoogleSignIn = useCallback(async () => {
    setError(null);
    setGoogleBusy(true);
    const redirectTo = `${window.location.origin}${returnTo}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    if (oauthError) {
      setGoogleBusy(false);
      setError(oauthError.message);
    }
  }, [returnTo]);

  const decide = useCallback(
    async (approve: boolean) => {
      setBusy(true);
      setError(null);
      const api = getOAuthApi();
      const { data, error: decisionError } = approve
        ? await api.approveAuthorization(authorizationId)
        : await api.denyAuthorization(authorizationId);
      if (decisionError) {
        setBusy(false);
        setError(decisionError.message);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        setError('No redirect returned by the authorization server.');
        return;
      }
      window.location.href = target;
    },
    [authorizationId],
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-foreground">
            Connect to OffMeta
          </h1>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {authed === null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {authed === false && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign in to authorize this MCP client to act as you on OffMeta.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={googleBusy}
              onClick={handleGoogleSignIn}
            >
              {googleBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Continue with Google'
              )}
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            <form onSubmit={handlePasswordSignIn} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="consent-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="consent-email"
                    type="email"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="consent-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="consent-password"
                    type="password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={signInBusy}>
                {signInBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sign in
              </Button>
            </form>
          </div>
        )}

        {authed === true && !details && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading authorization…
          </div>
        )}

        {authed === true && details && (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              <span className="font-medium">
                {details.client?.name ?? 'An application'}
              </span>{' '}
              is requesting access to act as you on OffMeta. It will be able to
              use the tools this app exposes (search cards, read your decks,
              saved searches, and collection).
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Deny
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={busy}
                onClick={() => decide(true)}
              >
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Approve
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
