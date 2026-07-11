import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Bookmark, User, Settings, Shield, Package } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSelector } from '@/components/LanguageSelector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';

interface HeaderDesktopActionsProps {
  user: {
    email?: string | null;
  } | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  savedCount: number;
  isAdmin: boolean;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export function HeaderDesktopActions({
  user,
  displayName,
  avatarUrl,
  savedCount,
  isAdmin,
  onSignOut,
  onOpenAuth,
}: HeaderDesktopActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <a
        href="https://discord.gg/9UEv6vrTD4"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus-ring"
        aria-label={t('header.discordLabel', 'Join our Discord (opens in new tab)')}
      >
        <svg className="h-4 w-4" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
      </a>
      <LanguageSelector />
      <ThemeToggle />

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 rounded-full bg-primary/10 border border-border flex items-center justify-center text-xs font-semibold text-primary hover:bg-primary/20 transition-colors focus-ring overflow-hidden"
              aria-label={t('nav.userMenu')}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                displayName?.charAt(0).toUpperCase() ||
                user.email?.charAt(0).toUpperCase() || <User className="h-4 w-4" />
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
              {t('nav.savedSearches', 'Saved Searches')}
              {savedCount > 0 && (
                <span className="ml-auto text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                  {savedCount}
                </span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/collection')}>
              <Package className="h-4 w-4 mr-2" />
              {t('nav.collection', 'My Collection')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <Settings className="h-4 w-4 mr-2" />
              {t('nav.profileSettings')}
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate('/admin/analytics')}>
                <Shield className="h-4 w-4 mr-2" />
                {t('nav.adminDashboard')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('nav.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <button
          type="button"
          onClick={onOpenAuth}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50 focus-ring"
        >
          <LogIn className="h-4 w-4" />
          {t('nav.signIn')}
        </button>
      )}
    </div>
  );
}
