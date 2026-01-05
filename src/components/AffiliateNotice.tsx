import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AffiliateNoticeProps {
  searchQuery: string;
  onAffiliateClick?: () => void;
}

export function AffiliateNotice({ searchQuery, onAffiliateClick }: AffiliateNoticeProps) {
  const tcgPlayerSearchUrl = `https://www.tcgplayer.com/search/magic/product?q=${encodeURIComponent(searchQuery)}&view=grid`;

  const handleClick = () => {
    onAffiliateClick?.();
    window.open(tcgPlayerSearchUrl, '_blank');
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-3 px-4 bg-muted/20 border border-border/30 rounded-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">
            Looking to buy? Shop these cards on TCGplayer.
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            This link may support this tool at no extra cost to you.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={handleClick}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Shop on TCGplayer
        </Button>
      </div>
    </div>
  );
}
