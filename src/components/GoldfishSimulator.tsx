import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Deck, DeckCard } from '@/lib/deck';
import { getCardImage } from '@/lib/scryfall';
import { Shuffle, Hand, RotateCcw, ChevronRight, Mountain, Droplets } from 'lucide-react';
import { toast } from 'sonner';

interface GoldfishSimulatorProps {
  deck: Deck;
}

interface GameState {
  library: DeckCard[];
  hand: DeckCard[];
  battlefield: DeckCard[];
  graveyard: DeckCard[];
  turn: number;
  landsPlayed: number;
  mulliganCount: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function expandDeck(deck: Deck): DeckCard[] {
  const expanded: DeckCard[] = [];
  deck.mainboard.forEach(deckCard => {
    for (let i = 0; i < deckCard.quantity; i++) {
      expanded.push({ ...deckCard, quantity: 1 });
    }
  });
  return expanded;
}

export function GoldfishSimulator({ deck }: GoldfishSimulatorProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [activeZone, setActiveZone] = useState<'hand' | 'battlefield' | 'graveyard'>('hand');

  const totalCards = useMemo(() => 
    deck.mainboard.reduce((sum, card) => sum + card.quantity, 0),
    [deck.mainboard]
  );

  const startGame = useCallback(() => {
    const expandedDeck = expandDeck(deck);
    const shuffled = shuffleArray(expandedDeck);
    const hand = shuffled.slice(0, 7);
    const library = shuffled.slice(7);

    setGameState({
      library,
      hand,
      battlefield: [],
      graveyard: [],
      turn: 0,
      landsPlayed: 0,
      mulliganCount: 0,
    });
  }, [deck]);

  const mulligan = useCallback(() => {
    if (!gameState) return;
    
    const newMulliganCount = gameState.mulliganCount + 1;
    const cardsToKeep = Math.max(7 - newMulliganCount, 1);
    
    const allCards = [...gameState.library, ...gameState.hand];
    const shuffled = shuffleArray(allCards);
    const hand = shuffled.slice(0, cardsToKeep);
    const library = shuffled.slice(cardsToKeep);

    setGameState({
      ...gameState,
      library,
      hand,
      battlefield: [],
      graveyard: [],
      turn: 0,
      landsPlayed: 0,
      mulliganCount: newMulliganCount,
    });

    toast.info(`Mulligan to ${cardsToKeep} cards`);
  }, [gameState]);

  const drawCard = useCallback(() => {
    if (!gameState || gameState.library.length === 0) {
      toast.error('No cards left in library!');
      return;
    }

    const [drawnCard, ...remaining] = gameState.library;
    setGameState({
      ...gameState,
      library: remaining,
      hand: [...gameState.hand, drawnCard],
      turn: gameState.turn + 1,
      landsPlayed: 0,
    });
  }, [gameState]);

  const playCard = useCallback((index: number) => {
    if (!gameState) return;
    
    const card = gameState.hand[index];
    const isLand = card.card.type_line.toLowerCase().includes('land');
    
    if (isLand && gameState.landsPlayed >= 1) {
      toast.error('Already played a land this turn!');
      return;
    }

    const newHand = [...gameState.hand];
    newHand.splice(index, 1);

    setGameState({
      ...gameState,
      hand: newHand,
      battlefield: [...gameState.battlefield, card],
      landsPlayed: isLand ? gameState.landsPlayed + 1 : gameState.landsPlayed,
    });
  }, [gameState]);

  const sacrificeCard = useCallback((index: number) => {
    if (!gameState) return;

    const card = gameState.battlefield[index];
    const newBattlefield = [...gameState.battlefield];
    newBattlefield.splice(index, 1);

    setGameState({
      ...gameState,
      battlefield: newBattlefield,
      graveyard: [...gameState.graveyard, card],
    });
  }, [gameState]);

  const reset = useCallback(() => {
    setGameState(null);
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!gameState) return null;

    const handLands = gameState.hand.filter(c => 
      c.card.type_line.toLowerCase().includes('land')
    ).length;

    const handNonLands = gameState.hand.length - handLands;
    const avgCmc = gameState.hand
      .filter(c => !c.card.type_line.toLowerCase().includes('land'))
      .reduce((sum, c) => sum + c.card.cmc, 0) / (handNonLands || 1);

    const battlefieldLands = gameState.battlefield.filter(c =>
      c.card.type_line.toLowerCase().includes('land')
    ).length;

    return {
      handLands,
      handNonLands,
      avgCmc: avgCmc.toFixed(1),
      battlefieldLands,
      libraryCount: gameState.library.length,
    };
  }, [gameState]);

