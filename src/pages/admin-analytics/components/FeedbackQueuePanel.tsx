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
import type { Dispatch, SetStateAction } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  pendingFeedbackCount: number;
  archivedFeedbackCount: number;
  processAllPending: () => void;
  processingAllPending: boolean;
  feedbackFilter: FeedbackFilter;
  onFeedbackFilterChange: (value: FeedbackFilter) => void;
  onRefresh: () => void;
  feedbackLoading: boolean;
  filteredFeedback: FeedbackItem[];
  expandedFeedback: Set<string>;
  setExpandedFeedback: Dispatch<SetStateAction<Set<string>>>;
  retriggeringId: string | null;
  ruleTogglingId: string | null;
  onRetriggerFeedback: (feedbackId: string) => void;
  onToggleRuleActive: (
    feedbackId: string,
    ruleId: string,
    currentlyActive: boolean,
  ) => void;
}

export function FeedbackQueuePanel({
  pendingFeedbackCount,
  archivedFeedbackCount,
  processAllPending,
  processingAllPending,
  feedbackFilter,
  onFeedbackFilterChange,
  onRefresh,
  feedbackLoading,
  filteredFeedback,
  expandedFeedback,
  setExpandedFeedback,
  retriggeringId,
  ruleTogglingId,
  onRetriggerFeedback,
  onToggleRuleActive,
}: FeedbackQueuePanelProps) {
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
              onFeedbackFilterChange(value as FeedbackFilter)
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
            onClick={onRefresh}
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
        <>
          {filteredFeedback.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              {feedbackFilter === 'all'
                ? 'No feedback submitted yet'
                : `No ${feedbackFilter} items`}
            </p>
          ) : (
            <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
              {filteredFeedback.map((feedbackItem) => {
                const status = feedbackItem.processing_status ?? 'pending';
                const isExpanded = expandedFeedback.has(feedbackItem.id);
                const rule = feedbackItem.translation_rules;
                const canRetrigger =
                  status === 'failed' || status === 'skipped';
                const isRetriggering = retriggeringId === feedbackItem.id;
                const isTogglingRule = ruleTogglingId === feedbackItem.id;

                return (
                  <div
                    key={feedbackItem.id}
                    id={`feedback-${feedbackItem.id}`}
                    className="px-5 py-4 space-y-3 scroll-mt-4"
                  >
                    <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                      <StatusBadge status={status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          &ldquo;{feedbackItem.original_query}&rdquo;
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(feedbackItem.created_at).toLocaleString()}
                          {feedbackItem.processed_at && (
                            <>
                              {' '}
                              · processed{' '}
                              {new Date(
                                feedbackItem.processed_at,
                              ).toLocaleDateString()}
                            </>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedFeedback((prev) => {
                            const next = new Set(prev);
                            if (next.has(feedbackItem.id))
                              next.delete(feedbackItem.id);
                            else next.add(feedbackItem.id);
                            return next;
                          })
                        }
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <p
                      className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}
                    >
                      {feedbackItem.issue_description}
                    </p>

                    {isExpanded && feedbackItem.translated_query && (
                      <div className="flex items-start gap-1.5 text-xs">
                        <Code2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                        <span className="font-mono text-muted-foreground break-all">
                          {feedbackItem.translated_query}
                        </span>
                      </div>
                    )}

                    {rule && (
                      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          <Sparkles className="h-3 w-3" />
                          AI-Generated Rule
                          <div className="ml-auto flex items-center gap-1.5">
                            {feedbackItem.scryfall_validation_count != null && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${
                                  feedbackItem.scryfall_validation_count >= 100
                                    ? 'bg-success/10 text-success'
                                    : feedbackItem.scryfall_validation_count >=
                                        10
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-destructive/10 text-destructive'
                                }`}
                                title="Number of cards returned by this rule's Scryfall query during validation"
                              >
                                {feedbackItem.scryfall_validation_count.toLocaleString()}{' '}
                                cards
                              </Badge>
                            )}
                            {rule.confidence != null && (
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${
                                  rule.confidence >= 0.8
                                    ? 'bg-success/10 text-success'
                                    : rule.confidence >= 0.6
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-destructive/10 text-destructive'
                                }`}
                              >
                                {Math.round(rule.confidence * 100)}% conf
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex gap-2 text-xs">
                            <span className="text-muted-foreground flex-shrink-0 w-14">
                              Pattern
                            </span>
                            <span className="text-foreground font-medium break-words">
                              {rule.pattern}
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <span className="text-muted-foreground flex-shrink-0 w-14">
                              Syntax
                            </span>
                            <span className="font-mono text-foreground break-all">
                              {rule.scryfall_syntax}
                            </span>
                          </div>
                          {rule.description && (
                            <div className="flex gap-2 text-xs">
                              <span className="text-muted-foreground flex-shrink-0 w-14">
                                Note
                              </span>
                              <span className="text-muted-foreground">
                                {rule.description}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                          <span
                            className={`text-[10px] font-medium ${rule.is_active ? 'text-success' : 'text-muted-foreground'}`}
                          >
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </span>
                          {rule.is_active ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                              disabled={isTogglingRule}
                              onClick={() =>
                                onToggleRuleActive(
                                  feedbackItem.id,
                                  feedbackItem.generated_rule_id!,
                                  true,
                                )
                              }
                            >
                              {isTogglingRule ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] gap-1 border-success/40 text-success hover:bg-success/10"
                              disabled={isTogglingRule}
                              onClick={() =>
                                onToggleRuleActive(
                                  feedbackItem.id,
                                  feedbackItem.generated_rule_id!,
                                  false,
                                )
                              }
                            >
                              {isTogglingRule ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
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
                          className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          disabled={isRetriggering}
                          onClick={() => onRetriggerFeedback(feedbackItem.id)}
                        >
                          {isRetriggering ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
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
        </>
      )}
    </div>
  );
}
