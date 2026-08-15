/**
 * Legal pages — Privacy Policy and Terms of Service.
 *
 * These exist primarily because the Discord Developer Terms of Service and
 * Developer Policy require every app to publish a Privacy Policy and Terms of
 * Service at a stable public URL, and to disclose what Discord data the app
 * collects, why, how long it is kept, and how a user can have it deleted.
 *
 * Legal text is intentionally kept in English only: it is the canonical version
 * users and Discord review, and a machine-translated legal document would be
 * less accurate than the original. All surrounding chrome stays localized.
 *
 * @module pages/LegalPage
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { applySeoMeta } from '@/lib/seo';

/** Last substantive revision of both documents. */
const LAST_UPDATED = 'August 15, 2026';
/** Retention window for analytics rows, matching the cleanup-logs job. */
const RETENTION_DAYS = 30;
const DISCORD_INVITE = 'https://discord.gg/9UEv6vrTD4';
const GITHUB_ISSUES = 'https://github.com/vermosi/offmeta/issues';

type Section = { heading: string; body: React.ReactNode };

function Prose({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.heading}>
          <h2 className="font-display text-lg font-extrabold uppercase tracking-tight text-foreground">
            {section.heading}
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            {section.body}
          </div>
        </section>
      ))}
    </div>
  );
}

const CONTACT = (
  <p>
    Email{' '}
    <a
      className="text-primary underline underline-offset-4"
      href="mailto:admin@offmeta.app"
    >
      admin@offmeta.app
    </a>
    , contact us in the{' '}
    <a
      className="text-primary underline underline-offset-4"
      href={DISCORD_INVITE}
      target="_blank"
      rel="noopener noreferrer"
    >
      OffMeta Discord server
    </a>
    , or open an issue on{' '}
    <a
      className="text-primary underline underline-offset-4"
      href={GITHUB_ISSUES}
      target="_blank"
      rel="noopener noreferrer"
    >
      GitHub
    </a>
    .
  </p>
);

const PRIVACY_SECTIONS: Section[] = [
  {
    heading: 'What this covers',
    body: (
      <p>
        This policy covers offmeta.app and the OffMeta Discord application (the
        “bot”). OffMeta is a search tool for Magic: The Gathering cards. We
        collect the minimum needed to run and improve search.
      </p>
    ),
  },
  {
    heading: 'Website data',
    body: (
      <>
        <p>
          When you search on offmeta.app we store the search text, the generated
          Scryfall query, the outcome, and coarse performance timings, along with
          a random session identifier. This is what lets us find searches that
          return nothing and fix them.
        </p>
        <p>
          If you create an account, we store your email address (handled by our
          authentication provider), your display name, and the cards, searches,
          and history you choose to save. You can delete saved items at any time
          from your account.
        </p>
      </>
    ),
  },
  {
    heading: 'Discord data',
    body: (
      <>
        <p>
          The bot only receives what Discord sends with a slash command
          interaction. We use your Discord user ID solely to enforce a per-user
          rate limit in memory, and it is never written to our database in raw
          form: before anything is stored it is replaced with a one-way,
          salted hash (a pseudonymous identifier that cannot be reversed back
          into your Discord ID).
        </p>
        <p>
          What we store for each bot interaction: the hashed identifier, the
          server (guild) ID, the search text you typed, the generated Scryfall
          query, the result count, and timing. We do not read message content,
          we do not store your username, avatar, email, or roles, and the bot
          requires no message-content or member intents.
        </p>
        <p>
          We do not sell Discord data, do not use it for advertising or
          profiling, do not use it to train machine-learning models, and do not
          share it with third parties beyond the infrastructure providers that
          host OffMeta.
        </p>
      </>
    ),
  },
  {
    heading: 'How long we keep it',
    body: (
      <p>
        Search and bot analytics rows are deleted automatically after{' '}
        {RETENTION_DAYS} days by a scheduled job. Account data is kept until you
        delete the item or your account. Removing the bot from a server stops
        all new collection immediately, and any remaining rows age out on the
        same {RETENTION_DAYS}-day schedule.
      </p>
    ),
  },
  {
    heading: 'Your choices',
    body: (
      <>
        <p>
          You can ask us to delete data associated with your account or your
          Discord identifier, and we will action it. Because Discord IDs are
          stored only as hashes, we will ask you to run the command once so we
          can match the same hash.
        </p>
        {CONTACT}
      </>
    ),
  },
  {
    heading: 'Children',
    body: (
      <p>
        OffMeta is not directed at children. You must meet Discord’s minimum age
        requirement for your country to use the bot.
      </p>
    ),
  },
  {
    heading: 'Changes',
    body: (
      <p>
        We will update this page when our practices change and revise the date
        below. Material changes affecting the Discord app will also be announced
        in the OffMeta Discord server.
      </p>
    ),
  },
];

