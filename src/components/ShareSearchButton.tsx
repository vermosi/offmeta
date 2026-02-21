/**
 * Share search button — copies the current URL (with ?q= and filters) to clipboard.
 */

import { useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export function ShareSearchButton() {
  const { t } = useTranslation();

  const handleShare = useCallback(async () => {
    const url = window.location.href;

    // Use native share on mobile if available
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        // User cancelled or error — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('share.copied', 'Link copied!'), {
        description: t('share.copiedDesc', 'Share it on Reddit, Discord, or anywhere.'),
      });
    } catch {
      toast.error(t('share.copyFailed', 'Could not copy link'));
    }
  }, [t]);

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1 py-1 px-2.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      aria-label={t('share.label', 'Share this search')}
    >
      <Share2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{t('share.button', 'Share')}</span>
    </button>
  );
}
