/**
 * /saved — the account's library: saved cards, collections, saved searches.
 *
 * Signed out this page explains the value and offers sign-in instead of
 * pretending to be empty.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useSavedCards } from '@/hooks/useSavedCards';
import { useCollections } from '@/hooks/useCollections';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { requestSignIn } from '@/lib/account';
import { applySeoMeta } from '@/lib/seo';
import { queryToSlug } from '@/lib/search-slug';
import { cardNameToSlug } from '@/lib/card-slug';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/core/utils';

type Tab = 'cards' | 'collections' | 'searches';

export default function SavedPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('cards');
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');

  const { savedCards, isLoading: cardsLoading, removeCard } = useSavedCards();
  const { collections, createCollection, deleteCollection } = useCollections();
  const { savedSearches, removeSearch } = useSavedSearches();

  useEffect(() => {
    return applySeoMeta({
      title: 'Saved cards and searches | OffMeta',
      description:
        'Your saved Magic: The Gathering cards, collections, and searches on OffMeta.',
      url: 'https://offmeta.app/saved',
      extraMeta: { robots: 'noindex, nofollow' },
    });
  }, []);

  const visibleCards = useMemo(
    () =>
      activeCollection
        ? savedCards.filter((c) => c.collectionIds.includes(activeCollection))
        : savedCards,
    [activeCollection, savedCards],
  );

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'cards', label: t('account.tabCards', 'Cards'), count: savedCards.length },
    {
      id: 'collections',
      label: t('account.tabCollections', 'Collections'),
      count: collections.length,
    },
    {
      id: 'searches',
      label: t('account.tabSearches', 'Searches'),
      count: savedSearches.length,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SkipLinks />
      <Header />
      <main id="main-content" className="container-main py-12">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
          {t('account.savedTitle', 'Saved')}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          {t(
            'account.savedSubtitle',
            'Cards, collections, and searches OffMeta remembers for you.',
          )}
        </p>

        {!user ? (
          <div className="mt-10 border border-border/60 p-8">
            <p className="max-w-md text-sm text-muted-foreground">
              {t(
                'account.signedOutSaved',
                'Sign in to keep cards and searches across devices. Search, guides, and card pages stay free without an account.',
              )}
            </p>
            <Button
              className="mt-6"
              onClick={() =>
                requestSignIn(
                  t('account.signInToSaveGeneric', 'Sign in to build your library.'),
                )
              }
            >
              {t('nav.signIn', 'Sign in')}
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap gap-2 border-b border-border/60">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={cn(
                    '-mb-px min-h-9 border-b-2 px-3 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors focus-ring',
                    tab === item.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                  aria-current={tab === item.id ? 'page' : undefined}
                >
                  {item.label} ({item.count})
                </button>
              ))}
            </div>

            {tab === 'cards' && (
              <section className="mt-8">
                {collections.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveCollection(null)}
                      className={cn(
                        'min-h-9 border border-border/60 px-3 text-xs uppercase tracking-wide focus-ring',
                        activeCollection === null && 'border-primary/60 text-primary',
                      )}
                    >
                      {t('account.allCards', 'All')}
                    </button>
                    {collections.map((collection) => (
                      <button
                        key={collection.id}
                        type="button"
                        onClick={() => setActiveCollection(collection.id)}
                        className={cn(
                          'min-h-9 border border-border/60 px-3 text-xs uppercase tracking-wide focus-ring',
                          activeCollection === collection.id &&
                            'border-primary/60 text-primary',
                        )}
                      >
                        {collection.name}
                      </button>
                    ))}
                  </div>
                )}

                {cardsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    {t('common.loading', 'Loading…')}
                  </p>
                ) : visibleCards.length === 0 ? (
                  <div className="border border-border/60 p-8">
                    <p className="text-sm text-muted-foreground">
                      {t(
                        'account.noSavedCards',
                        'No saved cards yet. Use the bookmark control on any search result.',
                      )}
                    </p>
                    <Link
                      to="/"
                      className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.2em] text-primary focus-ring"
                    >
                      {t('account.startSearching', 'Start searching')}
                    </Link>
                  </div>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {visibleCards.map((card) => (
                      <li
                        key={card.id}
                        className="flex items-center gap-3 border border-border/60 p-3"
                      >
                        {card.imageUrl && (
                          <img
                            src={card.imageUrl}
                            alt=""
                            loading="lazy"
                            width={48}
                            height={67}
                            className="h-16 w-12 flex-shrink-0 object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/cards/${cardNameToSlug(card.cardName)}`}
                            className="block truncate text-sm font-medium text-foreground hover:text-primary focus-ring"
                          >
                            {card.cardName}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">
                            {card.typeLine ?? ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            removeCard.mutate(card.oracleId, {
                              onSuccess: () =>
                                toast.success(
                                  t('account.cardRemoved', 'Removed from saved'),
                                ),
                            })
                          }
                          aria-label={t('account.removeFromSaved', 'Remove from saved')}
                          className="min-h-9 min-w-9 text-muted-foreground transition-colors hover:text-destructive focus-ring"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === 'collections' && (
              <section className="mt-8 max-w-xl">
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const name = newCollectionName.trim();
                    if (!name) return;
                    createCollection.mutate(
                      { name },
                      {
                        onSuccess: () => {
                          setNewCollectionName('');
                          toast.success(
                            t('account.collectionCreated', 'Collection created'),
                          );
                        },
                        onError: () =>
                          toast.error(
                            t('account.collectionFailed', "Couldn't create collection"),
                          ),
                      },
                    );
                  }}
                >
                  <Input
                    value={newCollectionName}
                    onChange={(event) => setNewCollectionName(event.target.value)}
                    maxLength={80}
                    placeholder={t(
                      'account.collectionNamePlaceholder',
                      'e.g. Nekusar upgrades',
                    )}
                    aria-label={t('account.collectionName', 'Collection name')}
                  />
                  <Button type="submit" disabled={createCollection.isPending}>
                    <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t('account.addCollection', 'Add')}
                  </Button>
                </form>

                <ul className="mt-6 space-y-2">
                  {collections.map((collection) => (
                    <li
                      key={collection.id}
                      className="flex items-center gap-3 border border-border/60 p-3"
                    >
                      <FolderOpen
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate text-sm text-foreground">
                        {collection.name}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {
                          savedCards.filter((c) =>
                            c.collectionIds.includes(collection.id),
                          ).length
                        }
                      </span>
                      {!collection.isDefault && (
                        <button
                          type="button"
                          onClick={() => deleteCollection.mutate(collection.id)}
                          aria-label={t('account.deleteCollection', 'Delete collection')}
                          className="min-h-9 min-w-9 text-muted-foreground transition-colors hover:text-destructive focus-ring"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                  {collections.length === 0 && (
                    <li className="text-sm text-muted-foreground">
                      {t(
                        'account.noCollections',
                        'No collections yet. Create one to group saved cards.',
                      )}
                    </li>
                  )}
                </ul>
              </section>
            )}

            {tab === 'searches' && (
              <section className="mt-8 max-w-2xl">
                {savedSearches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t(
                      'account.noSavedSearches',
                      'No saved searches yet. Save a search from the results page to re-run it later.',
                    )}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {savedSearches.map((search) => (
                      <li
                        key={search.id}
                        className="flex items-center gap-3 border border-border/60 p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/search/${queryToSlug(search.naturalQuery)}`}
                            className="block truncate text-sm text-foreground hover:text-primary focus-ring"
                          >
                            {search.naturalQuery}
                          </Link>
                          {search.scryfallQuery && (
                            <p className="truncate font-mono text-[11px] text-muted-foreground">
                              {search.scryfallQuery}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSearch.mutate(search.id)}
                          aria-label={t('account.removeSearch', 'Remove saved search')}
                          className="min-h-9 min-w-9 text-muted-foreground transition-colors hover:text-destructive focus-ring"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
