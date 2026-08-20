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
import {
  applySeoMeta,
  injectJsonLdGraphs,
  buildWebSiteJsonLd,
  buildBreadcrumbJsonLd,
  buildDocsArticleJsonLd,
} from '@/lib/seo';


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
      className="inline-flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      aria-label={`Copy "${text}"`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function SyntaxCheatSheet() {
  const { t } = useTranslation();

  useEffect(() => {
    const cleanupSeo = applySeoMeta({
      title: 'Scryfall Syntax Cheat Sheet | OffMeta',
      description:
        'Scryfall syntax cheat sheet — maps natural-language MTG phrases to Scryfall operators: colors, types, mana cost, format, price, ramp, removal, and more.',
      url: 'https://offmeta.app/docs/syntax',
      type: 'article',
      section: 'Docs',
      keywords: [
        'Scryfall syntax',
        'Scryfall cheat sheet',
        'MTG search operators',
        'Scryfall query reference',
        'natural language to Scryfall',
        'MTG search syntax',
      ],
    });
    const cleanupLd = injectJsonLdGraphs([
      { slot: 'website', data: buildWebSiteJsonLd() },
      {
        slot: 'breadcrumb',
        data: buildBreadcrumbJsonLd([
          { name: 'OffMeta', url: 'https://offmeta.app/' },
          { name: 'Docs', url: 'https://offmeta.app/docs' },
          { name: 'Syntax Cheat Sheet', url: 'https://offmeta.app/docs/syntax' },
        ]),
      },
      {
        slot: 'article',
        data: buildDocsArticleJsonLd({
          title: 'Scryfall Syntax Cheat Sheet',
          description:
            'Maps natural-language MTG phrases to Scryfall operators: colors, types, mana cost, format, price, ramp, removal, and more.',
          url: 'https://offmeta.app/docs/syntax',
          section: 'Docs',
          keywords: [
            'Scryfall syntax',
            'MTG search operators',
            'Scryfall query reference',
          ],
        }),
      },
    ]);

    return () => {
      cleanupSeo();
      cleanupLd();
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

  const codeClass =
    'font-mono text-[11px] tracking-tight text-foreground underline decoration-border/70 decoration-dotted underline-offset-4';

  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-background overflow-x-hidden">
      <SkipLinks />
      <Header />

      <nav className="container-main pt-8" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          <li>
            <Link to="/" className="transition-colors hover:text-foreground">
              OffMeta
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/docs" className="transition-colors hover:text-foreground">
              {t('nav.docs', 'Docs')}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{t('docs.syntaxTitle', 'Search Syntax Cheat Sheet')}</li>
        </ol>
      </nav>

      <main id="main-content" className="container-main flex-1 pb-16 pt-8">
        <article className="mx-auto min-w-0 max-w-2xl">
          <header className="border-b border-border/60 pb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('docs.pageTitle', 'OffMeta Documentation')}
            </p>
            <h1 className="mt-4 break-words font-display text-[clamp(2rem,5vw,3.25rem)] font-extrabold uppercase leading-[0.9] tracking-tight text-foreground">
              {t('cheatSheet.pageHeading', 'Scryfall Syntax Cheat Sheet — Natural Language to MTG Search')}
            </h1>
            <p className="mt-4 break-words text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t('syntax.subtitle')}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Link
                to="/docs"
                className="inline-flex min-h-[36px] items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('syntax.backToDocs')}
              </Link>
            </div>
          </header>

          <section className="min-w-0 space-y-4 border-b border-border/50 py-8 text-base leading-relaxed text-foreground/90">
            <p>
              {t('cheatSheet.introPart1Pre', 'Scryfall uses a powerful query language to filter the entire Magic: The Gathering card database. Operators like')} <code className={codeClass}>t:</code> {t('cheatSheet.introType', '(type),')}{' '}
              <code className={codeClass}>c:</code> {t('cheatSheet.introColor', '(color),')}{' '}
              <code className={codeClass}>f:</code> {t('cheatSheet.introFormat', '(format),')}{' '}
              <code className={codeClass}>kw:</code> {t('cheatSheet.introKeyword', '(keyword),')}{' '}
              <code className={codeClass}>usd&lt;</code> {t('cheatSheet.introPrice', '(price), and')}{' '}
              <code className={codeClass}>otag:</code> {t('cheatSheet.introPart1Post', '(community tag) can be combined to build precise searches. OffMeta generates this syntax automatically from plain English descriptions — the table below shows what each phrase maps to so you can understand and edit the generated queries.')}
            </p>
            <p className="text-muted-foreground">
              {t('cheatSheet.introPart2', 'Each row shows an example natural language phrase you might type into OffMeta on the left, and the Scryfall syntax it produces on the right. Click the copy icon to copy any syntax string directly to your clipboard.')}
            </p>
          </section>

          {SYNTAX_EXAMPLES.map((section) => (
            <section key={section.categoryKey} className="border-b border-border/50 py-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {t(section.categoryKey)}
              </h2>
              <table className="mt-4 w-full text-sm">
                <caption className="sr-only">{t(section.categoryKey)}</caption>
                <thead>
                  <tr className="border-b border-border/40">
                    <th scope="col" className="py-2 pr-4 text-left font-mono text-[10px] font-normal uppercase tracking-[0.24em] text-muted-foreground">
                      {t('syntax.youType')}
                    </th>
                    <th scope="col" className="py-2 text-left font-mono text-[10px] font-normal uppercase tracking-[0.24em] text-muted-foreground">
                      {t('syntax.scryfallSyntax')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={row.natural} className="border-b border-border/20 last:border-0">
                      <td className="py-3 pr-4 align-middle text-foreground">{row.natural}</td>
                      <td className="py-3 align-middle">
                        <div className="flex items-center gap-1">
                          <code className="min-w-0 break-all font-mono text-[13px] text-foreground">
                            {row.scryfall}
                          </code>
                          <CopyButton text={row.scryfall} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          <section className="border-b border-border/50 py-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {t('syntax.tipLabel', 'Tip')}
            </p>
            <p className="mt-3 text-base leading-relaxed text-foreground/90">{t('syntax.tip')}</p>
          </section>

          {/* Closing explanatory section — gives Googlebot substantive prose */}
          <section className="space-y-4 py-8 text-base leading-relaxed text-foreground/90">
            <h2 className="font-display text-xl font-extrabold uppercase tracking-tight text-foreground">
              {t('cheatSheet.whyHeading', 'Why Use Natural Language Instead of Scryfall Syntax Directly?')}
            </h2>
            <p>
              {t('cheatSheet.whyPart1Pre', "Scryfall's query syntax is powerful but has a learning curve. You need to know that color identity uses")} <code className={codeClass}>id:</code> {t('cheatSheet.whyNot', 'not')}{' '}
              <code className={codeClass}>c:</code> {t('cheatSheet.whyForCommander', 'for Commander, that ramp spells are')}{' '}
              <code className={codeClass}>otag:mana-ramp</code> {t('cheatSheet.whyNot', 'not')}{' '}
              <code className={codeClass}>o:ramp</code>, {t('cheatSheet.whyKeywordAbilities', 'and that keyword abilities should use')}{' '}
              <code className={codeClass}>kw:</code> {t('cheatSheet.whyPart1Post', 'rather than oracle text search for accuracy. OffMeta handles all of this for you — just describe what you need and the correct query is generated automatically.')}
            </p>
            <p className="text-muted-foreground">
              {t('cheatSheet.whyPart2', "The cheat sheet above is useful for understanding what OffMeta generates, for learning Scryfall syntax if you want to write queries manually, and for editing the generated query in OffMeta's editable query bar to make precise adjustments.")}
            </p>
            <h2 className="pt-4 font-display text-xl font-extrabold uppercase tracking-tight text-foreground">
              {t('cheatSheet.operatorsHeading', 'Common Scryfall Syntax Operators Reference')}
            </h2>
            <ul className="divide-y divide-border/20 border-y border-border/40 text-sm">
              {[
                ['t:', t('cheatSheet.op.type', 'card type or subtype (creature, instant, dragon, elf…)')],
                ['c:', t('cheatSheet.op.color', 'color (r=red, u=blue, b=black, g=green, w=white)')],
                ['id:', t('cheatSheet.op.identity', 'color identity (for Commander deck building)')],
                ['f:', t('cheatSheet.op.format', 'format legality (commander, modern, standard, pauper…)')],
                ['kw:', t('cheatSheet.op.keyword', 'keyword ability (flying, haste, deathtouch, lifelink…)')],
                ['otag:', t('cheatSheet.op.otag', 'community function tag (ramp, removal, boardwipe, tutor…)')],
                ['usd<', t('cheatSheet.op.usd', 'price in US dollars (usd<5 means under $5)')],
                ['mv', t('cheatSheet.op.mv', 'mana value / converted mana cost (mv<=3 means 3 or less)')],
                ['pow / tou', t('cheatSheet.op.powTou', 'power and toughness (pow>=5 means 5 or more power)')],
                ['r:', t('cheatSheet.op.rarity', 'rarity (common, uncommon, rare, mythic)')],
                ['order:', t('cheatSheet.op.order', 'sort results (edhrec, usd, released, name…)')],
              ].map(([op, desc]) => (
                <li key={op} className="flex flex-wrap items-baseline gap-x-4 py-2.5">
                  <code className="font-mono text-[13px] text-foreground">{op}</code>
                  <span className="min-w-0 flex-1 text-muted-foreground">{desc}</span>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
