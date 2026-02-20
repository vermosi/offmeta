/**
 * Search Syntax Cheat Sheet — maps natural language to Scryfall syntax.
 */

import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { SkipLinks } from '@/components/SkipLinks';

interface SyntaxRow {
  natural: string;
  scryfall: string;
  notes?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t('syntax.copied', 'Copied!'));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('syntax.copyFailed', 'Failed to copy'));
    }
  }, [text, t]);

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
  const { t } = useTranslation();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Scryfall Syntax Cheat Sheet — Natural Language MTG Search Reference | OffMeta';
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'syntax-jsonld';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'OffMeta', item: 'https://offmeta.app/' },
        { '@type': 'ListItem', position: 2, name: 'Docs', item: 'https://offmeta.app/docs' },
        { '@type': 'ListItem', position: 3, name: 'Syntax Cheat Sheet', item: 'https://offmeta.app/docs/syntax' },
      ],
    });
    document.head.appendChild(s);
    return () => {
      document.title = prev;
      document.getElementById('syntax-jsonld')?.remove();
    };
  }, []);

  const SYNTAX_EXAMPLES: { categoryKey: string; rows: SyntaxRow[] }[] = useMemo(() => [
    {
      categoryKey: 'syntax.cat.colors',
      rows: [
        { natural: t('syntax.ex.redCreatures', 'red creatures'), scryfall: 'c:r t:creature' },
        { natural: t('syntax.ex.blueWhiteInstants', 'blue and white instants'), scryfall: 'c:wu t:instant' },
        { natural: t('syntax.ex.monoGreen', 'mono green cards'), scryfall: 'c=g' },
        { natural: t('syntax.ex.colorlessArtifacts', 'colorless artifacts'), scryfall: 'c:c t:artifact' },
        { natural: t('syntax.ex.notBlack', 'not black cards'), scryfall: '-c:b' },
      ],
    },
    {
      categoryKey: 'syntax.cat.types',
      rows: [
        { natural: t('syntax.ex.legendaryCreatures', 'legendary creatures'), scryfall: 't:legendary t:creature' },
        { natural: t('syntax.ex.goblinTribal', 'goblin tribal'), scryfall: 't:creature t:goblin' },
        { natural: t('syntax.ex.planeswalkers', 'planeswalkers'), scryfall: 't:planeswalker' },
        { natural: t('syntax.ex.enchantmentAuras', 'enchantment auras'), scryfall: 't:enchantment t:aura' },
        { natural: t('syntax.ex.artifactEquipment', 'artifact equipment'), scryfall: 't:artifact t:equipment' },
      ],
    },
    {
      categoryKey: 'syntax.cat.manaCost',
      rows: [
        { natural: t('syntax.ex.cost3OrLess', 'cards that cost 3 or less'), scryfall: 'mv<=3' },
        { natural: t('syntax.ex.expensive7Plus', 'expensive spells (7+)'), scryfall: 'mv>=7' },
        { natural: t('syntax.ex.freeSpells', 'free spells'), scryfall: 'mv=0' },
        { natural: t('syntax.ex.twoDrops', 'two-drops'), scryfall: 'mv=2' },
      ],
    },
    {
      categoryKey: 'syntax.cat.oracleText',
      rows: [
        { natural: t('syntax.ex.withFlying', 'cards with flying'), scryfall: 'o:flying' },
        { natural: t('syntax.ex.drawCards', 'cards that draw cards'), scryfall: 'otag:card-draw' },
        { natural: t('syntax.ex.makeTreasure', 'cards that make treasure'), scryfall: 'otag:treasure-generator' },
        { natural: t('syntax.ex.etbEffects', 'ETB effects'), scryfall: 'o:"enters"' },
        { natural: t('syntax.ex.tutors', 'cards that tutor'), scryfall: 'otag:tutor' },
      ],
    },
    {
      categoryKey: 'syntax.cat.powerToughness',
      rows: [
        { natural: t('syntax.ex.power5Plus', 'creatures with 5+ power'), scryfall: 'pow>=5' },
        { natural: t('syntax.ex.bigToughness', 'big toughness'), scryfall: 'tou>=7' },
        { natural: t('syntax.ex.powerGtToughness', 'power greater than toughness'), scryfall: 'pow>tou' },
      ],
    },
    {
      categoryKey: 'syntax.cat.format',
      rows: [
        { natural: t('syntax.ex.commanderLegal', 'commander legal'), scryfall: 'f:commander' },
        { natural: t('syntax.ex.modernLegal', 'modern legal'), scryfall: 'f:modern' },
        { natural: t('syntax.ex.standardLegal', 'standard legal'), scryfall: 'f:standard' },
        { natural: t('syntax.ex.pauperStaples', 'pauper staples'), scryfall: 'f:pauper' },
      ],
    },
    {
      categoryKey: 'syntax.cat.price',
      rows: [
        { natural: t('syntax.ex.budgetUnder1', 'budget cards under $1'), scryfall: 'usd<1' },
        { natural: t('syntax.ex.mythicRares', 'mythic rares'), scryfall: 'r:mythic' },
        { natural: t('syntax.ex.commons', 'commons'), scryfall: 'r:common' },
        { natural: t('syntax.ex.cheapRares', 'cheap rares under $5'), scryfall: 'r:rare usd<5' },
      ],
    },
    {
      categoryKey: 'syntax.cat.sorting',
      rows: [
        { natural: t('syntax.ex.sortByPrice', 'sort by price'), scryfall: 'order:usd' },
        { natural: t('syntax.ex.sortByEdhrec', 'sort by EDHREC rank'), scryfall: 'order:edhrec' },
        { natural: t('syntax.ex.newestFirst', 'newest first'), scryfall: 'order:released dir:desc' },
      ],
    },
    {
      categoryKey: 'syntax.cat.slang',
      rows: [
        { natural: t('syntax.ex.rampSpells', 'ramp spells'), scryfall: 'otag:ramp (t:instant or t:sorcery)' },
        { natural: t('syntax.ex.removal', 'removal'), scryfall: 'otag:removal' },
        { natural: t('syntax.ex.boardWipes', 'board wipes'), scryfall: 'otag:board-wipe' },
        { natural: t('syntax.ex.manaRocks', 'mana rocks'), scryfall: 'otag:mana-rock' },
        { natural: t('syntax.ex.counterspells', 'counterspells'), scryfall: 'otag:counterspell' },
      ],
    },
  ], [t]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <SkipLinks />
      <Header />

      <main id="main-content" className="flex-1 container-main py-8 sm:py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <Link
            to="/docs"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('syntax.backToDocs')}
          </Link>

          <header className="space-y-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-foreground">
              Scryfall Syntax Cheat Sheet — Natural Language to MTG Search
            </h1>
            <p className="text-muted-foreground">
              {t('syntax.subtitle')}
            </p>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-2 border-b border-border/30 pb-6">
              <p>
                Scryfall uses a powerful query language to filter the entire Magic: The Gathering
                card database. Operators like <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">t:</code> (type),{' '}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">c:</code> (color),{' '}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">f:</code> (format),{' '}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">kw:</code> (keyword),{' '}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">usd&lt;</code> (price), and{' '}
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">otag:</code> (community tag) can be combined to
                build precise searches. OffMeta generates this syntax automatically from plain
                English descriptions — the table below shows what each phrase maps to so you can
                understand and edit the generated queries.
              </p>
              <p>
                Each row shows an example natural language phrase you might type into OffMeta on
                the left, and the Scryfall syntax it produces on the right. Click the copy icon
                to copy any syntax string directly to your clipboard.
              </p>
            </div>
          </header>

          {SYNTAX_EXAMPLES.map((section) => (
            <section key={section.categoryKey} className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                {t(section.categoryKey)}
              </h2>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('syntax.youType')}
                      </th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {t('syntax.scryfallSyntax')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.natural} className="border-b border-border/30 last:border-0">
                        <td className="px-4 py-2.5 text-foreground">{row.natural}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground break-all">{row.scryfall}</code>
                            <CopyButton text={row.scryfall} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/85">
            <strong>Tip:</strong> {t('syntax.tip')}
          </div>

          {/* Closing explanatory section — gives Googlebot substantive prose */}
          <section className="space-y-3 border-t border-border/30 pt-6 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-base font-semibold text-foreground">
              Why Use Natural Language Instead of Scryfall Syntax Directly?
            </h2>
            <p>
              Scryfall's query syntax is powerful but has a learning curve. You need to know that
              color identity uses <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">id:</code> not{' '}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">c:</code> for Commander, that ramp spells are{' '}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">otag:mana-ramp</code> not{' '}
              <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">o:ramp</code>, and that keyword abilities
              should use <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">kw:</code> rather than oracle text
              search for accuracy. OffMeta handles all of this for you — just describe what you
              need and the correct query is generated automatically.
            </p>
            <p>
              The cheat sheet above is useful for understanding what OffMeta generates, for
              learning Scryfall syntax if you want to write queries manually, and for editing
              the generated query in OffMeta's editable query bar to make precise adjustments.
            </p>
            <h2 className="text-base font-semibold text-foreground mt-4">
              Common Scryfall Syntax Operators Reference
            </h2>
            <ul className="space-y-1 list-disc list-inside">
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">t:</code> — card type or subtype (creature, instant, dragon, elf…)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">c:</code> — color (r=red, u=blue, b=black, g=green, w=white)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">id:</code> — color identity (for Commander deck building)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">f:</code> — format legality (commander, modern, standard, pauper…)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">kw:</code> — keyword ability (flying, haste, deathtouch, lifelink…)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">otag:</code> — community function tag (ramp, removal, boardwipe, tutor…)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">usd&lt;</code> — price in US dollars (usd&lt;5 means under $5)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">mv</code> — mana value / converted mana cost (mv&lt;=3 means 3 or less)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">pow / tou</code> — power and toughness (pow&gt;=5 means 5 or more power)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">r:</code> — rarity (common, uncommon, rare, mythic)</li>
              <li><code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">order:</code> — sort results (edhrec, usd, released, name…)</li>
            </ul>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
