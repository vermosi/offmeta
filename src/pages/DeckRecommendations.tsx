/**
 * Deck Recommendations page.
 * Paste a decklist or import from Moxfield URL → get AI-powered card recommendations.
 */

import { useState } from 'react';
import type { ScryfallCard } from '@/types/card';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { parseDecklist, type ParsedDecklist } from '@/lib/decklist-parser';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, ExternalLink, Copy, Check, Link2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ManaSymbol } from '@/components/ManaSymbol';

const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;
const COLOR_NAMES: Record<string, string> = { W: 'White', U: 'Blue', B: 'Black', R: 'Red', G: 'Green' };

interface RecommendedCard {
  name: string;
  reason: string;
  scryfall: ScryfallCard | null;
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

type InputMode = 'paste' | 'url';

export default function DeckRecommendations() {
  const [inputMode, setInputMode] = useState<InputMode>('url');
  const [rawText, setRawText] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [moxfieldDeckName, setMoxfieldDeckName] = useState<string | null>(null);
  const [fetchingDeck, setFetchingDeck] = useState(false);
  const [parsed, setParsed] = useState<ParsedDecklist | null>(null);
  const [colorIdentity, setColorIdentity] = useState<string[]>([]);
  const [result, setResult] = useState<RecResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  const handleFetchMoxfield = async () => {
    if (!moxfieldUrl.trim()) return;
    setFetchingDeck(true);
    setMoxfieldDeckName(null);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-moxfield-deck', {
        body: { url: moxfieldUrl.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRawText(data.decklist);
      setMoxfieldDeckName(data.deckName);
      setColorIdentity(data.colorIdentity ?? []);
      const p = parseDecklist(data.decklist);
      setParsed(p);
      setResult(null);
      toast.success(`Imported "${data.deckName}" (${data.cardCount} cards)`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch deck from Moxfield';
      toast.error(msg);
    } finally {
      setFetchingDeck(false);
    }
  };

  const handleParse = () => {
    if (!rawText.trim()) return;
    const p = parseDecklist(rawText);
    setParsed(p);
    setColorIdentity([]); // No color data from paste — will be empty until Moxfield import
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
        body: { decklist: rawText, commander: parsed.commander, colorIdentity },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as RecResult);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to get recommendations';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopiedCard(name);
    setTimeout(() => setCopiedCard(null), 1500);
  };

  const copyAllRecs = () => {
    if (!result) return;
    const lines = result.categories.flatMap((cat) =>
      [`// ${cat.name}`, ...cat.cards.map((c) => `1 ${c.name}`)]
    );
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    toast.success('All recommendations copied to clipboard');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container-main flex-1 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Deck Recommendations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Import a deck from Moxfield or paste a decklist to get AI-powered card suggestions.
          </p>
        </div>

        {/* Input mode tabs */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="flex gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
              <button
                onClick={() => setInputMode('url')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  inputMode === 'url' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Moxfield URL
              </button>
              <button
                onClick={() => setInputMode('paste')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                  inputMode === 'paste' ? 'bg-background text-foreground shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Paste List
              </button>
            </div>

            {inputMode === 'url' ? (
              <div className="space-y-3">
                <label className="text-sm font-medium">Moxfield Deck URL</label>
                <Input
                  value={moxfieldUrl}
                  onChange={(e) => setMoxfieldUrl(e.target.value)}
                  placeholder="https://www.moxfield.com/decks/xqpbIjgy5UqsUBxorCsT2w"
                  className="font-mono text-xs"
                />
                <Button onClick={handleFetchMoxfield} disabled={fetchingDeck || !moxfieldUrl.trim()} variant="secondary" className="w-full gap-2">
                  {fetchingDeck ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {fetchingDeck ? 'Fetching...' : 'Import from Moxfield'}
                </Button>
                {moxfieldDeckName && (
                  <p className="text-xs text-muted-foreground">
                    ✓ Imported: <span className="font-medium text-foreground">{moxfieldDeckName}</span>
                  </p>
                )}
              </div>
            ) : (
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
            )}
          </div>

          {/* Parsed summary */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <h2 className="text-sm font-semibold">Parsed Summary</h2>
            {parsed ? (
              <>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Commander:</span> {parsed.commander || 'Not detected'}</p>
                  {colorIdentity.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Colors:</span>
                      <span className="inline-flex items-center gap-1">
                        {WUBRG.map((c) => (
                          <span
                            key={c}
                            className={`transition-opacity ${colorIdentity.includes(c) ? 'opacity-100' : 'opacity-20'}`}
                            title={COLOR_NAMES[c]}
                          >
                            <ManaSymbol symbol={c} size="sm" />
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
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
              <p className="text-sm text-muted-foreground">
                {inputMode === 'url'
                  ? 'Import a Moxfield deck to see its summary.'
                  : 'Paste a decklist and click "Parse" to see a summary.'}
              </p>
            )}
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Recommendations for {result.commander || 'your deck'}
              </h2>
              <Button variant="secondary" size="sm" className="gap-1.5" onClick={copyAllRecs}>
                {copiedAll ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedAll ? 'Copied!' : 'Copy All'}
              </Button>
            </div>
            {result.categories.map((cat) => (
              <section key={cat.name} className="space-y-3">
                <h3 className="text-lg font-semibold text-primary">{cat.name}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cat.cards.map((card) => (
                    <div
                      key={card.name}
                      className="rounded-xl border border-border bg-card overflow-hidden flex flex-col"
                    >
                      {(card.scryfall?.image_uris?.normal ?? card.scryfall?.card_faces?.[0]?.image_uris?.normal) ? (
                        <img
                          src={(card.scryfall?.image_uris?.normal ?? card.scryfall?.card_faces?.[0]?.image_uris?.normal)!}
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