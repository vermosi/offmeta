/**
 * External links toolbox component for CardModal.
 * Provides quick links to EDHREC, Moxfield, MTGTop8, etc.
 * @module components/CardModal/CardModalToolbox
 */

import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import type { CardModalToolboxProps } from './types';

export function CardModalToolbox({
  cardName,
  scryfallUri,
  isMobile = false,
}: CardModalToolboxProps) {
  const cardNameEncoded = encodeURIComponent(cardName);

  const toolboxLinks = [
    { name: 'EDHREC', url: `https://edhrec.com/route/?cc=${cardNameEncoded}` },
    {
      name: 'Moxfield',
      url: `https://www.moxfield.com/decks/public?filter=${cardNameEncoded}`,
    },
    {
      name: 'MTGTop8',
      url: `https://mtgtop8.com/search?MD_check=1&SB_check=1&cards=${cardNameEncoded}`,
    },
    {
      name: 'Archidekt',
      url: `https://archidekt.com/search/decks?q=${cardNameEncoded}`,
    },
    {
      name: 'MTGGoldfish',
      url: `https://www.mtggoldfish.com/price/${cardName.replace(/ /g, '+')}`,
    },
    {
      name: 'Gatherer',
      url: `https://gatherer.wizards.com/Pages/Search/Default.aspx?name=+[${cardNameEncoded}]`,
    },
  ];

  const displayLinks = isMobile ? toolboxLinks.slice(0, 4) : toolboxLinks;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Toolbox
      </h3>
      <div className="flex flex-wrap gap-2">
        {displayLinks.map((link) => (
          <Button
            key={link.name}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={() => window.open(link.url, '_blank')}
          >
            <ExternalLink className="h-3 w-3" />
            {link.name}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={() => window.open(scryfallUri, '_blank')}
        >
          <ExternalLink className="h-3 w-3" />
          Scryfall
        </Button>
      </div>
    </div>
  );
}
