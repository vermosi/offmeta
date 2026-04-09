/**
 * Compact value proposition strip replacing the verbose HomepageLandingContent.
 * @module components/ValuePropStrip
 */

import { Eye, Zap, Gift } from 'lucide-react';

const PROPS = [
  { icon: Eye, label: 'Transparent', detail: 'See the exact query running' },
  { icon: Zap, label: 'Instant', detail: 'Natural language → results in seconds' },
  { icon: Gift, label: 'Free', detail: 'No account or signup needed' },
] as const;

export function ValuePropStrip() {
  return (
    <section
      className="container-main pb-6 sm:pb-10"
      aria-label="Why use OffMeta"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-center">
        {PROPS.map(({ icon: Icon, label, detail }) => (
          <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="h-4 w-4 text-accent flex-shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium text-foreground">{label}:</span>{' '}
              {detail}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
