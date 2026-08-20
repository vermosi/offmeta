/**
 * /history — recent searches.
 *
 * Signed in: server-backed history that follows the user across devices.
 * Signed out: the local device history, with a nudge to sign in.
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useAccountSearchHistory } from '@/hooks/useAccountSearchHistory';
import { requestSignIn } from '@/lib/account';
import { applySeoMeta } from '@/lib/seo';
import { queryToSlug } from '@/lib/search-slug';
import { useTranslation } from '@/lib/i18n';

export default function HistoryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const localHistory = useSearchHistory();
  const remoteHistory = useAccountSearchHistory();

  useEffect(() => {
    return applySeoMeta({
      title: 'Search history | OffMeta',
      description: 'Your recent Magic: The Gathering searches on OffMeta.',
      url: 'https://offmeta.app/history',
      extraMeta: { robots: 'noindex, nofollow' },
    });
  }, []);

  const entries = user
    ? remoteHistory.entries.map((entry) => ({
        id: entry.id,
        query: entry.rawQuery,
        meta: t('account.runCount', '{{count}} runs').replace(
          '{{count}}',
          String(entry.runCount),
        ),
      }))
    : localHistory.history.map((query) => ({ id: query, query, meta: '' }));

  const handleRemove = (id: string) => {
    if (user) remoteHistory.removeEntry.mutate(id);
    else localHistory.removeFromHistory(id);
  };

  const handleClear = () => {
    if (user) remoteHistory.clearHistory.mutate();
    else localHistory.clearHistory();
  };

  return (
    <div className="min-h-screen min-h-dvh bg-background">
      <SkipLinks />
      <Header />
      <main id="main-content" className="container-main py-12">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
          {t('account.historyTitle', 'Search history')}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {user
            ? t(
                'account.historySubtitleSignedIn',
                'Your recent searches, synced to your account.',
              )
            : t(
                'account.historySubtitleSignedOut',
                'Recent searches on this device. Sign in to keep them everywhere.',
              )}
        </p>

        {!user && (
          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              requestSignIn(
                t('account.signInForHistory', 'Sign in to sync your search history.'),
              )
            }
          >
            {t('nav.signIn', 'Sign in')}
          </Button>
        )}

        {entries.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            {t('account.noHistory', 'No searches yet.')}
          </p>
        ) : (
          <>
            <ul className="mt-8 max-w-2xl space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 border border-border/60 p-3"
                >
                  <Link
                    to={`/search/${queryToSlug(entry.query)}`}
                    className="min-w-0 flex-1 truncate text-sm text-foreground hover:text-primary focus-ring"
                  >
                    {entry.query}
                  </Link>
                  {entry.meta && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {entry.meta}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.id)}
                    aria-label={t('account.removeHistoryEntry', 'Remove from history')}
                    className="min-h-9 min-w-9 text-muted-foreground transition-colors hover:text-destructive focus-ring"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" className="mt-6" onClick={handleClear}>
              {t('account.clearHistory', 'Clear history')}
            </Button>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
