import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

const AuthModal = lazy(() =>
  import('@/components/AuthModal').then((m) => ({ default: m.AuthModal })),
);
const NotificationBell = lazy(() =>
  import('@/components/NotificationBell').then((m) => ({
    default: m.NotificationBell,
  })),
);
const HeaderDesktopActions = lazy(() =>
  import('@/components/HeaderDesktopActions').then((m) => ({
    default: m.HeaderDesktopActions,
  })),
);

export function Header() {
  const { t } = useTranslation();
  const { user, displayName, avatarUrl, signOut } = useAuth();
  const { hasRole: isAdmin } = useUserRole('admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const CORE_LINKS = [
    { label: t('header.guides', 'Guides'), href: '/guides' },
    { label: t('nav.combos', 'Combos'), href: '/combos' },
    { label: t('header.about', 'About'), href: '/about' },
  ];

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setSavedCount(0);
      return () => {
        isMounted = false;
      };
    }

    supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => {
        if (isMounted) setSavedCount(count ?? 0);
      })
      .catch(() => {
        if (isMounted) setSavedCount(0);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        setIsScrolled((window.scrollY || 0) > 6);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useFocusTrap(mobileMenuRef, mobileMenuOpen);

  const mobileMenu = mobileMenuOpen
    ? createPortal(
        <div
          ref={mobileMenuRef}
          className="fixed inset-x-0 top-[57px] bottom-0 z-[60] bg-background md:hidden animate-fade-in overflow-y-auto overscroll-contain"
          id="mobile-nav-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <nav className="container-main py-6 flex flex-col gap-1 pb-safe" aria-label="Main navigation links">
            {CORE_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'w-full px-4 py-3 text-base font-medium rounded-xl',
                  'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
                )}
              >
                {link.label}
              </Link>
            ))}
            <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('nav.mobileCommunity', 'Community')}
            </p>
            <a
              href="https://discord.gg/9UEv6vrTD4"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'w-full px-4 py-3 text-base font-medium rounded-xl flex items-center gap-2',
                'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
              )}
            >
              {t('nav.discord', 'Discord')}
            </a>
            <div className="mt-4 pt-4 border-t border-border/50">
              {user ? (
                <>
                  <Link to="/saved" onClick={() => setMobileMenuOpen(false)} className="w-full px-4 py-3 text-base font-medium rounded-xl text-foreground hover:bg-secondary/50 transition-colors focus-ring">
                    {t('nav.savedSearches', 'Saved Searches')}
                  </Link>
                  <Link to="/collection" onClick={() => setMobileMenuOpen(false)} className="w-full px-4 py-3 text-base font-medium rounded-xl text-foreground hover:bg-secondary/50 transition-colors focus-ring">
                    {t('nav.collection', 'My Collection')}
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="w-full px-4 py-3 text-base font-medium rounded-xl text-foreground hover:bg-secondary/50 transition-colors focus-ring">
                    {t('nav.profileSettings')}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin/analytics" onClick={() => setMobileMenuOpen(false)} className="w-full px-4 py-3 text-base font-medium rounded-xl text-foreground hover:bg-secondary/50 transition-colors focus-ring">
                      {t('nav.adminDashboard')}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full text-left px-4 py-3 text-base font-medium rounded-xl text-foreground hover:bg-secondary/50 transition-colors focus-ring"
                  >
                    {t('nav.signOut')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-3 text-base font-medium rounded-xl text-foreground hover:bg-secondary/50 transition-colors focus-ring"
                >
                  {t('nav.signIn')}
                </button>
              )}
            </div>
          </nav>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 safe-top backdrop-blur-xl transition-colors',
          isScrolled
            ? 'border-b border-border/50 bg-background/80'
            : 'border-b border-transparent bg-background/40',
        )}
        role="banner"
      >
        <div className="container-main py-3 sm:py-4 flex items-center justify-between">
          <Link
            to="/"
            className="group flex items-center gap-2.5 min-h-0 focus-ring rounded-lg -ml-2 px-2 py-1"
            aria-label={t('header.home')}
          >
            <Logo variant="gradient" className="h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-200 group-hover:scale-105" />
            <span className="text-lg font-semibold tracking-tight">OffMeta</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5" aria-label="Main navigation">
            {CORE_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 focus-ring"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Suspense fallback={null}>
            <HeaderDesktopActions
              user={user}
              displayName={displayName}
              avatarUrl={avatarUrl}
              savedCount={savedCount}
              isAdmin={isAdmin}
              onSignOut={signOut}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          </Suspense>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus-ring"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? t('header.closeMenu') : t('header.openMenu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            data-testid="hamburger-button"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </header>

      {mobileMenu}

      {authModalOpen && (
        <Suspense fallback={null}>
          <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
        </Suspense>
      )}
    </>
  );
}
