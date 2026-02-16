/**
 * Docs landing page — indexes guides, FAQ, and syntax cheat sheet.
 */

import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { GUIDES } from '@/data/guides';
import { BookOpen, FileText, Sparkles, ChevronRight } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Search Syntax Cheat Sheet',
    description: 'Map natural language to Scryfall syntax with copy-paste examples.',
    href: '/docs/syntax',
    icon: Sparkles,
  },
  {
    title: 'Guides',
    description: `${GUIDES.length} in-depth guides covering common MTG search patterns.`,
    href: '/guides',
    icon: BookOpen,
  },
  {
    title: 'FAQ',
    description: 'Answers to frequently asked questions about OffMeta.',
    href: '/#faq',
    icon: FileText,
  },
] as const;

export default function DocsIndex() {
  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <Header />

      <main className="flex-1 container-main py-10 sm:py-14 lg:py-20">
        <div className="max-w-2xl mx-auto space-y-10">
          {/* Hero */}
          <header className="space-y-3 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground">
              Documentation
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Everything you need to get the most out of OffMeta search.
            </p>
          </header>

          {/* Section cards */}
          <div className="grid gap-4">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.href}
                  to={section.href}
                  className="group flex items-start gap-4 p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                >
                  <div className="mt-0.5 flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {section.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {section.description}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary transition-colors mt-1 flex-shrink-0" />
                </Link>
              );
            })}
          </div>

          {/* Quick guide list */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">All Guides</h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {GUIDES.map((guide) => (
                <Link
                  key={guide.slug}
                  to={`/guides/${guide.slug}`}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                  <span>{guide.title}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
