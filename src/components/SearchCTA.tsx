/**
 * "Ready to search?" CTA section for the home discovery area.
 * Nudges users back to the search bar after browsing content.
 */

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

interface SearchCTAProps {
  onSearch: () => void;
}

export function SearchCTA({ onSearch }: SearchCTAProps) {
  const { t } = useTranslation();

  return (
    <section className="container-main">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('searchCTA.title', 'Ready to find your next card?')}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {t('searchCTA.description', 'Describe what you need in plain English — OffMeta translates it into a precise Scryfall query.')}
        </p>
        <Button onClick={onSearch} className="gap-2">
          <Search className="h-4 w-4" />
          {t('searchCTA.button', 'Start Searching')}
        </Button>
      </div>
    </section>
  );
}
