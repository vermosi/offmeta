/**
 * /go — Discord click-through bridge.
 *
 * Discord slash-command result links point here so the URL shown to users is
 * always offmeta.app, never the Supabase endpoint. This page verifies the
 * signed payload with the discord-bot edge function and immediately redirects
 * to the real search results.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { env } from '@/lib/core/env';
import { AlertTriangle, Loader2 } from 'lucide-react';

const ERROR_COPY: Record<string, { title: string; detail: string }> = {

  malformed: {
    title: 'This link is incomplete',
    detail: 'Run the /offmeta command again in Discord to get a fresh link.',
  },
  invalid_signature: {
    title: 'This link could not be verified',
    detail:
      'It looks modified or was not created by OffMeta. Run /offmeta again in Discord for a valid link.',
  },
  expired: {
    title: 'This link has expired',
    detail:
      'Search links stay valid for 7 days. Run /offmeta again in Discord.',
  },
};

export default function GoRedirect(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<{
    title: string;
    detail: string;
    outcome?: string;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function resolve() {
      const q = searchParams.get('q');
      const a = searchParams.get('a');
      const g = searchParams.get('g');
      const x = searchParams.get('x');
      const s = searchParams.get('s');

      if (!q || !s) {
        setError(ERROR_COPY.malformed);
        return;
      }

      const params = new URLSearchParams({ q, s });
      if (a) params.set('a', a);
      if (g) params.set('g', g);
      if (x) params.set('x', x);

      const functionUrl = `${env.VITE_SUPABASE_URL}/functions/v1/discord-bot?${params.toString()}`;

      try {
        const response = await fetch(functionUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
          },
        });

        const data = (await response.json()) as {
          ok?: boolean;
          redirectUrl?: string;
          outcome?: string;
          title?: string;
          detail?: string;
        };

        if (data.ok && data.redirectUrl) {
          window.location.replace(data.redirectUrl);
          return;
        }

        const known = data.outcome ? ERROR_COPY[data.outcome] : null;
        setError({
          title: data.title || known?.title || 'Unable to open this link',
          detail:
            data.detail ||
            known?.detail ||
            'Something went wrong while verifying the link.',
          outcome: data.outcome,
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError({
          title: 'Unable to open this link',
          detail:
            'The verification request failed. Please try the search directly on offmeta.app.',
        });
      }
    }

    resolve();

    return () => controller.abort();
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-destructive/10 p-3 shrink-0">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {error.title}
              </h1>
              <p className="mt-2 text-muted-foreground">{error.detail}</p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Go to OffMeta
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Opening your search results…</p>
    </div>
  );
}
