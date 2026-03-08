/**
 * Collection management page.
 * Lists all owned cards with search, sort, quantity controls, bulk import, value stats, and CSV export.
 * @module pages/Collection
 */

import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Search, Download, Plus, Minus, Trash2, Upload } from 'lucide-react';
import { PriceSparkline } from '@/components/collection/PriceSparkline';
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
import { BulkImportModal } from '@/components/collection/BulkImportModal';
import { CollectionStats } from '@/components/collection/CollectionStats';
import { useCollectionValue } from '@/hooks/useCollectionValue';

type SortMode = 'name' | 'quantity' | 'newest';

const DEMO_COLLECTION: CollectionCard[] = [
  { id: 'demo-1', card_name: 'Lightning Bolt', quantity: 4, foil: false, scryfall_id: null, user_id: '', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z' },
  { id: 'demo-2', card_name: 'Counterspell', quantity: 2, foil: true, scryfall_id: null, user_id: '', created_at: '2026-02-10T00:00:00Z', updated_at: '2026-02-10T00:00:00Z' },
  { id: 'demo-3', card_name: 'Sol Ring', quantity: 3, foil: false, scryfall_id: null, user_id: '', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z' },
  { id: 'demo-4', card_name: 'Swords to Plowshares', quantity: 2, foil: false, scryfall_id: null, user_id: '', created_at: '2026-03-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z' },
  { id: 'demo-5', card_name: 'Birds of Paradise', quantity: 1, foil: true, scryfall_id: null, user_id: '', created_at: '2026-02-20T00:00:00Z', updated_at: '2026-02-20T00:00:00Z' },
];

export default function Collection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: collection = [], isLoading } = useCollection();
  const updateQuantity = useUpdateCollectionQuantity();
  const removeCard = useRemoveFromCollection();

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('name');
  const [authOpen, setAuthOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { data: valueData } = useCollectionValue();

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
    const header = 'Card Name,Quantity,Foil,Price (USD),Date Added\n';
    const rows = collection
      .map((c) => {
        const price = valueData?.cardPrices.get(c.card_name);
        const priceStr = price != null ? price.toFixed(2) : '';
        return `"${c.card_name}",${c.quantity},${c.foil},${priceStr},${c.created_at.split('T')[0]}`;
      })
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collection.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: t('collection.exportCsv', 'Exported!'), description: `${collection.length} cards` });
  }, [collection, t, valueData]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center justify-center flex-col gap-3 py-6">
            <Package className="h-10 w-10 text-muted-foreground/40" />
            <h2 className="text-lg font-semibold">{t('collection.title', 'My Collection')}</h2>
            <p className="text-muted-foreground text-sm">Sign in to track your card collection.</p>
            <Button onClick={() => setAuthOpen(true)}>Sign In</Button>
          </div>

          {/* Demo preview */}
          <div className="space-y-2 opacity-70 pointer-events-none select-none">
            <p className="text-xs text-muted-foreground text-center italic">Preview — demo data</p>
            {DEMO_COLLECTION.map((card) => (
              <div
                key={card.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 bg-card/50"
              >
                <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
                  {card.card_name}
                </span>
                {card.foil && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                    Foil
                  </span>
                )}
                <PriceSparkline cardName={card.card_name} demo />
                <span className="text-sm font-semibold tabular-nums min-w-[1.5rem] text-center">
                  {card.quantity}
                </span>
              </div>
            ))}
          </div>
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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Import</span>
            </Button>
            {collection.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">CSV</span>
              </Button>
            )}
          </div>
        </div>

        {/* Collection Value Stats */}
        {collection.length > 0 && <CollectionStats />}

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
            {collection.length === 0 && (
              <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5 mt-2">
                <Upload className="h-3.5 w-3.5" />
                Bulk Import
              </Button>
            )}
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
      <BulkImportModal open={importOpen} onOpenChange={setImportOpen} />
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
      <PriceSparkline cardName={card.card_name} />
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
