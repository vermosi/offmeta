/**
 * Upvote button for public decks — shows count + filled/outline heart.
 * @module components/deck/DeckVoteButton
 */
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeckVotes } from '@/hooks';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';

interface DeckVoteButtonProps {
  deckId: string;
}

export function DeckVoteButton({ deckId }: DeckVoteButtonProps) {
  const { t } = useTranslation();
  const { voteCount, hasVoted, toggleVote, isAuthenticated } = useDeckVotes(deckId);

  return (
    <Button
      variant={hasVoted ? 'default' : 'outline'}
      size="sm"
      onClick={toggleVote}
      disabled={!isAuthenticated}
      title={!isAuthenticated ? t('deck.loginToVote', 'Sign in to upvote') : undefined}
      className={cn(
        'gap-1.5 transition-all',
        hasVoted && 'bg-accent text-accent-foreground hover:bg-accent/90',
      )}
    >
      <Heart className={cn('h-3.5 w-3.5', hasVoted && 'fill-current')} />
      <span className="tabular-nums text-xs">{voteCount}</span>
    </Button>
  );
}
