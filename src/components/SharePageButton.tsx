/**
 * Generic page-share button — uses native Web Share API with clipboard fallback.
 * Used on card pages, combo results, and other pages where direct sharing
 * (Discord, Reddit, group chats) is the dominant social distribution channel.
 *
 * Differs from ShareSearchButton in that it accepts a custom title/text payload
 * rather than always sharing the current document.title.
 */

import { useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface SharePageButtonProps {
  /** Title used by native share sheet (falls back to document.title). */
  title?: string;
  /** Free-form text prepended to the URL when sharing or copying. */
  text?: string;
  /** URL to share — defaults to window.location.href. */
  url?: string;
  /** Visual style: 'inline' (toolbar chip) or 'pill' (standalone CTA). */
  variant?: 'inline' | 'pill';
  /** Optional override for the visible label. */
  label?: string;
  className?: string;
}

export function SharePageButton({
  title,
  text,
  url,
  variant = 'inline',
  label,
  className,
}: SharePageButtonProps) {
  const { t } = useTranslation();

  const handleShare = useCallback(async () => {
    const shareUrl = url ?? window.location.href;
    const shareTitle = title ?? document.title;
    const shareText = text ?? shareTitle;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`.trim());
      toast.success(t('share.copied', 'Link copied!'), {
        description: t('share.copiedDesc', 'Share it on Reddit, Discord, or anywhere.'),
      });
    } catch {
      toast.error(t('share.copyFailed', 'Could not copy link'));
    }
  }, [url, title, text, t]);

  const baseClasses =
    variant === 'pill'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-card/50 hover:bg-primary/10 hover:border-primary/30 text-sm text-muted-foreground hover:text-foreground transition-all'
      : 'flex items-center gap-1 py-1 px-2.5 text-xs rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors';

  return (
    <button
      onClick={handleShare}
      className={`${baseClasses} ${className ?? ''}`.trim()}
      aria-label={t('share.label', 'Share')}
    >
      <Share2 className={variant === 'pill' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      <span>{label ?? t('share.button', 'Share')}</span>
    </button>
  );
}
