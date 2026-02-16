/**
 * Language selector dropdown for switching locales.
 */

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n/constants';
import { cn } from '@/lib/core/utils';

export function LanguageSelector() {
  const { t, locale, setLocale } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-lg"
          aria-label={t('language.label')}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {SUPPORTED_LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => setLocale(loc.code as SupportedLocale)}
            className={cn(
              'gap-2 cursor-pointer',
              locale === loc.code && 'font-semibold bg-accent/50',
            )}
          >
            <span>{loc.flag}</span>
            <span>{loc.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
