/**
 * Value proposition — 3 frosted-glass cards with icons.
 * @module components/ValuePropStrip
 */

import { Eye, Zap, Gift } from 'lucide-react';

const PROPS = [
  {
    icon: Eye,
    label: 'Transparent',
    detail: 'See the exact query running behind the scenes',
  },
  {
    icon: Zap,
    label: 'Instant',
    detail: 'Natural language to results in seconds',
  },
  {
    icon: Gift,
    label: 'Free',
    detail: 'No account, no signup, no limits',
  },
] as const;

export function ValuePropStrip() {
  return (
    <section
      className="container-main pb-8 sm:pb-12"
      aria-label="Why use OffMeta"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 stagger-children max-w-3xl mx-auto">
        {PROPS.map(({ icon: Icon, label, detail }) => (
          <div
            key={label}
            className="glass-card flex flex-col items-center text-center p-5 sm:p-6 rounded-2xl"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-accent/10 border border-accent/20">
              <Icon
                className="h-5 w-5 text-accent"
                aria-hidden="true"
              />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {label}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
