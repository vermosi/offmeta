/**
 * DeckTagEditor – Inline tag editor for the deck header.
 * Extracted from DeckEditor.tsx for modularity.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useDeckTags, useDeckTagMutations, usePopularTags } from '@/hooks';
import { useTranslation } from '@/lib/i18n';

export function DeckTagEditor({ deckId }: { deckId: string }) {
  const { t } = useTranslation();
  const { data: tags = [] } = useDeckTags(deckId);
  const { addTag, removeTag } = useDeckTagMutations(deckId);
  const { data: popularTags = [] } = usePopularTags();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAdd = () => {
    const normalized = input.trim().toLowerCase();
    if (!normalized || tags.length >= 5 || tags.some((t) => t.tag === normalized)) return;
    addTag.mutate(normalized);
    setInput('');
    setShowSuggestions(false);
  };

  const suggestions = popularTags
    .filter((pt) => pt.includes(input.toLowerCase()) && !tags.some((t) => t.tag === pt))
    .slice(0, 5);

  return (
    <div className="px-4 pb-2 space-y-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        {tags.map((tag) => (
          <Badge key={tag.id} variant="outline" size="sm" className="gap-1">
            {tag.tag}
            <button
              onClick={() => removeTag.mutate(tag.id)}
              className="text-muted-foreground hover:text-foreground ml-0.5"
            >
              ×
            </button>
          </Badge>
        ))}
        {tags.length < 5 && (
          <div className="relative">
            <input
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={t('deck.tagPlaceholder')}
              maxLength={30}
              className="h-6 w-28 text-[10px] px-2 rounded border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-7 left-0 z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onMouseDown={() => {
                      addTag.mutate(s);
                      setInput('');
                    }}
                    className="block w-full text-left px-3 py-1 text-[10px] text-foreground hover:bg-secondary/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {tags.length >= 5 && <p className="text-[10px] text-muted-foreground">{t('deck.maxTags')}</p>}
    </div>
  );
}