const TERMS_SECTIONS: Section[] = [
  {
    heading: 'Using OffMeta',
    body: (
      <p>
        OffMeta is provided free of charge for personal, non-commercial use.
        Don’t abuse it: no automated scraping of the site or bot, no attempts to
        bypass rate limits, no reselling access, and nothing that would breach
        the Discord Terms of Service or Community Guidelines.
      </p>
    ),
  },
  {
    heading: 'The Discord app',
    body: (
      <>
        <p>
          Installing the OffMeta bot in a server means the server’s members can
          run its search command. Server administrators are responsible for
          whether the bot belongs in their server. Either side can end this at
          any time: you can remove the bot, and we may disable access for a user
          or server that abuses the service.
        </p>
        <p>
          Use of the bot is also governed by Discord’s Terms of Service and
          Privacy Policy. Where this document conflicts with Discord’s
          Developer Terms of Service or Developer Policy for the bot, Discord’s
          terms control.
        </p>
      </>
    ),
  },
  {
    heading: 'Card data and attribution',
    body: (
      <p>
        Card data, imagery, and prices come from Scryfall and other listed
        sources and remain subject to their terms. OffMeta is unofficial Fan
        Content permitted under the Wizards of the Coast Fan Content Policy and
        is not approved or endorsed by Wizards. Portions of the materials used
        are property of Wizards of the Coast LLC.
      </p>
    ),
  },
  {
    heading: 'No warranty',
    body: (
      <p>
        OffMeta is provided “as is”, without warranty of any kind. Search
        results, prices, and legality information may be incomplete or out of
        date — verify anything that matters before you buy or register a deck.
        To the extent permitted by law, we are not liable for losses arising
        from your use of the service.
      </p>
    ),
  },
  {
    heading: 'Contact',
    body: CONTACT,
  },
];

const PAGES = {
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy | OffMeta',
    eyebrow: 'OffMeta / Legal',
    heading: 'Privacy Policy',
    description:
      'How OffMeta handles search, account, and Discord data: what we collect, why, how long we keep it, and how to have it deleted.',
    sections: PRIVACY_SECTIONS,
    otherLabel: 'Read the Terms of Service',
    otherPath: '/terms',
  },
  terms: {
    path: '/terms',
    title: 'Terms of Service | OffMeta',
    eyebrow: 'OffMeta / Legal',
    heading: 'Terms of Service',
    description:
      'The terms for using OffMeta’s website and Discord app, including acceptable use, attribution, and disclaimers.',
    sections: TERMS_SECTIONS,
    otherLabel: 'Read the Privacy Policy',
    otherPath: '/privacy',
  },
} as const;

export type LegalDocument = keyof typeof PAGES;

export default function LegalPage({ document: doc }: { document: LegalDocument }) {
  const page = PAGES[doc];

  useEffect(() => {
    applySeoMeta({
      title: page.title,
      description: page.description,
      url: `https://offmeta.app${page.path}`,
    });
  }, [page]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container-main py-8 sm:py-12">
        <article className="mx-auto max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {page.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-4xl uppercase leading-[0.95] tracking-tight text-foreground md:text-5xl">
            {page.heading}
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated {LAST_UPDATED}
          </p>

          <div className="mt-10">
            <Prose sections={page.sections} />
          </div>

          <div className="mt-12 border-t border-border/50 pt-6">
            <Link
              to={page.otherPath}
              className="inline-flex min-h-9 items-center text-sm text-primary underline underline-offset-4"
            >
              {page.otherLabel}
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
