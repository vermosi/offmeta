import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDeckPersistence } from '@/hooks/useDeckPersistence';
import { useAuth } from '@/contexts/AuthContext';
import { Deck } from '@/lib/deck';
import { formatDistanceToNow } from 'date-fns';
import { Save, FolderOpen, Trash2, Loader2, Library, Plus } from 'lucide-react';

interface SavedDecksPanelProps {
  currentDeck: Deck;
  onLoadDeck: (deck: Deck) => void;
}

export function SavedDecksPanel({ currentDeck, onLoadDeck }: SavedDecksPanelProps) {
  const { user } = useAuth();
  const { savedDecks, isLoading, isSaving, saveDeck, deleteDeck, loadDeck } = useDeckPersistence();
  const [newDeckName, setNewDeckName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleSave = async () => {
    if (!newDeckName.trim()) return;
    
    const id = await saveDeck(currentDeck, newDeckName);
    if (id) {
      setNewDeckName('');
      setSaveDialogOpen(false);
    }
  };

  const handleLoad = (savedDeck: any) => {
    const deck = loadDeck(savedDeck);
    onLoadDeck(deck);
  };

  const cardCount = currentDeck.mainboard.reduce((sum, c) => sum + c.quantity, 0);

  if (!user) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 text-center">
          <Library className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Sign in to save and load decks
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            My Decks
          </CardTitle>
          
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={cardCount === 0} className="gap-1">
                <Plus className="h-4 w-4" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Deck</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Deck name"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <div className="text-sm text-muted-foreground">
                  {cardCount} cards in mainboard
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !newDeckName.trim()}
                  className="w-full gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Deck
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : savedDecks.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No saved decks yet
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {savedDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{deck.name}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs">
                        {Array.isArray(deck.mainboard) 
                          ? deck.mainboard.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0) 
                          : 0} cards
                      </Badge>
                      <span>
                        {formatDistanceToNow(new Date(deck.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoad(deck)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete deck?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete "{deck.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDeck(deck.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
