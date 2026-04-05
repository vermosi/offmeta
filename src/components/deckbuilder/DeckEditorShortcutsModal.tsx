import { Keyboard } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface DeckEditorShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUT_DEFINITIONS = [
  { keys: ['/'], translationKey: 'deckEditor.shortcuts.focusSearch' },
  {
    keys: ['Del', '/', 'Backspace'],
    translationKey: 'deckEditor.shortcuts.removeCard',
  },
  {
    keys: ['+', '/', '-'],
    translationKey: 'deckEditor.shortcuts.adjustQuantity',
  },
  {
    keys: ['Shift', 'S'],
    translationKey: 'deckEditor.shortcuts.toSideboard',
  },
  {
    keys: ['Shift', 'M'],
    translationKey: 'deckEditor.shortcuts.toMaybeboard',
  },
  { keys: ['?'], translationKey: 'deckEditor.shortcuts.toggleHelp' },
  {
    keys: ['Esc'],
    translationKey: 'deckEditor.shortcuts.deselectClose',
  },
  { keys: ['Ctrl', 'Z'], translationKey: 'deckEditor.shortcuts.undo' },
  {
    keys: ['Ctrl', 'Shift', 'Z'],
    translationKey: 'deckEditor.shortcuts.redo',
  },
] as const;

export function DeckEditorShortcutsModal({
  isOpen,
  onClose,
}: DeckEditorShortcutsModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-popover border border-border rounded-xl shadow-2xl p-5 w-72 space-y-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            {t('deckEditor.shortcuts.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xs"
          >
            ✕
          </button>
        </div>
        <ul className="space-y-2 text-xs">
          {SHORTCUT_DEFINITIONS.map(({ keys, translationKey }) => {
            const description = t(translationKey);
            return (
              <li
                key={translationKey}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-muted-foreground">{description}</span>
                <span className="flex items-center gap-1 shrink-0">
                  {keys.map((keyValue) => (
                    <kbd
                      key={keyValue}
                      className="inline-flex items-center px-1.5 py-0.5 rounded bg-secondary border border-border font-mono text-[10px] leading-none"
                    >
                      {keyValue}
                    </kbd>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-[10px] text-muted-foreground">
          {t('deckEditor.shortcuts.hint')}
        </p>
      </div>
    </div>
  );
}
