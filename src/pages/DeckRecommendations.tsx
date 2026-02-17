/**
 * Admin-only Deck Recommendations MVP page.
 * Paste a decklist → get AI-powered card recommendations.
 */

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { parseDecklist, type ParsedDecklist } from '@/lib/decklist-parser';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface RecommendedCard {
  name: string;
  reason: string;
  scryfall: {
    name: string;
    mana_cost: string;
    type_line: string;
    oracle_text: string;
    image_uri: string | null;
    scryfall_uri: string;
    prices: Record<string, string | null>;
  } | null;
}

interface Category {
  name: string;
  cards: RecommendedCard[];
}

interface RecResult {
  commander: string | null;
  deckSize: number;
  categories: Category[];
}

export default function DeckRecommendations() {
  const { user } = useAuth();
  const { hasRole: isAdmin, isLoading: roleLoading } = useUserRole('admin');
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedDecklist | null>(null);
  const [result, setResult] = useState<RecResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  if (roleLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  const handleParse = () => {
    if (!rawText.trim()) return;
    const p = parseDecklist(rawText);
    setParsed(p);
    setResult(null);
    if (p.cards.length === 0) {
      toast.error('No cards found. Check the format.');
    }
  };

  const handleGetRecs = async () => {
    if (!parsed || parsed.cards.length === 0) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('deck-recommendations', {
        body: { decklist: rawText, commander: parsed.commander },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as RecResult);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedCard(name);
    setTimeout(() => setCopiedCard(null), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container-main flex-1 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Deck Recommendations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Paste a decklist (Moxfield export format) and get AI-powered card suggestions.
          </p>
        </div>

        {/* Input */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm font-medium">Paste Decklist</label>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`1 Sol Ring\n1 Arcane Signet\n1x Kodama's Reach (CMR) 271\nCOMMANDER: Omnath, Locus of Creation`}
              className="min-h-[260px] font-mono text-xs"
              maxLength={10000}
            />
            <Button onClick={handleParse} variant="secondary" className="w-full">
              Parse Decklist
            </Button>
          </div>

          {/* Parsed summary */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Parsed Summary</h2>
            {parsed ? (
              <>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Commander:</span> {parsed.commander || 'Not detected'}</p>
                  <p><span className="text-muted-foreground">Total cards:</span> {parsed.totalCards}</p>
                  <p><span className="text-muted-foreground">Unique cards:</span> {parsed.cards.length}</p>
                </div>
                <div className="max-h-[180px] overflow-y-auto text-xs font-mono text-muted-foreground space-y-0.5">
                  {parsed.cards.map((c, i) => (
                    <div key={i}>{c.quantity}x {c.name}</div>
                  ))}
                </div>
                <Button onClick={handleGetRecs} disabled={loading || parsed.cards.length === 0} className="w-full gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? 'Analyzing...' : 'Get Recommendations'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Paste a decklist and click "Parse" to see a summary.</p>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">
              Recommendations for {result.commander || 'your deck'}
            </h2>
            {result.categories.map((cat) => (
              <section key={cat.name} className="space-y-3">
                <h3 className="text-lg font-semibold text-primary">{cat.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cat.cards.map((card) => (
                    <div
                      key={card.name}
                      className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
                    >
                      {card.scryfall?.image_uri ? (
                        <img
                          src={card.scryfall.image_uri}
                          alt={card.name}
                          className="w-full aspect-[488/680] object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full aspect-[488/680] bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          No image
                        </div>
                      )}
                      <div className="p-3 space-y-1.5 flex-1 flex flex-col">
                        <p className="text-sm font-medium leading-tight">{card.name}</p>
                        <p className="text-xs text-muted-foreground flex-1">{card.reason}</p>
                        {card.scryfall?.prices?.usd && (
                          <p className="text-xs font-medium text-primary">${card.scryfall.prices.usd}</p>
                        )}
                        <div className="flex gap-1.5 pt-1">
                          <button
                            onClick={() => copyName(card.name)}
                            className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1"
                          >
                            {copiedCard === card.name ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            Copy
                          </button>
                          {card.scryfall?.scryfall_uri && (
                            <a
                              href={card.scryfall.scryfall_uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Scryfall
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
