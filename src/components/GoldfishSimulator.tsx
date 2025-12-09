import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Deck, DeckCard } from '@/lib/deck';
import { getCardImage } from '@/lib/scryfall';
import { Shuffle, Hand, RotateCcw, ChevronRight, Mountain, Droplets, Layers } from 'lucide-react';
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
      <div className="rounded-xl bg-secondary/30 p-8 text-center animate-in">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Shuffle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Goldfish Simulator</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add at least 40 cards to test opening hands
        </p>
        <Badge variant="outline">{totalCards}/40 cards</Badge>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="rounded-xl bg-secondary/30 p-8 text-center animate-in">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Hand className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Goldfish Simulator</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Test your deck's opening hands and early turns
        </p>
        <Button onClick={startGame} className="gap-2">
          <Shuffle className="h-4 w-4" />
          Draw Opening Hand
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border p-4 space-y-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{gameState.turn}</span>
          </div>
          <div>
            <h3 className="font-semibold">Turn {gameState.turn}</h3>
            <p className="text-xs text-muted-foreground">
              {stats?.libraryCount} cards in library
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={reset} className="h-9 w-9">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Stats bar */}
      {stats && (
        <div className="flex gap-3 text-xs">
          <Badge variant="secondary" className="gap-1">
            <Mountain className="h-3 w-3" />
            {stats.handLands} lands
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Droplets className="h-3 w-3" />
            {stats.avgCmc} avg
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Layers className="h-3 w-3" />
            {gameState.battlefield.length} in play
          </Badge>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {gameState.turn === 0 && (
          <Button variant="outline" size="sm" onClick={mulligan} className="h-8">
            Mulligan ({7 - gameState.mulliganCount - 1})
          </Button>
        )}
        <Button size="sm" onClick={drawCard} className="gap-1.5 h-8">
          <ChevronRight className="h-4 w-4" />
          Next Turn
        </Button>
      </div>

      {/* Zone tabs */}
      <Tabs value={activeZone} onValueChange={(v) => setActiveZone(v as typeof activeZone)}>
        <TabsList className="w-full h-9">
          <TabsTrigger value="hand" className="flex-1 text-xs">
            Hand ({gameState.hand.length})
          </TabsTrigger>
          <TabsTrigger value="battlefield" className="flex-1 text-xs">
            Field ({gameState.battlefield.length})
          </TabsTrigger>
          <TabsTrigger value="graveyard" className="flex-1 text-xs">
            Yard ({gameState.graveyard.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hand" className="mt-3">
          <ScrollArea className="h-48">
            {gameState.hand.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Empty hand</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {gameState.hand.map((card, index) => (
                  <button
                    key={`hand-${index}`}
                    onClick={() => playCard(index)}
                    className="relative group rounded-lg overflow-hidden transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    title={`Click to play ${card.card.name}`}
                  >
                    <img
                      src={getCardImage(card.card, 'small')}
                      alt={card.card.name}
                      className="w-full"
                    />
                    <div className="absolute inset-0 bg-primary/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary-foreground bg-primary/80 px-2 py-0.5 rounded">Play</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="battlefield" className="mt-3">
          <ScrollArea className="h-48">
            {gameState.battlefield.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No permanents</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {gameState.battlefield.map((card, index) => (
                  <button
                    key={`bf-${index}`}
                    onClick={() => sacrificeCard(index)}
                    className="relative group rounded-lg overflow-hidden transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring"
                    title={`Click to sacrifice ${card.card.name}`}
                  >
                    <img
                      src={getCardImage(card.card, 'small')}
                      alt={card.card.name}
                      className="w-full"
                    />
                    <div className="absolute inset-0 bg-destructive/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-semibold text-destructive-foreground bg-destructive/80 px-2 py-0.5 rounded">Sacrifice</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="graveyard" className="mt-3">
          <ScrollArea className="h-48">
            {gameState.graveyard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Empty graveyard</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {gameState.graveyard.map((card, index) => (
                  <div key={`gy-${index}`} className="opacity-50 rounded-lg overflow-hidden">
                    <img
                      src={getCardImage(card.card, 'small')}
                      alt={card.card.name}
                      className="w-full grayscale"
                    />
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}