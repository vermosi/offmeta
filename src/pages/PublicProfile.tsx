/**
 * Public user profile page.
 * Shows basic public user info. Accessible at /user/:userId
 * @module pages/PublicProfile
 */

import { useEffect, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useParams, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { User, ArrowLeft } from 'lucide-react';
import { SkipLinks } from '@/components/SkipLinks';
import { applySeoMeta } from '@/lib/seo';

interface PublicProfileData {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .eq('id', userId!)
        .single();
      if (error) throw error;
      return data as PublicProfileData;
    },
    enabled: !!userId,
    retry: false,
  });

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return '';
    return new Date(profile.created_at).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
    });
  }, [profile]);

  const profileLoadError =
    profileError instanceof Error ? profileError.message : null;

  useEffect(() => {
    if (!userId) return;
    const displayName = profile?.display_name?.trim() || 'MTG player';
    return applySeoMeta({
      title: `${displayName} on OffMeta`,
      description: `View ${displayName}'s public profile on OffMeta, the natural language Magic: The Gathering card search engine.`,
      url: `https://offmeta.app/user/${userId}`,
      image: profile?.avatar_url || 'https://offmeta.app/og-image.png',
      type: 'profile',
    });
  }, [userId, profile?.display_name, profile?.avatar_url]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkipLinks />
      <Header />
      <main
        id="main-content"
        className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-6"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('publicProfile.back')}
        </Link>

        {profileLoading ? (
          <div className="flex items-center gap-5">
            <Skeleton className="h-16 w-16" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ) : profile ? (
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || t('publicProfile.userAvatar')}
                className="h-16 w-16 border border-border/60 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center border border-border/60 bg-muted/30">
                <User className="h-7 w-7 text-muted-foreground" />
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
                {profile.display_name || t('publicProfile.anonymousUser')}
              </h1>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {t('publicProfile.memberSince').replace(
                  '{date}',
                  memberSince || '',
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="border-y border-border/60 py-16 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {t('publicProfile.userNotFound')}
            </p>
          </div>
        )}

        {profileLoadError && (
          <div className="space-y-3 border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
            <p>Failed to load this profile: {profileLoadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetchProfile()}
            >
              Retry
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
