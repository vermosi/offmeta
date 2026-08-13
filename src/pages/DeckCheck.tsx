/**
 * Deck Check — deterministic deck intelligence.
 *
 * Paste a decklist (or import a public Moxfield deck), and OffMeta classifies
 * every card with the deterministic ontology to produce a coverage profile and
 * ranked gaps. Each gap links straight back into OffMeta search.
 * Stateless: nothing is stored.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { parseDecklist } from '@/lib/decklist-parser';
import {
  analyzeDeck,
  resolveDeckCards,
  COVERAGE_LABEL,
  type DeckProfile,
} from '@/lib/deck-intelligence';
import { applySeoMeta } from '@/lib/seo';
import { useAnalytics } from '@/hooks/useAnalytics';
import { trackFunnelStep } from '@/lib/analytics/funnels';
import { queryToSlug } from '@/lib/search-slug';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

const COLOR_QUERY: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
};

/** Build the Phase 7 gap query, colour-scoped to the deck. */
function gapHref(query: string, colors: string[]): string {
  const scoped =
    colors.length > 0 && colors.length <= 3
      ? `${query} in ${colors.map((c) => COLOR_QUERY[c]).join(' or ')}`
      : query;
  return `/search/${queryToSlug(scoped)}`;
}

function CoverageBar({ ratio }: { ratio: number }) {
  const filled = Math.round(Math.min(ratio, 1.5) * 8);
  return (
    <span
      aria-hidden="true"
      className="font-mono text-[11px] tracking-[0.25em] text-foreground"
    >
      {'█'.repeat(Math.min(filled, 12)).padEnd(12, '·')}
    </span>
  );
}

