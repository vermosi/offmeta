/**
 * Collection management page.
 * Lists all owned cards with search, sort, quantity controls, and CSV export.
 * @module pages/Collection
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Search, Download, Plus, Minus, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from '@/components/AuthModal';
import {
  useCollection,
  useUpdateCollectionQuantity,
  useRemoveFromCollection,
  type CollectionCard,
} from '@/hooks/useCollection';
import { useTranslation } from '@/lib/i18n';
import { toast } from '@/hooks/useToast';

type SortMode = 'name' | 'quantity' | 'newest';

export default function Collection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: collection = [], isLoading } = useCollection();
  const updateQuantity = useUpdateCollectionQuantity();
  const removeCard = useRemoveFromCollection();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('name');
  const [authOpen, setAuthOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = [...collection];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.card_name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'quantity':
          return b.quantity - a.quantity;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return a.card_name.localeCompare(b.card_name);
      }
    });
    return result;
  }, [collection, search, sortBy]);

  const totalCards = useMemo(
    () => collection.reduce((sum, c) => sum + c.quantity, 0),
    [collection],
  );

  const handleExportCsv = useCallback(() => {
    const header = 'Card Name,Quantity,Foil,Date Added\n';
    const rows = collection
      .map((c) => `"${c.card_name}",${c.quantity},${c.foil},${c.created_at.split('T')[0]}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collection.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t('collection.exportCsv', 'Exported!'), description: `${collection.length} cards` });
  }, [collection, t]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <Package className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">{t('collection.title', 'My Collection')}</h2>
          <p className="text-muted-foreground text-sm">Sign in to track your card collection.</p>
          <Button onClick={() => setAuthOpen(true)}>Sign In</Button>
        </div>
        <Footer />
        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link to="/" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('collection.title', 'My Collection')}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('collection.subtitle', '{count} unique cards · {total} total').replace('{count}', String(collection.length)).replace('{total}', String(totalCards))}
            </p>
          </div>
          {collection.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
          )}
        </div>

        {/* Search + Sort */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('collection.searchPlaceholder', 'Search your collection...')}
              className="pl-9 h-9"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">A–Z</SelectItem>
              <SelectItem value="quantity">Quantity</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Collection List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 shimmer rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {collection.length === 0
                ? t('collection.empty', 'Your collection is empty. Add cards from search results!')
                : t('collection.noMatch', 'No cards match your search.')}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((card) => (
              <CollectionRow
                key={card.id}
                card={card}
                onUpdateQuantity={(qty) => updateQuantity.mutate({ id: card.id, quantity: qty })}
                onRemove={() => removeCard.mutate(card.id)}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function CollectionRow({
  card,
  onUpdateQuantity,
  onRemove,
}: {
  card: CollectionCard;
  onUpdateQuantity: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/50 transition-colors">
      <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
        {card.card_name}
      </span>
      {card.foil && (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
          Foil
        </span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onUpdateQuantity(card.quantity - 1)}
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Decrease quantity"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-sm font-semibold tabular-nums min-w-[1.5rem] text-center">
          {card.quantity}
        </span>
        <button
          onClick={() => onUpdateQuantity(card.quantity + 1)}
          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Increase quantity"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>
      <button
        onClick={onRemove}
        className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
        aria-label="Remove from collection"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
