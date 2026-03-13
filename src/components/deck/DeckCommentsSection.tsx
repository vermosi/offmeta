/**
 * Comments section for public deck view — list + compose form.
 * @module components/deck/DeckCommentsSection
 */
import { useState, useCallback, useRef } from 'react';
import { MessageSquare, Trash2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDeckComments, type DeckComment } from '@/hooks/useDeckComments';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';

interface DeckCommentsSectionProps {
  deckId: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function CommentItem({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: DeckComment;
  currentUserId: string | undefined;
  onDelete: (id: string) => void;
}) {
  const canDelete = currentUserId === comment.user_id;
  const displayName = comment.profile?.display_name || 'Anonymous';
  const avatarUrl = comment.profile?.avatar_url;

  return (
    <div className="group flex gap-3 py-3 first:pt-0">
      {/* Avatar */}
      <div className="shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
        ) : (
          <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{displayName}</span>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(comment.created_at)}</span>
          {canDelete && (
            <button
              onClick={() => onDelete(comment.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-1 rounded hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete comment"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">{comment.body}</p>
      </div>
    </div>
  );
}

export function DeckCommentsSection({ deckId }: DeckCommentsSectionProps) {
  const { t } = useTranslation();
  const {
    comments,
    isLoading,
    addComment,
    deleteComment,
    isAdding,
    isAuthenticated,
    currentUserId,
  } = useDeckComments(deckId);

  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(async () => {
    if (!body.trim() || isAdding) return;
    try {
      await addComment(body);
      setBody('');
    } catch {
      // toast would go here
    }
  }, [body, isAdding, addComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">
          {t('deck.comments', 'Comments')}
          {comments.length > 0 && (
            <span className="ml-1.5 text-xs text-muted-foreground font-normal">({comments.length})</span>
          )}
        </h3>
      </div>

      {/* Comment list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-7 w-7 rounded-full shimmer" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-24 shimmer rounded" />
                <div className="h-4 w-full shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          {t('deck.noComments', 'No comments yet. Be the first!')}
        </p>
      ) : (
        <div className="divide-y divide-border/40">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onDelete={deleteComment}
            />
          ))}
        </div>
      )}

      {/* Compose */}
      {isAuthenticated ? (
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('deck.commentPlaceholder', 'Share your thoughts…')}
            className="resize-none text-sm min-h-[72px]"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <span className={cn(
              'text-xs',
              body.length > 1800 ? 'text-destructive' : 'text-muted-foreground',
            )}>
              {body.length}/2000
            </span>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!body.trim() || isAdding}
              className="gap-1.5"
            >
              {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t('deck.postComment', 'Post')}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground border border-border/40 rounded-lg p-3 text-center">
          {t('deck.loginToComment', 'Sign in to leave a comment')}
        </p>
      )}
    </div>
  );
}
