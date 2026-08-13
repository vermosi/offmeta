/**
 * Release markers and structured experiments.
 *
 * Releases exist so metric movements can be correlated with product changes;
 * experiments track behavioural outcomes, not superficial UI preferences.
 */

import { ConsoleHeading, ConsolePanel, StatusTag } from '../components/console-ui';
import { EXPERIMENTS, RELEASES } from '@/lib/admin/releases';

export function ReleasesSection() {
  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="05"
        title="Releases"
        note="Correlate search success, zero results, refinement and latency with what shipped."
      />
      <div className="space-y-3">
        {RELEASES.map((release) => (
          <ConsolePanel key={release.version} title={`Release / ${release.version}`} note={release.date}>
            <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
              {release.changes.map((change) => (
                <li key={change} className="flex gap-2">
                  <span className="text-foreground">—</span>
                  {change}
                </li>
              ))}
            </ul>
          </ConsolePanel>
        ))}
      </div>
    </div>
  );
}

export function ExperimentsSection() {
  return (
    <div className="space-y-6">
      <ConsoleHeading
        index="05"
        title="Experiments"
        note="Judged on usage, not aesthetics."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {EXPERIMENTS.map((experiment) => (
          <ConsolePanel
            key={experiment.id}
            title={experiment.name}
            action={
              <StatusTag tone={experiment.status === 'running' ? 'good' : 'neutral'}>
                {experiment.status}
              </StatusTag>
            }
          >
            <p className="text-xs text-muted-foreground">{experiment.hypothesis}</p>
            <dl className="mt-3 space-y-1 font-mono text-[11px]">
              <div className="flex gap-2">
                <dt className="w-16 text-muted-foreground">Control</dt>
                <dd className="text-foreground">{experiment.control}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 text-muted-foreground">Variant</dt>
                <dd className="text-foreground">{experiment.variant}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 text-muted-foreground">Tracks</dt>
                <dd className="text-foreground">{experiment.metrics.join(', ')}</dd>
              </div>
            </dl>
          </ConsolePanel>
        ))}
      </div>
    </div>
  );
}
