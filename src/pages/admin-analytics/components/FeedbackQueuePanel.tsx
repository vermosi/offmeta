import { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Loader2,
  MessageSquareWarning,
  RefreshCw,
  RotateCcw,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/pages/admin-analytics/components/AnalyticsPrimitives';
import type {
  FeedbackFilter,
  FeedbackItem,
} from '@/pages/admin-analytics/types';

interface FeedbackQueuePanelProps {
  feedbackLoading: boolean;
  feedbackFilter: FeedbackFilter;
  setFeedbackFilter: (value: FeedbackFilter) => void;
  filteredFeedback: FeedbackItem[];
  pendingFeedbackCount: number;
  archivedFeedbackCount: number;
  processAllPending: () => void;
  processingAllPending: boolean;
  fetchFeedback: () => void;
  ruleTogglingId: string | null;
  retriggeringId: string | null;
  toggleRuleActive: (
    feedbackId: string,
    ruleId: string,
    currentActive: boolean,
  ) => void;
  retriggerFeedback: (feedbackId: string) => void;
}

export function FeedbackQueuePanel(props: FeedbackQueuePanelProps) {
  const {
    feedbackLoading,
    feedbackFilter,
    setFeedbackFilter,
    filteredFeedback,
    pendingFeedbackCount,
    archivedFeedbackCount,
    processAllPending,
    processingAllPending,
    fetchFeedback,
    ruleTogglingId,
    retriggeringId,
    toggleRuleActive,
    retriggerFeedback,
  } = props;
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(
    new Set(),
  );

  return (
    <div className="surface-elevated border border-border mt-8 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
          <MessageSquareWarning className="h-4 w-4 text-warning" />
          Feedback Queue
          {pendingFeedbackCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {pendingFeedbackCount} pending
            </Badge>
          )}
          {archivedFeedbackCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] text-muted-foreground gap-1"
            >
              <Archive className="h-2.5 w-2.5" />
              {archivedFeedbackCount} archived
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {pendingFeedbackCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={processAllPending}
              disabled={processingAllPending}
              className="h-8 text-xs gap-1"
            >
              {processingAllPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
              Process All Pending
            </Button>
          )}
          <Select
            value={feedbackFilter}
            onValueChange={(value) =>
              setFeedbackFilter(value as FeedbackFilter)
            }
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFeedback}
            disabled={feedbackLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${feedbackLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      {feedbackLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
          {filteredFeedback.map((item) => {
            const status = item.processing_status ?? 'pending';
            const isExpanded = expandedFeedback.has(item.id);
            const rule = item.translation_rules;
            const canRetrigger = status === 'failed' || status === 'skipped';
            return (
              <div key={item.id} className="px-5 py-4 space-y-3">
                <div className="flex items-start gap-3">
                  <StatusBadge status={status} />
                  <div className="flex-1">
                    <p className="text-sm">“{item.original_query}”</p>
                  </div>
                  <button
                    onClick={() =>
                      setExpandedFeedback((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      })
                    }
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.issue_description}
                </p>
                {isExpanded && item.translated_query && (
                  <div className="flex gap-1 text-xs">
                    <Code2 className="h-3.5 w-3.5" />
                    <span className="font-mono">{item.translated_query}</span>
                  </div>
                )}
                {rule && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <div className="text-[10px] uppercase flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI-Generated Rule
                    </div>
                    <div className="text-xs">
                      {rule.pattern} →{' '}
                      <span className="font-mono">{rule.scryfall_syntax}</span>
                    </div>
                    <div className="flex justify-end">
                      {rule.is_active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={ruleTogglingId === item.id}
                          onClick={() =>
                            toggleRuleActive(
                              item.id,
                              item.generated_rule_id!,
                              true,
                            )
                          }
                        >
                          <XCircle className="h-3 w-3" />
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={ruleTogglingId === item.id}
                          onClick={() =>
                            toggleRuleActive(
                              item.id,
                              item.generated_rule_id!,
                              false,
                            )
                          }
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {canRetrigger && (
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={retriggeringId === item.id}
                      onClick={() => retriggerFeedback(item.id)}
                    >
                      {retriggeringId === item.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3 w-3" />
                      )}
                      Re-process
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
