/**
 * Export search results as CSV or copy card names to clipboard.
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Copy, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import type { ScryfallCard } from '@/types/card';
import { useTranslation } from '@/lib/i18n';

interface ExportResultsProps {
  cards: ScryfallCard[];
}

export function ExportResults({ cards }: ExportResultsProps) {
  const { t } = useTranslation();

  const copyNames = useCallback(async () => {
    const names = cards.map((c) => c.name).join('\n');
    try {
      await navigator.clipboard.writeText(names);
      toast.success(t('export.copied'), {
        description: `${cards.length} ${t('export.copiedDesc')}`,
      });
    } catch {
      toast.error(t('export.copyFailed'));
    }
  }, [cards, t]);

  const downloadCsv = useCallback(() => {
    const header = 'Name,Set,Type,CMC,Rarity,Price (USD)\n';
    const rows = cards
      .map((c) => {
        const name = `"${c.name.replace(/"/g, '""')}"`;
        const set = c.set_name.replace(/"/g, '""');
        const type = `"${c.type_line.replace(/"/g, '""')}"`;
        const cmc = c.cmc;
        const rarity = c.rarity;
        const price = c.prices?.usd || '';
        return `${name},"${set}",${type},${cmc},${rarity},${price}`;
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'offmeta-results.csv';
    link.click();
    URL.revokeObjectURL(url);

    toast.success(t('export.downloaded'), {
      description: `${cards.length} ${t('export.downloadedDesc')}`,
    });
  }, [cards, t]);

  if (cards.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 text-xs sm:text-sm"
          aria-label={t('export.label')}
        >
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50">
        <DropdownMenuItem onClick={copyNames} className="gap-2 cursor-pointer">
          <Copy className="h-4 w-4" />
          {t('export.copyNames')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadCsv} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          {t('export.downloadCsv')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
