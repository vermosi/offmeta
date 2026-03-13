/**
 * Notification bell icon with dropdown for the header.
 * Shows unread count badge and notification list.
 * @module components/NotificationBell
 */

import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllRead,
} from '@/hooks/useNotifications';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';

export function NotificationBell() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: notifications = [] } = useNotifications();
  const unreadCount = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllRead();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label={t('notifications.label', 'Notifications')}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[1rem] rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold text-foreground">
            {t('notifications.title', 'Notifications')}
          </span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3" />
              {t('notifications.markAllRead', 'Mark all read')}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t('notifications.empty', 'No notifications yet')}
          </div>
        ) : (
          notifications.slice(0, 20).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn(
                'flex flex-col items-start gap-0.5 px-3 py-2 cursor-pointer',
                !n.read && 'bg-primary/5',
              )}
              onClick={() => !n.read && markRead.mutate(n.id)}
            >
              <div className="flex items-center gap-2 w-full">
                {!n.read && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
                <span className="text-sm font-medium text-foreground truncate flex-1">
                  {n.title}
                </span>
              </div>
              {n.body && (
                <span className="text-xs text-muted-foreground line-clamp-2 pl-4">
                  {n.body}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/60 pl-4">
                {new Date(n.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
