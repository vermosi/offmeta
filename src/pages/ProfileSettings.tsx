/**
 * Profile settings page — lets users update their display name and avatar.
 * Protected: redirects to home if not logged in.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, ArrowLeft, Camera, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SkipLinks } from '@/components/SkipLinks';
import { applySeoMeta } from '@/lib/seo';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ProfileSettings() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Per-route SEO + noindex (private route)
  useEffect(() => {
    return applySeoMeta({
      title: 'Profile Settings | OffMeta',
      description:
        'Update your OffMeta display name and avatar. Private account settings — sign-in required.',
      url: 'https://offmeta.app/profile',
      extraMeta: { robots: 'noindex, nofollow' },
    });
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate]);

  // Fetch current profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setIsLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) {
        setLoadError(error.message);
      } else if (data) {
        setDisplayName(data.display_name || '');
        setAvatarUrl(data.avatar_url || null);
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    e.target.value = '';

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t('profile.errorType'));
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error(t('profile.errorSize'));
      return;
    }

    setIsUploadingAvatar(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error(t('profile.errorUpload'));
      setIsUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      toast.error(t('profile.errorUpload'));
    } else {
      setAvatarUrl(publicUrl);
      toast.success(t('profile.avatarUpdated'));
      await refreshProfile();
    }
    setIsUploadingAvatar(false);
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;
    setIsUploadingAvatar(true);

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id);

    if (error) {
      toast.error(t('profile.errorRemove'));
    } else {
      setAvatarUrl(null);
      toast.success(t('profile.avatarRemoved'));
      await refreshProfile();
    }
    setIsUploadingAvatar(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmed = displayName.trim();
    if (trimmed.length > 100) {
      toast.error(t('profile.errorNameLength'));
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmed || null })
      .eq('id', user.id);

    if (error) {
      toast.error(t('profile.errorUpdate'));
    } else {
      toast.success(t('profile.updated'));
      await refreshProfile();
    }
    setIsSaving(false);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkipLinks />
      <Header />

      <main id="main-content" className="container-main flex-1 py-12">
        <div className="max-w-2xl">
          <Link
            to="/"
            className="inline-flex min-h-9 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground focus-ring"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('profile.back')}
          </Link>

          <h1 className="mt-6 font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            {t('profile.title')}
          </h1>
          <p className="mt-2 font-mono text-xs tracking-wide text-muted-foreground">
            {user.email}
          </p>

          {loadError ? (
            <div className="mt-10 space-y-3 border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
              <p>Failed to load your profile settings: {loadError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-10 divide-y divide-border/60 border-y border-border/60">
              {/* Avatar section */}
              <section className="py-8">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {t('profile.avatar')}
                </h2>
                <div className="mt-5 flex flex-wrap items-center gap-5">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden border border-border/60 bg-muted/30">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={t('profile.avatar')}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Camera className="mr-1.5 h-4 w-4" />
                      {avatarUrl
                        ? t('profile.avatarChange')
                        : t('profile.avatarUpload')}
                    </Button>
                    {avatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={isUploadingAvatar}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        {t('profile.avatarRemove')}
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    aria-label={t('profile.avatar')}
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {t('profile.avatarHint')}
                </p>
              </section>

              {/* Display name form */}
              <section className="py-8">
                <form onSubmit={handleSave} className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="display-name"
                      className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      {t('profile.displayName')}
                    </Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('profile.displayNamePlaceholder')}
                      maxLength={100}
                    />
                    <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
                      {displayName.trim().length}/100 {t('profile.characters')}
                    </p>
                  </div>

                  <Button type="submit" disabled={isSaving} className="sm:w-auto">
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('profile.saving')}
                      </>
                    ) : (
                      t('profile.saveChanges')
                    )}
                  </Button>
                </form>
              </section>

              {/* Account shortcuts */}
              <section className="py-8">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {t('account.shortcuts', 'Your library')}
                </h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/saved"
                    className="min-h-9 border border-border/60 px-3 py-2 text-xs uppercase tracking-wide text-foreground transition-colors hover:border-primary/60 hover:text-primary focus-ring"
                  >
                    {t('account.savedTitle', 'Saved')}
                  </Link>
                  <Link
                    to="/history"
                    className="min-h-9 border border-border/60 px-3 py-2 text-xs uppercase tracking-wide text-foreground transition-colors hover:border-primary/60 hover:text-primary focus-ring"
                  >
                    {t('account.historyTitle', 'History')}
                  </Link>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
