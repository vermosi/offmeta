import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
      <div className="rounded-xl border border-border/50 bg-card/50 p-6">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
            <Library className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to save and load decks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card/50">
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">My Decks</span>
        </div>
        
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              disabled={cardCount === 0} 
              className="h-8 gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Save
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">Save Deck</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Enter deck name..."
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="h-10"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {cardCount} cards in mainboard
                </span>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !newDeckName.trim()}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : savedDecks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No saved decks yet</p>
          </div>
        ) : (
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {savedDecks.map((deck) => (
                <div
                  key={deck.id}
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-medium text-sm text-foreground truncate">
                      {deck.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {Array.isArray(deck.mainboard) 
                          ? deck.mainboard.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0) 
                          : 0} cards
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(deck.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleLoad(deck)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
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
      </div>
    </div>
  );
}
