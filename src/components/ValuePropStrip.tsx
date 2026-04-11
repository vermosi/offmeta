/**
 * Value proposition — large glass cards with gradient icon backgrounds and hover glow.
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
      className="container-main pb-12 sm:pb-16"
      aria-label="Why use OffMeta"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8 stagger-children max-w-4xl mx-auto">
        {PROPS.map(({ icon: Icon, label, detail }) => (
          <div
            key={label}
            className="value-card glass-card flex flex-col items-center text-center p-7 sm:p-8 rounded-2xl group"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 group-hover:border-accent/50 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-accent/10">
              <Icon
                className="h-7 w-7 text-accent"
                aria-hidden="true"
              />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">
              {label}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
