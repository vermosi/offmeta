/**
 * Search Syntax Cheat Sheet — maps natural language to Scryfall syntax.
 */

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface SyntaxRow {
  natural: string;
  scryfall: string;
  notes?: string;
}

const SYNTAX_EXAMPLES: { category: string; rows: SyntaxRow[] }[] = [
  {
    category: 'Colors',
    rows: [
      { natural: 'red creatures', scryfall: 'c:r t:creature' },
      { natural: 'blue and white instants', scryfall: 'c:wu t:instant' },
      { natural: 'mono green cards', scryfall: 'c=g' },
      { natural: 'colorless artifacts', scryfall: 'c:c t:artifact' },
      { natural: 'not black cards', scryfall: '-c:b' },
    ],
  },
  {
    category: 'Types & Subtypes',
    rows: [
      { natural: 'legendary creatures', scryfall: 't:legendary t:creature' },
      { natural: 'goblin tribal', scryfall: 't:creature t:goblin' },
      { natural: 'planeswalkers', scryfall: 't:planeswalker' },
      { natural: 'enchantment auras', scryfall: 't:enchantment t:aura' },
      { natural: 'artifact equipment', scryfall: 't:artifact t:equipment' },
    ],
  },
  {
    category: 'Mana Cost & CMC',
    rows: [
      { natural: 'cards that cost 3 or less', scryfall: 'cmc<=3' },
      { natural: 'expensive spells (7+)', scryfall: 'cmc>=7' },
      { natural: 'free spells', scryfall: 'cmc=0' },
      { natural: 'two-drops', scryfall: 'cmc=2' },
    ],
  },
  {
    category: 'Oracle Text (Abilities)',
    rows: [
      { natural: 'cards with flying', scryfall: 'o:flying' },
      { natural: 'cards that draw cards', scryfall: 'o:"draw a card"' },
      { natural: 'cards that make treasure', scryfall: 'o:"treasure token"' },
      { natural: 'ETB effects', scryfall: 'o:"enters the battlefield"' },
      { natural: 'cards that tutor', scryfall: 'o:"search your library"' },
    ],
  },
  {
    category: 'Power & Toughness',
    rows: [
      { natural: 'creatures with 5+ power', scryfall: 'pow>=5' },
      { natural: 'big toughness', scryfall: 'tou>=7' },
      { natural: 'power greater than toughness', scryfall: 'pow>tou' },
    ],
  },
  {
    category: 'Format & Legality',
    rows: [
      { natural: 'commander legal', scryfall: 'f:commander' },
      { natural: 'modern legal', scryfall: 'f:modern' },
      { natural: 'standard legal', scryfall: 'f:standard' },
      { natural: 'pauper staples', scryfall: 'f:pauper' },
    ],
  },
  {
    category: 'Price & Rarity',
    rows: [
      { natural: 'budget cards under $1', scryfall: 'usd<1' },
      { natural: 'mythic rares', scryfall: 'r:mythic' },
      { natural: 'commons', scryfall: 'r:common' },
      { natural: 'cheap rares under $5', scryfall: 'r:rare usd<5' },
    ],
  },
  {
    category: 'Sorting & Ordering',
    rows: [
      { natural: 'sort by price', scryfall: 'order:usd', notes: 'Append to any query' },
      { natural: 'sort by EDHREC rank', scryfall: 'order:edhrec' },
      { natural: 'newest first', scryfall: 'order:released dir:desc' },
    ],
  },
  {
    category: 'Slang & Shortcuts',
    rows: [
      { natural: 'ramp spells', scryfall: 'o:"add" t:sorcery OR t:instant', notes: 'OffMeta auto-translates' },
      { natural: 'removal', scryfall: 'o:"destroy" OR o:"exile"', notes: 'OffMeta auto-translates' },
      { natural: 'board wipes', scryfall: 'o:"destroy all" OR o:"exile all"', notes: 'OffMeta auto-translates' },
      { natural: 'mana rocks', scryfall: 't:artifact o:"add"', notes: 'OffMeta auto-translates' },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Failed to copy');
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
      aria-label={`Copy "${text}"`}
    >
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function SyntaxCheatSheet() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <Header />

      <main className="flex-1 container-main py-8 sm:py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Back link */}
          <Link
            to="/docs"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Docs
          </Link>

          {/* Hero */}
          <header className="space-y-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Search Syntax Cheat Sheet
            </h1>
            <p className="text-muted-foreground">
              OffMeta translates natural language to{' '}
              <a
                href="https://scryfall.com/docs/syntax"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Scryfall syntax
              </a>{' '}
              automatically. Here's a reference of what you can say and what it maps to.
            </p>
          </header>

          {/* Tables */}
          {SYNTAX_EXAMPLES.map((section) => (
            <section key={section.category} className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                {section.category}
              </h2>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        You type
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Scryfall syntax
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr
                        key={row.natural}
                        className="border-b border-border/30 last:border-0"
                      >
                        <td className="px-4 py-2.5 text-foreground">
                          {row.natural}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground break-all">
                              {row.scryfall}
                            </code>
                            <CopyButton text={row.scryfall} />
                            {row.notes && (
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                                {row.notes}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          {/* Tip */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/85">
            <strong>Tip:</strong> You don't need to memorize any of this! Just type what you're
            looking for in plain English and OffMeta will handle the translation.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