  if (totalCards < 40) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Shuffle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-display mb-2">Goldfish Simulator</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add at least 40 cards to your deck to test opening hands
          </p>
          <Badge variant="outline">{totalCards}/40 cards</Badge>
        </CardContent>
      </Card>
    );
  }

  if (!gameState) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-12 text-center">
          <Shuffle className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <h3 className="text-lg font-display mb-2">Goldfish Simulator</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Test your deck's opening hands and early turns
          </p>
          <Button onClick={startGame} className="gap-2">
            <Hand className="h-4 w-4" />
            Draw Opening Hand
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Shuffle className="h-5 w-5 text-primary" />
            Turn {gameState.turn}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats bar */}
        {stats && (
          <div className="flex gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              <Mountain className="h-4 w-4" />
              {stats.handLands} lands in hand
            </span>
            <span className="flex items-center gap-1">
              <Droplets className="h-4 w-4" />
              Avg CMC: {stats.avgCmc}
            </span>
            <span>Library: {stats.libraryCount}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {gameState.turn === 0 && (
            <Button variant="outline" size="sm" onClick={mulligan}>
              Mulligan ({7 - gameState.mulliganCount - 1} cards)
            </Button>
          )}
          <Button size="sm" onClick={drawCard} className="gap-1">
            <ChevronRight className="h-4 w-4" />
            Draw & Next Turn
          </Button>
        </div>

        {/* Zone tabs */}
        <Tabs value={activeZone} onValueChange={(v) => setActiveZone(v as typeof activeZone)}>
          <TabsList className="w-full">
            <TabsTrigger value="hand" className="flex-1">
              Hand ({gameState.hand.length})
            </TabsTrigger>
            <TabsTrigger value="battlefield" className="flex-1">
              Battlefield ({gameState.battlefield.length})
            </TabsTrigger>
            <TabsTrigger value="graveyard" className="flex-1">
              Graveyard ({gameState.graveyard.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hand" className="mt-2">
            <ScrollArea className="h-48">
              {gameState.hand.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Empty hand</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {gameState.hand.map((card, index) => (
                    <button
                      key={`hand-${index}`}
                      onClick={() => playCard(index)}
                      className="relative group"
                      title={`Click to play ${card.card.name}`}
                    >
                      <img
                        src={getCardImage(card.card, 'small')}
                        alt={card.card.name}
                        className="rounded-md w-full transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 rounded-md transition-opacity flex items-center justify-center">
                        <span className="text-xs font-bold">Play</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="battlefield" className="mt-2">
            <ScrollArea className="h-48">
              {gameState.battlefield.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No permanents</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {gameState.battlefield.map((card, index) => (
                    <button
                      key={`bf-${index}`}
                      onClick={() => sacrificeCard(index)}
                      className="relative group"
                      title={`Click to sacrifice ${card.card.name}`}
                    >
                      <img
                        src={getCardImage(card.card, 'small')}
                        alt={card.card.name}
                        className="rounded-md w-full"
                      />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="graveyard" className="mt-2">
            <ScrollArea className="h-48">
              {gameState.graveyard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Empty graveyard</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {gameState.graveyard.map((card, index) => (
                    <div key={`gy-${index}`} className="opacity-60">
                      <img
                        src={getCardImage(card.card, 'small')}
                        alt={card.card.name}
                        className="rounded-md w-full"
                      />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
