/**
 * DeckListView – view/sort toolbar, deck list content (list/visual/pile),
 * count bar, and stats bar.
 */

import { type RefObject } from 'react';
import {
  List,
  LayoutGrid,
  Columns3,
  SortAsc,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  History,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VisualCardGrid } from '@/components/deckbuilder/VisualCardGrid';
import { PileView } from '@/components/deckbuilder/PileView';
import { CategorySection } from '@/components/deckbuilder/CategorySection';
import { SideboardSection } from '@/components/deckbuilder/SideboardSection';
import { MaybeboardSection } from '@/components/deckbuilder/MaybeboardSection';
import { DeckStatsBar } from '@/components/deckbuilder/DeckStats';
import { cn } from '@/lib/core/utils';
import { useTranslation } from '@/lib/i18n';
import {
  toast,
  useUndoRedo,
  type DeckCard,
  type DeckViewMode,
} from '@/hooks';
import type { DeckSortMode } from '@/lib/deckbuilder';
import type { ScryfallCard } from '@/types/card';

type UndoRedoReturn = ReturnType<typeof useUndoRedo>;

interface DeckListViewProps {
  cards: DeckCard[];
  cardsLoading: boolean;
  isReadOnly: boolean;
  isMobile: boolean;
  deckViewMode: DeckViewMode;
  onDeckViewModeChange: (mode: DeckViewMode) => void;
  deckSortMode: DeckSortMode;
  onDeckSortModeChange: (mode: DeckSortMode) => void;
  undoRedo: UndoRedoReturn;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;

  // Deck data
  mainboardCards: DeckCard[];
  sideboardCards: DeckCard[];
  maybeboardCards: DeckCard[];
  sortedMainboard: DeckCard[];
  grouped: [string, DeckCard[]][];
  totalMainboard: number;
  totalSideboard: number;
  totalMaybeboard: number;
  formatMax: number;
  scryfallCacheVersion: number;

  // Refs
  scryfallCacheRef: RefObject<Map<string, ScryfallCard>>;

  // Card handlers
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onRemove: (cardId: string) => void;
  onSetQuantity: (cardId: string, quantity: number) => void;
  onSetCommander: (cardId: string, isCommander: boolean) => void;
  onSetCompanion: (cardId: string, isCompanion: boolean) => void;
  onSetCategory: (cardId: string, category: string) => void;
  onMoveToSideboard: (cardId: string, toSideboard: boolean) => void;
  onMoveToMaybeboard: (cardId: string) => void;
  onChangePrinting: (cardId: string, printing: { id: string }) => void;
}

