import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, Shield, Bookmark, Clock } from 'lucide-react';
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
  isAdmin: boolean;
  onSignOut: () => void;
  onOpenAuth: () => void;
}

export function HeaderDesktopActions({
  user,
  displayName,
  avatarUrl,
  isAdmin,
  onSignOut,
  onOpenAuth,
}: HeaderDesktopActionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      <LanguageSelector />
      <ThemeToggle />

      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-7 w-7 overflow-hidden text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-ring"
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
              {t('nav.saved', 'Saved')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/history')}>
              <Clock className="h-4 w-4 mr-2" />
              {t('nav.history', 'History')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <Settings className="h-4 w-4 mr-2" />
              {t('nav.profileSettings')}
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate('/admin')}>
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
          className="hidden font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground focus-ring sm:block"
        >
          {t('nav.signIn')}
        </button>
      )}
    </div>
  );
}
