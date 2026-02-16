/**
 * Header component with nav links and mobile hamburger menu.
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/core/utils';

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Daily Pick', href: '#daily-pick' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Docs', href: '/docs' },
  { label: 'Guides', href: '/guides' },
] as const;

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
        // Already on home — just scroll
        const el = document.getElementById(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Navigate home with hash, then scroll after render
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
            aria-label="OffMeta - Home"
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

          {/* Right side: theme toggle + hamburger */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus-ring"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
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
    </>
  );
}
