/**
 * Deck Export Menu — copy decklist as text, or download.
 * @module components/deckbuilder/DeckExportMenu
 */

import { Copy, Download, Share2, Globe, Lock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/useToast';
import type { DeckCard, Deck } from '@/hooks/useDeck';
import { useTranslation } from '@/lib/i18n';

interface DeckExportMenuProps {
  deck: Deck;
  cards: DeckCard[];
  onTogglePublic: () => void;
}

export function buildDecklistText(deck: Deck, cards: DeckCard[]): string {
  const lines: string[] = [];

  const commanders = cards.filter((c) => c.is_commander);
  if (commanders.length > 0) {
    for (const cmd of commanders) {
      lines.push(`COMMANDER: ${cmd.card_name}`);
    }
    lines.push('');
  }

  const grouped: Record<string, DeckCard[]> = {};
  for (const card of cards) {
    if (card.is_commander) continue;
    const cat = card.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(card);
  }

  for (const [category, catCards] of Object.entries(grouped)) {
    lines.push(`// ${category}`);
    for (const card of catCards.sort((a, b) => a.card_name.localeCompare(b.card_name))) {
      lines.push(`${card.quantity} ${card.card_name}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

export function DeckExportMenu({ deck, cards, onTogglePublic }: DeckExportMenuProps) {
  const { t } = useTranslation();

  const handleCopyText = async () => {
    const text = buildDecklistText(deck, cards);
    await navigator.clipboard.writeText(text);
    toast({ title: t('deckExport.copied'), description: t('deckExport.copiedDesc') });
  };

  const handleDownload = () => {
    const text = buildDecklistText(deck, cards);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.replace(/[^a-zA-Z0-9 ]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t('deckExport.downloaded'), description: `${deck.name}.txt` });
  };

  const handleCopyShareLink = async () => {
    if (!deck.is_public) {
      toast({ title: t('deckExport.privateFirst'), description: t('deckExport.privateFirstDesc'), variant: 'destructive' });
      return;
    }
    const url = `${window.location.origin}/deckbuilder/${deck.id}`;
    await navigator.clipboard.writeText(url);
    toast({ title: t('deckExport.linkCopied'), description: t('deckExport.linkCopiedDesc') });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1">
          <Share2 className="h-3 w-3" />
          <span className="hidden sm:inline">{t('deckExport.share')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyText} className="gap-2 text-xs">
          <Copy className="h-3.5 w-3.5" />
          {t('deckExport.copyText')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} className="gap-2 text-xs">
          <Download className="h-3.5 w-3.5" />
          {t('deckExport.downloadTxt')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onTogglePublic} className="gap-2 text-xs">
          {deck.is_public ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
          {deck.is_public ? t('deckExport.makePrivate') : t('deckExport.makePublic')}
        </DropdownMenuItem>
        {deck.is_public && (
          <DropdownMenuItem onClick={handleCopyShareLink} className="gap-2 text-xs">
            <Share2 className="h-3.5 w-3.5" />
            {t('deckExport.copyLink')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
