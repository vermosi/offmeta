import type { ElementType } from 'react';
import { Loader2 } from 'lucide-react';

export function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = 'default',
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: 'border-border',
    success: 'border-success/30',
    warning: 'border-warning/30',
    danger: 'border-destructive/30',
  };

  return (
    <div
      className={`surface-elevated p-4 sm:p-5 border ${variantClasses[variant]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}

export function BarRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value} ({Math.round(pct)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pending',
      className:
        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
    processing: {
      label: 'Processing',
      className:
        'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
    },
    completed: {
      label: 'Completed',
      className:
        'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
    },
    updated_existing: {
      label: 'Updated',
      className:
        'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
    },
    done: {
      label: 'Resolved',
      className:
        'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
    },
    failed: {
      label: 'Failed',
      className:
        'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
    },
    skipped: {
      label: 'Skipped',
      className: 'bg-muted text-muted-foreground border-border',
    },
    duplicate: {
      label: 'Duplicate',
      className: 'bg-muted text-muted-foreground border-border',
    },
    archived: {
      label: 'Archived',
      className: 'bg-muted text-muted-foreground border-border',
    },
  };
  const { label, className } = map[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border px-2 py-0.5 flex-shrink-0 ${className}`}
    >
      {status === 'processing' && (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      )}
      {label}
    </span>
  );
}
