/**
 * Deck editor header: deck name, format selector, commander/companion badges,
 * categorize button, description, tags, and inline search bar.
 */

import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Crown,
  Shield,
  DollarSign,
  Check,
  Wand2,
  Loader2,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FORMATS } from '@/data/formats';
import { FORMAT_LABELS } from '@/data/formats';
import { InlineCardSearch } from '@/components/deckbuilder/InlineCardSearch';
import { DeckExportMenu } from '@/components/deckbuilder/DeckExportMenu';
import { DeckTagEditor } from '@/components/deckbuilder/DeckTagEditor';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';
import type { ScryfallCard } from '@/types/card';
import { type DeckCard } from '@/hooks';

interface DeckEditorHeaderProps {
  deck: {
    name: string;
    description: string | null;
    commander_name: string | null;
    companion_name: string | null;
    format: string;
    is_public: boolean;
    user_id: string;
    color_identity: string[];
    card_count: number;
    id: string;
    created_at: string;
    updated_at: string;
  };
  cards: DeckCard[];
  deckId: string;
  isReadOnly: boolean;
  editingName: boolean;
  nameInput: string;
  onNameInputChange: (value: string) => void;
  onStartEditName: () => void;
  onSaveName: () => void;
  formatLabel: string;
  onFormatChange: (format: string) => void;
  totalMainboard: number;
  totalSideboard: number;
  totalMaybeboard: number;
  formatMax: number;
  mainboardCount: number;
  deckPrice: number | null;
  priceLoading: boolean;
  categorizingAll: boolean;
  onRecategorizeAll: () => void;
  descriptionOpen: boolean;
  onDescriptionOpenChange: (open: boolean) => void;
  descriptionInput: string;
  onDescriptionInputChange: (value: string) => void;
  onDescriptionBlur: () => void;
  onTogglePublic: () => void;
  onAddCard: (card: ScryfallCard) => void;
  onPreview: (card: ScryfallCard | null) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function DeckEditorHeader({
  deck,
  cards,
  deckId,
  isReadOnly,
  editingName,
  nameInput,
  onNameInputChange,
  onStartEditName,
  onSaveName,
  formatLabel,
  onFormatChange,
  totalMainboard,
  totalSideboard,
  totalMaybeboard,
  formatMax,
  mainboardCount,
  deckPrice,
  priceLoading,
  categorizingAll,
  onRecategorizeAll,
  descriptionOpen,
  onDescriptionOpenChange,
  descriptionInput,
  onDescriptionInputChange,
  onDescriptionBlur,
  onTogglePublic,
  onAddCard,
  onPreview,
  searchInputRef,
}: DeckEditorHeaderProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="border-b border-border bg-card">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            to="/deckbuilder"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {editingName && !isReadOnly ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={nameInput}
                onChange={(e) => onNameInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSaveName()}
                className="text-sm h-8"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={onSaveName}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={isReadOnly ? undefined : onStartEditName}
              className={cn('flex items-center gap-1.5 text-left flex-1 min-w-0', !isReadOnly && 'group')}
            >
              <h2 className="font-semibold truncate text-base">{deck.name}</h2>
              {!isReadOnly && (
                <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              )}
            </button>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {!isReadOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="text-[11px] font-medium px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                    {formatLabel}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {FORMATS.map((f) => (
                    <DropdownMenuItem
                      key={f.value}
                      onClick={() => onFormatChange(f.value)}
                      className={cn('text-xs', deck.format === f.value && 'text-accent font-medium')}
                    >
                      {f.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isReadOnly && (
              <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground">
                {FORMAT_LABELS[deck.format] || deck.format}
              </span>
            )}

            <span
              className={cn(
                'text-xs font-semibold px-2 py-1 rounded-md',
                totalMainboard >= formatMax
                  ? 'bg-accent/10 text-accent'
                  : 'bg-secondary/50 text-muted-foreground',
              )}
            >
              {totalMainboard}/{formatMax}
              {totalSideboard > 0 && <span className="text-muted-foreground/60"> +{totalSideboard}sb</span>}
              {totalMaybeboard > 0 && <span className="text-muted-foreground/60"> +{totalMaybeboard}mb</span>}
            </span>

            {mainboardCount > 0 && (
              <span className="text-xs font-medium px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground flex items-center gap-0.5">
                <DollarSign className="h-3 w-3" />
                {priceLoading ? (
                  <span className="w-8 h-3 shimmer rounded inline-block" />
                ) : deckPrice !== null ? (
                  deckPrice.toFixed(2)
                ) : (
                  '—'
                )}
              </span>
            )}
          </div>

          {!isReadOnly && <DeckExportMenu deck={deck} cards={cards} onTogglePublic={onTogglePublic} />}
        </div>

        {(deck.commander_name || deck.companion_name || !isReadOnly) && (
          <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
            {deck.commander_name && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                <Crown className="h-2.5 w-2.5" />
                {deck.commander_name}
              </span>
            )}
            {deck.companion_name && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Shield className="h-2.5 w-2.5" />
                {deck.companion_name}
              </span>
            )}
            {!isReadOnly && cards.length >= 3 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRecategorizeAll}
                disabled={categorizingAll}
                className="h-6 text-[10px] gap-1 px-2"
                title={t('deckEditor.categorizeTooltip')}
              >
                {categorizingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                {t('deckEditor.categorize')}
              </Button>
            )}
            <div className="flex-1" />
            {!isReadOnly && (
              <button
                onClick={() => onDescriptionOpenChange(!descriptionOpen)}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {descriptionInput ? t('deckEditor.editNotes') : t('deckEditor.addNotesButton')}
              </button>
            )}
          </div>
        )}
        {descriptionOpen && !isReadOnly && (
          <div className="px-4 pb-2">
            <Textarea
              value={descriptionInput}
              onChange={(e) => onDescriptionInputChange(e.target.value)}
              onBlur={() => {
                onDescriptionBlur();
                onDescriptionOpenChange(false);
              }}
              placeholder={t('deckEditor.descriptionPlaceholder')}
              rows={2}
              className="text-xs resize-none"
              autoFocus
            />
          </div>
        )}
        {isReadOnly && deck.description && (
          <div className="px-4 pb-2">
            <p className="text-[11px] text-muted-foreground">{deck.description}</p>
          </div>
        )}
        {!isReadOnly && <DeckTagEditor deckId={deckId} />}
      </div>

      {!isReadOnly && (
        <div className="px-4 py-3 border-b border-border bg-card/50">
          <InlineCardSearch onAddCard={onAddCard} onPreview={onPreview} searchInputRef={searchInputRef} />
        </div>
      )}
    </>
  );
}
