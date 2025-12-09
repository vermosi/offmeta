import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Deck, DeckCard } from '@/lib/deck';
import { Package, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';

interface DeckCollectionCheckProps {
  deck: Deck;
}

interface CardStatus {
  card: DeckCard;
  owned: number;
  needed: number;
  estimatedPrice: number;
}

export function DeckCollectionCheck({ deck }: DeckCollectionCheckProps) {
  const { user } = useAuth();
  const [cardStatuses, setCardStatuses] = useState<CardStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || deck.mainboard.length === 0) {
      setCardStatuses([]);
      return;
    }

    const fetchCollection = async () => {
      setIsLoading(true);
      
      const { data: collection } = await supabase
        .from('collection_cards')
        .select('card_name, quantity, foil_quantity')
        .eq('user_id', user.id);

      const collectionMap = new Map<string, number>();
      collection?.forEach(item => {
        const total = (item.quantity || 0) + (item.foil_quantity || 0);
        const existing = collectionMap.get(item.card_name.toLowerCase()) || 0;
        collectionMap.set(item.card_name.toLowerCase(), existing + total);
      });

      const statuses: CardStatus[] = deck.mainboard.map(deckCard => {
        const owned = collectionMap.get(deckCard.card.name.toLowerCase()) || 0;
        const needed = Math.max(0, deckCard.quantity - owned);
        const price = parseFloat(deckCard.card.prices?.usd || '0');
        
        return {
          card: deckCard,
          owned,
          needed,
          estimatedPrice: needed * price,
        };
      });

      setCardStatuses(statuses);
      setIsLoading(false);
    };

    fetchCollection();
  }, [user, deck.mainboard]);

  if (!user) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-6 text-center">
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Sign in to check your collection
          </p>
        </CardContent>
      </Card>
    );
  }

  if (deck.mainboard.length === 0) {
    return null;
  }

  const ownedCards = cardStatuses.filter(s => s.needed === 0);
  const missingCards = cardStatuses.filter(s => s.needed > 0);
  const totalNeeded = cardStatuses.reduce((sum, s) => sum + s.needed, 0);
  const totalCards = deck.mainboard.reduce((sum, c) => sum + c.quantity, 0);
  const ownedPercent = ((totalCards - totalNeeded) / totalCards) * 100;
  const costToComplete = cardStatuses.reduce((sum, s) => sum + s.estimatedPrice, 0);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Collection Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Owned: {totalCards - totalNeeded}/{totalCards}</span>
            <span className="text-muted-foreground">{Math.round(ownedPercent)}%</span>
          </div>
          <Progress value={ownedPercent} className="h-2" />
        </div>

        {/* Cost summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm">Cost to Complete</span>
          </div>
          <span className="font-semibold">${costToComplete.toFixed(2)}</span>
        </div>

        {/* Missing cards list */}
        {missingCards.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-red-400">
              <AlertCircle className="h-4 w-4" />
              Missing ({missingCards.length})
            </div>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {missingCards.map((status, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span className="truncate flex-1">{status.card.card.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Need {status.needed}
                      </Badge>
                      {status.estimatedPrice > 0 && (
                        <span className="text-muted-foreground text-xs">
                          ${status.estimatedPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Owned indicator */}
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>{ownedCards.length} cards fully owned</span>
        </div>
      </CardContent>
    </Card>
  );
}
