/**
 * Translation Rules management panel.
 *
 * Displays all translation rules in a table with inline editing,
 * activate/deactivate, archive/restore, and Scryfall validation.
 */

import {
  Loader2,
  BookOpen,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Filter,
  Archive,
  ArchiveRestore,
  AlertCircle,
  Pencil,
  Save,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RulesFilter, TranslationRuleRow } from '@/pages/admin-analytics/types';

interface TranslationRulesPanelProps {
  rules: TranslationRuleRow[];
  filteredRules: TranslationRuleRow[];
  rulesLoading: boolean;
  rulesFilter: RulesFilter;
  rulesSearch: string;
  showArchivedRules: boolean;
  activeRulesCount: number;
  nonArchivedRulesCount: number;
  archivedRulesCount: number;
  ruleDirectTogglingId: string | null;
  archivingRuleId: string | null;
  editingRuleId: string | null;
  editingSyntax: string;
  editValidating: boolean;
  editSaving: boolean;
  editValidationError: string | null;
  editValidationCount: number | null;
  onRulesFilterChange: (filter: RulesFilter) => void;
  onRulesSearchChange: (search: string) => void;
  onToggleShowArchived: () => void;
  onRefresh: () => void;
  onToggleRuleDirect: (ruleId: string, currentActive: boolean) => void;
  onArchiveRule: (ruleId: string, isCurrentlyArchived: boolean) => void;
  onValidateAndSave: (ruleId: string, newSyntax: string) => void;
  onCancelEdit: () => void;
  onStartEdit: (ruleId: string, currentSyntax: string) => void;
  onEditingSyntaxChange: (syntax: string) => void;
  onExpandFeedback: (feedbackId: string) => void;
}

