import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { cn } from '@/lib/core/utils';
import {
  NAV_BRAND_CLASS,
  NAV_LINK_CLASS,
  NAV_LINK_GAP_CLASS,
  NAV_LOGO_CLASS,
  NAV_WORDMARK_CLASS,
} from '@/lib/ui/nav-tokens';
import { useTranslation } from '@/lib/i18n';
import { onSignInRequested } from '@/lib/account';

const AuthModal = lazy(() =>
  import('@/components/AuthModal').then((m) => ({ default: m.AuthModal })),
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
  const [authReason, setAuthReason] = useState<string | undefined>(undefined);
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Save controls anywhere in the app can ask for the sign-in modal.
  useEffect(
    () =>
      onSignInRequested(({ reason }) => {
        setAuthReason(reason);
        setAuthModalOpen(true);
      }),
    [],
  );

  const CORE_LINKS = [
    { label: t('header.guides', 'Guides'), href: '/guides' },
    { label: t('nav.combos', 'Combos'), href: '/combos' },
    { label: t('nav.deckCheck', 'Deck Check'), href: '/deck-check' },
    { label: t('header.about', 'About'), href: '/about' },
  ];

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
                  'w-full border-b border-border/40 px-1 py-4 font-display text-base font-bold uppercase tracking-tight',
                  'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
                )}
              >
                {link.label}
              </Link>
            ))}
            <p className="px-1 pb-1 pt-6 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('nav.mobileCommunity', 'Community')}
            </p>
            <a
              href="https://discord.gg/9UEv6vrTD4"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex w-full items-center gap-2 border-b border-border/40 px-1 py-4 font-display text-base font-bold uppercase tracking-tight',
                'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
              )}
            >
              {t('nav.discord', 'Discord')}
            </a>
            <div className="mt-4 pt-4 border-t border-border/50">
              {user ? (
                <>
                  <Link to="/saved" onClick={() => setMobileMenuOpen(false)} className="w-full border-b border-border/40 px-1 py-4 text-base text-foreground transition-colors hover:text-accent focus-ring">
                    {t('nav.saved', 'Saved')}
                  </Link>
                  <Link to="/history" onClick={() => setMobileMenuOpen(false)} className="w-full border-b border-border/40 px-1 py-4 text-base text-foreground transition-colors hover:text-accent focus-ring">
                    {t('nav.history', 'History')}
                  </Link>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="w-full border-b border-border/40 px-1 py-4 text-base text-foreground transition-colors hover:text-accent focus-ring">
                    {t('nav.profileSettings')}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin/analytics" onClick={() => setMobileMenuOpen(false)} className="w-full border-b border-border/40 px-1 py-4 text-base text-foreground transition-colors hover:text-accent focus-ring">
                      {t('nav.adminDashboard')}
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full border-b border-border/40 px-1 py-4 text-left text-base text-foreground transition-colors hover:text-accent focus-ring"
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
                  className="w-full border-b border-border/40 px-1 py-4 text-left text-base text-foreground transition-colors hover:text-accent focus-ring"
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
          'sticky top-0 z-50 safe-top border-b transition-colors',
          isScrolled
            ? 'border-border/60 bg-background/90 backdrop-blur'
            : 'border-border/30 bg-transparent',
        )}
        role="banner"
      >
        <div className="container-main flex h-14 items-center justify-between gap-6">
          <Link
            to="/"
            className={cn(NAV_BRAND_CLASS, '-ml-2 min-h-0 px-2 py-1')}
            aria-label={t('header.home')}
          >
            <Logo variant="gradient" className={NAV_LOGO_CLASS} />
            <span className={NAV_WORDMARK_CLASS}>
              OffMeta
            </span>
          </Link>

          <nav className={cn('ml-auto hidden items-center md:flex', NAV_LINK_GAP_CLASS)} aria-label="Main navigation">
            {CORE_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={NAV_LINK_CLASS}
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
              isAdmin={isAdmin}
              onSignOut={signOut}
              onOpenAuth={() => setAuthModalOpen(true)}
            />
          </Suspense>

          <button
            type="button"
            className="-mr-2 p-2 text-muted-foreground transition-colors hover:text-foreground focus-ring md:hidden"
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
          <AuthModal
            open={authModalOpen}
            onOpenChange={(open) => {
              setAuthModalOpen(open);
              if (!open) setAuthReason(undefined);
            }}
            description={authReason}
          />
        </Suspense>
      )}
    </>
  );
}
