/**
 * Public user profile page.
 * Shows published decks, collection stats, and user info.
 * Accessible at /user/:userId
 * @module pages/PublicProfile
 */

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/badge';

import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { User, Package, Layers, ArrowLeft, Crown, ExternalLink } from 'lucide-react';
import { ManaCost } from '@/components/ManaSymbol';
import { FORMAT_LABELS } from '@/data/formats';
import { SkipLinks } from '@/components/SkipLinks';

interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface PublicDeck {
  id: string;
  name: string;
  format: string;
  commander_name: string | null;
  color_identity: string[];
  card_count: number;
  created_at: string;
  updated_at: string;
  description: string | null;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as PublicProfile;
    },
    enabled: !!userId,
  });

  const { data: decks = [], isLoading: decksLoading } = useQuery({
    queryKey: ['public-profile-decks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('id, name, format, commander_name, color_identity, card_count, created_at, updated_at, description')
        .eq('user_id', userId!)
        .eq('is_public', true)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as PublicDeck[];
    },
    enabled: !!userId,
  });

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return '';
    return new Date(profile.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    });
  }, [profile]);

  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkipLinks />
      <Header />
      <main id="main-content" className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('publicProfile.back')}
        </Link>

        {/* Profile Header */}
        {profileLoading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ) : profile ? (
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || t('publicProfile.userAvatar')}
                className="h-16 w-16 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                {profile.display_name || t('publicProfile.anonymousUser')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('publicProfile.memberSince').replace('{date}', memberSince || '')}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-16">
            <User className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground mt-2">{t('publicProfile.userNotFound')}</p>
          </div>
        )}

        {/* Stats */}
        {profile && (
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Layers className="h-4 w-4" />
              {decks.length === 1
                ? t('publicProfile.publicDeckCount').replace('{count}', '1')
                : t('publicProfile.publicDeckCountPlural').replace('{count}', String(decks.length))}
            </div>
          </div>
        )}

        {/* Public Decks */}
        {decksLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : decks.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Package className="h-4 w-4" />
              {t('publicProfile.publishedDecks')}
            </h2>
            {decks.map((deck) => (
              <Link
                key={deck.id}
                to={`/deck/${deck.id}`}
                className="block p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate">
                        {deck.name}
                      </h3>
                      <Badge variant="outline" size="sm">
                        {FORMAT_LABELS[deck.format] || deck.format}
                      </Badge>
                    </div>
                    {deck.commander_name && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <Crown className="h-3.5 w-3.5" />
                        {deck.commander_name}
                      </div>
                    )}
                    {deck.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {deck.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deck.color_identity.length > 0 && (
                      <ManaCost cost={deck.color_identity.map((c) => `{${c}}`).join('')} />
                    )}
                    <span className="text-xs text-muted-foreground">
                      {deck.card_count} {t('deck.cards')}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : profile ? (
          <div className="text-center py-12">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground mt-2 text-sm">
              No public decks yet.
            </p>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
