/**
 * Header component with nav links, auth controls, and mobile hamburger menu.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogIn, LogOut, Bookmark, User, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { t } = useTranslation();
  const { user, displayName, avatarUrl, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const NAV_LINKS = [
    { label: t('header.howItWorks'), href: '#how-it-works' },
    { label: t('header.dailyPick'), href: '#daily-pick' },
    { label: t('header.faq'), href: '#faq' },
    { label: t('header.docs'), href: '/docs' },
    { label: t('header.guides'), href: '/guides' },
  ] as const;

  // Close mobile menu on escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileMenuOpen]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    if (href.startsWith('#')) {
      const id = href.slice(1);
      if (location.pathname === '/') {
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/' + href);
      }
    }
  };

  const mobileMenu = mobileMenuOpen
    ? createPortal(
        <div
          className="fixed inset-0 top-[57px] z-[60] bg-background md:hidden animate-fade-in"
          id="mobile-nav-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <nav
            className="container-main py-6 flex flex-col gap-1"
            aria-label="Mobile navigation"
          >
            {NAV_LINKS.map((link) =>
              link.href.startsWith('#') ? (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className={cn(
                    'w-full text-left px-4 py-3 text-base font-medium rounded-xl',
                    'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
                  )}
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'w-full px-4 py-3 text-base font-medium rounded-xl',
                    'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
                  )}
                >
                  {link.label}
                </Link>
              ),
            )}
            {user ? (
              <>
                <Link
                  to="/saved"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'w-full px-4 py-3 text-base font-medium rounded-xl',
                    'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
                  )}
                >
                  Saved Searches
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'w-full px-4 py-3 text-base font-medium rounded-xl',
                    'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
                  )}
                >
                  Profile Settings
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); signOut(); }}
                  className={cn(
                    'w-full text-left px-4 py-3 text-base font-medium rounded-xl',
                    'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
                  )}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}
                className={cn(
                  'w-full text-left px-4 py-3 text-base font-medium rounded-xl',
                  'text-foreground hover:bg-secondary/50 transition-colors focus-ring',
                )}
              >
                Sign In
              </button>
            )}
          </nav>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <header
        className="sticky top-0 z-50 safe-top border-b border-border/50 bg-background/80 backdrop-blur-xl"
        role="banner"
      >
        <div className="container-main py-3 sm:py-4 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="group flex items-center gap-2.5 min-h-0 focus-ring rounded-lg -ml-2 px-2 py-1"
            aria-label={t('header.home')}
          >
            <Logo variant="gradient" className="h-7 w-7 sm:h-8 sm:w-8 transition-transform duration-200 group-hover:scale-105" />
            <span className="text-lg font-semibold tracking-tight">OffMeta</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {NAV_LINKS.map((link) =>
              link.href.startsWith('#') ? (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 focus-ring"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 focus-ring"
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          {/* Right side: auth + theme toggle + hamburger */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSelector />
            <ThemeToggle />

            {/* Auth controls */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-8 w-8 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-semibold text-primary hover:bg-primary/20 transition-colors focus-ring overflow-hidden"
                    aria-label="User menu"
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    {displayName && <p className="text-sm font-medium truncate">{displayName}</p>}
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/saved')}>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Saved Searches
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 focus-ring"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </button>
            )}

            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus-ring"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? t('header.closeMenu') : t('header.openMenu')}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              data-testid="hamburger-button"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu rendered via portal to escape header stacking context */}
      {mobileMenu}

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