export function TranslationRulesPanel({
  rules,
  filteredRules,
  rulesLoading,
  rulesFilter,
  rulesSearch,
  showArchivedRules,
  activeRulesCount,
  nonArchivedRulesCount,
  archivedRulesCount,
  ruleDirectTogglingId,
  archivingRuleId,
  editingRuleId,
  editingSyntax,
  editValidating,
  editSaving,
  editValidationError,
  editValidationCount,
  onRulesFilterChange,
  onRulesSearchChange,
  onToggleShowArchived,
  onRefresh,
  onToggleRuleDirect,
  onArchiveRule,
  onValidateAndSave,
  onCancelEdit,
  onStartEdit,
  onEditingSyntaxChange,
  onExpandFeedback,
}: TranslationRulesPanelProps) {
  const isEditBusy = editValidating || editSaving;

  return (
    <div className="surface-elevated border border-border mt-8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
          <BookOpen className="h-4 w-4 text-primary" />
          Translation Rules
          {rules.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {activeRulesCount} active / {nonArchivedRulesCount} total
            </Badge>
          )}
          {archivedRulesCount > 0 && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
              <Archive className="h-2.5 w-2.5" />
              {archivedRulesCount} archived
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onToggleShowArchived}
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 text-xs rounded-md border transition-colors ${
              showArchivedRules
                ? 'border-primary/40 text-primary bg-primary/5 hover:bg-primary/10'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Archive className="h-3 w-3" />
            {showArchivedRules ? 'Hide archived' : 'Show archived'}
          </button>
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={rulesSearch}
              onChange={(e) => onRulesSearchChange(e.target.value)}
              placeholder="Filter pattern / syntax…"
              className="h-8 pl-6 pr-3 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-48"
            />
          </div>
          <Select value={rulesFilter} onValueChange={(v) => onRulesFilterChange(v as RulesFilter)}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={rulesLoading} className="h-8 w-8 p-0">
            <RefreshCw className={`h-3.5 w-3.5 ${rulesLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {rulesLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 px-5 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {rules.length === 0 ? 'No active translation rules yet' : 'No rules match your filter'}
          </p>
          {rules.length === 0 && (
            <p className="text-xs text-muted-foreground/70 max-w-xs">
              Rules are generated automatically when users submit search feedback.{' '}
              {!showArchivedRules && (
                <button className="text-primary hover:underline" onClick={onToggleShowArchived}>
                  Show archived rules
                </button>
              )}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background border-b border-border z-10">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-5"></th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pattern</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scryfall Syntax</th>
                <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conf</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Added</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredRules.map((rule) => {
                const isToggling = ruleDirectTogglingId === rule.id;
                const isArchiving = archivingRuleId === rule.id;
                const isArchived = !!rule.archived_at;
                const isEditing = editingRuleId === rule.id;
                return (
                  <tr
                    key={rule.id}
                    className={`hover:bg-muted/20 transition-colors ${!rule.is_active || isArchived ? 'opacity-60' : ''} ${isArchived ? 'bg-muted/10' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex h-2 w-2 rounded-full ${isArchived ? 'bg-muted-foreground/20' : rule.is_active ? 'bg-success' : 'bg-muted-foreground/40'}`}
                        title={isArchived ? 'Archived' : rule.is_active ? 'Active' : 'Inactive'}
                      />
                    </td>
                    <td className="px-5 py-3 max-w-[200px]">
                      <p className="font-medium text-foreground text-xs truncate" title={rule.pattern}>{rule.pattern}</p>
                      {rule.description && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={rule.description}>{rule.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 max-w-[260px]">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <textarea
                            autoFocus
                            value={editingSyntax}
                            onChange={(e) => onEditingSyntaxChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') onCancelEdit();
                              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                void onValidateAndSave(rule.id, editingSyntax);
                              }
                            }}
                            rows={2}
                            className="w-full text-[11px] font-mono rounded border border-border bg-background text-foreground px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="e.g. otag:ramp c:g"
                          />
                          {editValidationError && (
                            <div className="flex items-start gap-1 text-[10px] text-destructive">
                              <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                              <span>{editValidationError}</span>
                            </div>
                          )}
                          {editValidationCount != null && !editValidationError && (
                            <div className="flex items-center gap-1 text-[10px] text-success">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{editValidationCount.toLocaleString()} cards found</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <button
                              disabled={isEditBusy || !editingSyntax.trim()}
                              onClick={() => void onValidateAndSave(rule.id, editingSyntax)}
                              className="inline-flex items-center gap-1 h-5 px-2 text-[10px] rounded bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90"
                              title="Validate against Scryfall then save (⌘Enter)"
                            >
                              {editValidating || editSaving ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Save className="h-2.5 w-2.5" />
                              )}
                              {editValidating ? 'Validating…' : editSaving ? 'Saving…' : 'Validate & Save'}
                            </button>
                            <button
                              disabled={isEditBusy}
                              onClick={onCancelEdit}
                              className="inline-flex items-center gap-1 h-5 px-2 text-[10px] rounded border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                              <X className="h-2.5 w-2.5" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <code className="text-[11px] font-mono text-foreground/80 break-all line-clamp-2" title={rule.scryfall_syntax}>
                          {rule.scryfall_syntax}
                        </code>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {rule.confidence != null ? (
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
                          {Math.round(rule.confidence * 100)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(rule.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">
                      {rule.source_feedback_id ? (
                        <button
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                          onClick={() => {
                            document
                              .getElementById(`feedback-${rule.source_feedback_id}`)
                              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            onExpandFeedback(rule.source_feedback_id!);
                          }}
                          title="Jump to source feedback"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Feedback
                        </button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Manual</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {!isArchived && !isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                            disabled={isToggling || isArchiving || (editingRuleId !== null && editingRuleId !== rule.id)}
                            onClick={() => onStartEdit(rule.id, rule.scryfall_syntax)}
                            title="Edit Scryfall syntax (validates before saving)"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </Button>
                        )}
                        {!isArchived && !isEditing && (
                          rule.is_active ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                              disabled={isToggling || isArchiving}
                              onClick={() => onToggleRuleDirect(rule.id, true)}
                            >
                              {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px] gap-1 border-success/40 text-success hover:bg-success/10"
                              disabled={isToggling || isArchiving}
                              onClick={() => onToggleRuleDirect(rule.id, false)}
                            >
                              {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              Activate
                            </Button>
                          )
                        )}
                        {!isEditing && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                            disabled={isArchiving || isToggling}
                            onClick={() => onArchiveRule(rule.id, isArchived)}
                            title={isArchived ? 'Restore rule' : 'Archive rule (soft-delete)'}
                          >
                            {isArchiving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isArchived ? (
                              <ArchiveRestore className="h-3 w-3" />
                            ) : (
                              <Archive className="h-3 w-3" />
                            )}
                            {isArchived ? 'Restore' : 'Archive'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