export function DeckListView({
  cards,
  cardsLoading,
  isReadOnly,
  isMobile,
  deckViewMode,
  onDeckViewModeChange,
  deckSortMode,
  onDeckSortModeChange,
  undoRedo,
  previewOpen,
  onPreviewOpenChange,
  mainboardCards,
  sideboardCards,
  maybeboardCards,
  sortedMainboard,
  grouped,
  totalMainboard,
  totalSideboard,
  totalMaybeboard,
  formatMax,
  scryfallCacheVersion,
  scryfallCacheRef,
  selectedCardId,
  onSelectCard,
  onRemove,
  onSetQuantity,
  onSetCommander,
  onSetCompanion,
  onSetCategory,
  onMoveToSideboard,
  onMoveToMaybeboard,
  onChangePrinting,
}: DeckListViewProps) {
  const { t } = useTranslation();

  const viewSortToolbar = cards.length > 0 && (
    <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border bg-card/30">
      <div className="flex items-center gap-0.5 p-0.5 bg-secondary/50 rounded-md">
        {(
          [
            { mode: 'list' as DeckViewMode, icon: List, label: t('deckEditor.view.list') },
            { mode: 'visual' as DeckViewMode, icon: LayoutGrid, label: t('deckEditor.view.visual') },
            { mode: 'pile' as DeckViewMode, icon: Columns3, label: t('deckEditor.view.pile') },
          ] as const
        ).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => onDeckViewModeChange(mode)}
            title={label}
            className={cn(
              'p-1.5 rounded transition-colors',
              deckViewMode === mode
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-secondary/50">
            <SortAsc className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(`deckEditor.sort.${deckSortMode}`)}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-36">
          {(['category', 'name', 'cmc', 'color', 'type', 'price'] as DeckSortMode[]).map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onDeckSortModeChange(s)}
              className={cn('text-xs capitalize', deckSortMode === s && 'text-accent font-medium')}
            >
              {t(`deckEditor.sort.${s}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {!isReadOnly && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={() =>
              undoRedo.undo().then((a) => {
                if (a) toast({ title: t('deckEditor.undoAction').replace('{label}', a.label) });
              })
            }
            disabled={!undoRedo.canUndo}
            title={t('deckEditor.undoTooltip')}
            className={cn(
              'p-1.5 rounded transition-colors',
              undoRedo.canUndo
                ? 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                : 'text-muted-foreground/30 cursor-not-allowed',
            )}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() =>
              undoRedo.redo().then((a) => {
                if (a) toast({ title: t('deckEditor.redoAction').replace('{label}', a.label) });
              })
            }
            disabled={!undoRedo.canRedo}
            title={t('deckEditor.redoTooltip')}
            className={cn(
              'p-1.5 rounded transition-colors',
              undoRedo.canRedo
                ? 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                : 'text-muted-foreground/30 cursor-not-allowed',
            )}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
          {(undoRedo.canUndo || undoRedo.canRedo) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  title={t('deckEditor.actionHistory')}
                  className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50 flex items-center gap-0.5"
                >
                  <History className="h-3.5 w-3.5" />
                  <ChevronDown className="h-2.5 w-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto bg-popover z-50">
                {undoRedo.redoLabels.map((label, i) => (
                  <DropdownMenuItem
                    key={`redo-${i}`}
                    onClick={() =>
                      undoRedo.redo().then((a) => {
                        if (a) toast({ title: t('deckEditor.redoAction').replace('{label}', a.label) });
                      })
                    }
                    className="text-xs text-muted-foreground/50 italic flex items-center gap-2"
                  >
                    <Redo2 className="h-3 w-3 shrink-0" />
                    <span className="truncate">{label}</span>
                  </DropdownMenuItem>
                ))}
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-accent border-y border-border bg-accent/5">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  {t('deckEditor.currentState')}
                </div>
                {[...undoRedo.undoLabels].reverse().map((label, i) => {
                  const stackIndex = undoRedo.undoLabels.length - 1 - i;
                  return (
                    <DropdownMenuItem
                      key={`undo-${i}`}
                      onClick={() =>
                        undoRedo.undoTo(stackIndex).then((a) => {
                          if (a)
                            toast({
                              title: t('deckEditor.undidActions').replace(
                                '{count}',
                                String(undoRedo.undoLabels.length - stackIndex),
                              ),
                            });
                        })
                      }
                      className="text-xs flex items-center gap-2"
                    >
                      <Undo2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
      <div className="flex-1" />
      {!isMobile && (
        <button
          onClick={() => onPreviewOpenChange(!previewOpen)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-secondary/50"
          title={previewOpen ? t('deckEditor.hidePreview') : t('deckEditor.showPreview')}
        >
          {previewOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{t('deckEditor.preview')}</span>
        </button>
      )}
    </div>
  );

  const categorySection = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
      {grouped.map(([category, catCards]: [string, DeckCard[]]) => (
        <CategorySection
          key={category}
          category={category}
          cards={catCards}
          isReadOnly={isReadOnly}
          selectedCardId={selectedCardId}
          onSelectCard={onSelectCard}
          onRemove={onRemove}
          onSetQuantity={onSetQuantity}
          onSetCommander={onSetCommander}
          onSetCompanion={onSetCompanion}
          onSetCategory={onSetCategory}
          onMoveToSideboard={(cardId, toSb) => onMoveToSideboard(cardId, toSb)}
          onMoveToMaybeboard={onMoveToMaybeboard}
          scryfallCache={scryfallCacheRef}
          onChangePrinting={(cardId, p) => onChangePrinting(cardId, p)}
          cacheVersion={scryfallCacheVersion}
        />
      ))}
      <SideboardSection
        cards={sideboardCards}
        isReadOnly={isReadOnly}
        onRemove={onRemove}
        onSetQuantity={onSetQuantity}
        onMoveToMainboard={(cardId) => onMoveToSideboard(cardId, false)}
        scryfallCache={scryfallCacheRef}
        onChangePrinting={(cardId, p) => onChangePrinting(cardId, p)}
        cacheVersion={scryfallCacheVersion}
      />
      <MaybeboardSection
        cards={maybeboardCards}
        isReadOnly={isReadOnly}
        onRemove={onRemove}
        onSetQuantity={onSetQuantity}
        onMoveToMainboard={(cardId) => onMoveToSideboard(cardId, false)}
        onMoveToSideboard={(cardId) => onMoveToSideboard(cardId, true)}
        scryfallCache={scryfallCacheRef}
        onChangePrinting={(cardId, p) => onChangePrinting(cardId, p)}
        cacheVersion={scryfallCacheVersion}
      />
    </div>
  );

  const deckListContent = (
    <div className="flex-1 overflow-y-auto">
      <div className={cn(deckViewMode !== 'pile' ? 'p-3 space-y-1' : 'overflow-x-auto')}>
        {cardsLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 shimmer rounded-lg" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <p className="text-center">{isReadOnly ? t('deckEditor.emptyDeckReadOnly') : t('deckEditor.emptyDeck')}</p>
          </div>
        ) : deckViewMode === 'visual' ? (
          <VisualCardGrid
            cards={deckSortMode === 'category' ? mainboardCards : sortedMainboard}
            scryfallCache={scryfallCacheRef}
            onSelectCard={onSelectCard}
            selectedCardId={selectedCardId}
            onRemove={onRemove}
            onSetQuantity={onSetQuantity}
            isReadOnly={isReadOnly}
          />
        ) : deckViewMode === 'pile' ? (
          <PileView
            mainboardCards={mainboardCards}
            scryfallCache={scryfallCacheRef}
            onSelectCard={onSelectCard}
            selectedCardId={selectedCardId}
          />
        ) : (
          categorySection
        )}
      </div>
    </div>
  );

  const deckCountBar = cards.length > 0 && (
    <div className="flex items-center gap-3 px-4 py-1.5 border-t border-border bg-card text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{totalMainboard}</span>
      <span>{t('deckEditor.mainDeck')}</span>
      {totalSideboard > 0 && (
        <>
          <span className="text-border">/</span>
          <span className="font-semibold text-foreground">{totalSideboard}</span>
          <span>{t('deckEditor.sideboard')}</span>
        </>
      )}
      {totalMaybeboard > 0 && (
        <>
          <span className="text-border">/</span>
          <span className="font-semibold text-foreground">{totalMaybeboard}</span>
          <span>{t('deckEditor.maybe')}</span>
        </>
      )}
    </div>
  );

  const statsBar = cards.length > 0 && (
    <DeckStatsBar
      cards={mainboardCards}
      scryfallCache={scryfallCacheRef.current}
      formatMax={formatMax}
      cacheVersion={scryfallCacheVersion}
    />
  );

  return (
    <>
      {viewSortToolbar}
      {deckListContent}
      {deckCountBar}
      {statsBar}
    </>
  );
}