export default function DeckCheck() {
  const { t } = useTranslation();
  const [raw, setRaw] = useState('');
  const [moxfieldUrl, setMoxfieldUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState<DeckProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    const cleanup = applySeoMeta({
      title: t('deckCheck.seoTitle', 'MTG Deck Check — Find the Gaps in Your Deck | OffMeta'),
      description: t(
        'deckCheck.seoDescription',
        'Paste a Commander decklist and OffMeta classifies every card by role, method and problem answered, then shows which functional slots are missing.',
      ),
      url: 'https://offmeta.app/deck-check',
    });
    return cleanup;
  }, [t]);

  const parsed = useMemo(() => parseDecklist(raw), [raw]);

  const runAnalysis = async (text: string, source: 'paste' | 'moxfield' = 'paste') => {
    const deck = parseDecklist(text);
    if (deck.cards.length === 0) {
      setError(t('deckCheck.noCardsFound', 'No cards found in that list.'));
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const resolved = await resolveDeckCards(deck.cards);
      const analysed = analyzeDeck(resolved);
      setProfile(analysed);
      void trackEvent('deck_check_run', {
        source,
        card_count: deck.cards.length,
        resolved_count: resolved.length,
      });
      trackFunnelStep('deck_check', { source, card_count: deck.cards.length });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('deckCheck.analyseError', 'Could not analyse that decklist.'),
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMoxfield = async () => {
    const url = moxfieldUrl.trim();
    if (!url) return;
    setImporting(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{
        cards: string[];
        commanders: string[];
      }>('fetch-moxfield-deck', { body: { url } });

      if (fnError) {
        const details =
          fnError instanceof FunctionsHttpError
            ? await fnError.context.text()
            : fnError.message;
        let message = t('deckCheck.importError', 'Could not import that deck');
        try {
          message = (JSON.parse(details) as { error?: string }).error ?? message;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(message);
      }
      const names = [...(data?.commanders ?? []), ...(data?.cards ?? [])];
      if (names.length === 0) throw new Error(t('deckCheck.emptyDeck', 'That deck looks empty.'));
      const text = names.join('\n');
      setRaw(text);
      await runAnalysis(text, 'moxfield');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('deckCheck.importError', 'Could not import that deck');
      setError(message);
      toast.error(message);
    } finally {
      setImporting(false);
    }
  };

  const busy = analyzing || importing;

  return (
    <div className="min-h-screen bg-background">
      <SkipLinks />
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-4 pb-24">
        <p className="pt-10 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {t('deckCheck.eyebrow', 'OffMeta / Deck check')}
        </p>
        <h1 className="mt-4 font-display text-4xl uppercase leading-[0.95] tracking-tight md:text-5xl">
          {t('deckCheck.heading', 'What is your deck missing?')}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('deckCheck.description', 'Paste a decklist. OffMeta classifies every card with its deterministic ontology — roles, methods and the problems each card answers — then measures coverage against the slots a functional deck needs. Nothing is stored.')}
        </p>

        <section className="mt-10 border-t border-border pt-8">
          <label
            htmlFor="deck-moxfield"
            className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            {t('deckCheck.step1Label', '01 / Import from Moxfield')}
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              id="deck-moxfield"
              value={moxfieldUrl}
              onChange={(e) => setMoxfieldUrl(e.target.value)}
              placeholder={t('deckCheck.moxfieldPlaceholder', 'https://moxfield.com/decks/...')}
              className="rounded-none"
            />
            <Button
              onClick={handleMoxfield}
              disabled={busy || !moxfieldUrl.trim()}
              className="rounded-none"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('deckCheck.import', 'Import')
              )}
            </Button>
          </div>

          <label
            htmlFor="deck-raw"
            className="mt-8 block font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
          >
            {t('deckCheck.step2Label', '02 / Or paste a decklist')}
          </label>
          <Textarea
            id="deck-raw"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={10}
            placeholder={t('deckCheck.decklistPlaceholder', '1 Sol Ring\n1 Cultivate\n1 Swords to Plowshares')}
            className="mt-3 rounded-none font-mono text-xs"
          />
          <div className="mt-3 flex items-center gap-4">
            <Button
              onClick={() => runAnalysis(raw)}
              disabled={busy || parsed.cards.length === 0}
              className="rounded-none"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('deckCheck.analyseDeck', 'Analyse deck')
              )}
            </Button>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {t('deckCheck.cardsDetected', '{count} cards detected', { count: parsed.totalCards })}
            </span>
          </div>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>

        {profile && (
          <>
            <section className="mt-14 border-t border-border pt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {t('deckCheck.step3Label', '03 / Deck profile')}
              </h2>
              <p className="mt-3 font-mono text-xs text-muted-foreground">
                {t('deckCheck.profileSummary', '{total} cards · {lands} lands · {spells} spells', {
                  total: profile.totalCards,
                  lands: profile.landCount,
                  spells: profile.spellCount,
                })}
                {profile.colorIdentity.length > 0 &&
                  ` · ${profile.colorIdentity.join('')}`}
              </p>
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {profile.coverage.map((c) => (
                  <li
                    key={c.pillar.key}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3"
                  >
                    <span className="min-w-[190px] text-sm uppercase tracking-wide">
                      {c.pillar.label}
                    </span>
                    <CoverageBar ratio={c.ratio} />
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      {COVERAGE_LABEL[c.level]} · {c.count}/{c.benchmark}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-14 border-t border-border pt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {t('deckCheck.step4Label', '04 / Low coverage')}
              </h2>
              {profile.gaps.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {t('deckCheck.wellRounded', 'No pillar falls below benchmark. This deck is functionally well-rounded.')}
                </p>
              ) : (
                <ul className="mt-6 space-y-8">
                  {profile.gaps.map((gap) => (
                    <li key={gap.pillar.key}>
                      <p className="text-lg uppercase tracking-wide">
                        {gap.pillar.label}
                      </p>
                      <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                        {gap.pillar.rationale} {t('deckCheck.runningCount', 'You are running {count} where a comparable list usually wants around {benchmark}.', {
                          count: gap.count,
                          benchmark: gap.benchmark,
                        })}
                      </p>
                      <Link
                        to={gapHref(gap.pillar.gapQuery, profile.colorIdentity)}
                        className="mt-3 inline-flex items-center gap-2 border-b border-foreground pb-0.5 font-mono text-[11px] uppercase tracking-[0.25em] transition-opacity hover:opacity-70"
                      >
                        {t('deckCheck.findOptions', 'Find options')}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {(profile.unresolved.length > 0 || profile.untagged.length > 0) && (
              <section className="mt-14 border-t border-border pt-8">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {t('deckCheck.step5Label', '05 / Notes')}
                </h2>
                {profile.unresolved.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('deckCheck.notRecognised', 'Not recognised ({count}): {names}', {
                      count: profile.unresolved.length,
                      names: profile.unresolved.slice(0, 12).join(', '),
                    })}
                  </p>
                )}
                {profile.untagged.length > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {t('deckCheck.noFunctionalTags', 'No functional tags ({count}): {names}', {
                      count: profile.untagged.length,
                      names: profile.untagged.slice(0, 12).join(', '),
                    })}
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
