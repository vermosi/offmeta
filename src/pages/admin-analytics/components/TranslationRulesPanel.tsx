import { useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Filter,
  Pencil,
  RefreshCw,
  Save,
  X,
  XCircle,
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
import type {
  RulesFilter,
  TranslationRuleRow,
} from '@/pages/admin-analytics/types';

interface TranslationRulesPanelProps {
  rules: TranslationRuleRow[];
  filteredRules: TranslationRuleRow[];
  rulesLoading: boolean;
  rulesFilter: RulesFilter;
  setRulesFilter: (value: RulesFilter) => void;
  rulesSearch: string;
  setRulesSearch: (value: string) => void;
  showArchivedRules: boolean;
  setShowArchivedRules: (value: boolean) => void;
  activeRulesCount: number;
  nonArchivedRulesCount: number;
  archivedRulesCount: number;
  ruleDirectTogglingId: string | null;
  archivingRuleId: string | null;
  editValidating: boolean;
  editSaving: boolean;
  editValidationError: string | null;
  editValidationCount: number | null;
  setEditValidationError: (value: string | null) => void;
  setEditValidationCount: (value: number | null) => void;
  fetchRules: () => void;
  toggleRuleDirect: (ruleId: string, currentActive: boolean) => void;
  archiveRule: (ruleId: string, isCurrentlyArchived: boolean) => void;
  validateAndSaveRuleSyntax: (
    ruleId: string,
    newSyntax: string,
  ) => Promise<boolean>;
}

export function TranslationRulesPanel(props: TranslationRulesPanelProps) {
  const {
    rules,
    filteredRules,
    rulesLoading,
    rulesFilter,
    setRulesFilter,
    rulesSearch,
    setRulesSearch,
    showArchivedRules,
    setShowArchivedRules,
    activeRulesCount,
    nonArchivedRulesCount,
    archivedRulesCount,
    ruleDirectTogglingId,
    archivingRuleId,
    editValidating,
    editSaving,
    editValidationError,
    editValidationCount,
    setEditValidationError,
    setEditValidationCount,
    fetchRules,
    toggleRuleDirect,
    archiveRule,
    validateAndSaveRuleSyntax,
  } = props;

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingSyntax, setEditingSyntax] = useState('');

  const cancelEditRule = () => {
    setEditingRuleId(null);
    setEditingSyntax('');
    setEditValidationError(null);
    setEditValidationCount(null);
  };

  return (
    <div className="surface-elevated border border-border mt-8 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
          <BookOpen className="h-4 w-4 text-primary" />
          Translation Rules{' '}
          {rules.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {activeRulesCount} active / {nonArchivedRulesCount} total
            </Badge>
          )}{' '}
          {archivedRulesCount > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Archive className="h-2.5 w-2.5" />
              {archivedRulesCount} archived
            </Badge>
          )}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowArchivedRules(!showArchivedRules)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs rounded-md border border-border"
          >
            <Archive className="h-3 w-3" />
            {showArchivedRules ? 'Hide archived' : 'Show archived'}
          </button>
          <div className="relative">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              value={rulesSearch}
              onChange={(event) => setRulesSearch(event.target.value)}
              placeholder="Filter pattern / syntax…"
              className="h-8 pl-6 pr-3 text-xs rounded-md border border-border bg-background"
            />
          </div>
          <Select
            value={rulesFilter}
            onValueChange={(value) => setRulesFilter(value as RulesFilter)}
          >
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRules}
            disabled={rulesLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${rulesLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {filteredRules.map((rule) => {
              const isArchived = Boolean(rule.archived_at);
              const isEditing = editingRuleId === rule.id;
              const isBusy = editValidating || editSaving;
              return (
                <tr key={rule.id} className="border-b border-border/30">
                  <td className="px-3 py-2 text-xs">{rule.pattern}</td>
                  <td className="px-3 py-2 text-xs">
                    {isEditing ? (
                      <div className="space-y-1">
                        <textarea
                          value={editingSyntax}
                          onChange={(event) => {
                            setEditingSyntax(event.target.value);
                            setEditValidationError(null);
                            setEditValidationCount(null);
                          }}
                          className="w-full text-xs border border-border rounded"
                        />
                        {editValidationError && (
                          <p className="text-[10px] text-destructive">
                            {editValidationError}
                          </p>
                        )}
                        {editValidationCount != null && (
                          <p className="text-[10px] text-success">
                            {editValidationCount} cards found
                          </p>
                        )}
                        <div className="flex gap-1">
                          <button
                            className="inline-flex items-center gap-1 h-5 px-2 text-[10px] rounded bg-primary text-primary-foreground"
                            disabled={isBusy}
                            onClick={async () => {
                              const saved = await validateAndSaveRuleSyntax(
                                rule.id,
                                editingSyntax,
                              );
                              if (saved) {
                                cancelEditRule();
                              }
                            }}
                          >
                            <Save className="h-2.5 w-2.5" />
                            Save
                          </button>
                          <button
                            className="inline-flex items-center gap-1 h-5 px-2 text-[10px] rounded border border-border"
                            disabled={isBusy}
                            onClick={cancelEditRule}
                          >
                            <X className="h-2.5 w-2.5" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="font-mono">{rule.scryfall_syntax}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {!isArchived && !isEditing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRuleId(rule.id);
                            setEditingSyntax(rule.scryfall_syntax);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {!isArchived && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleRuleDirect(rule.id, rule.is_active)
                          }
                          disabled={ruleDirectTogglingId === rule.id}
                        >
                          {rule.is_active ? (
                            <XCircle className="h-3 w-3" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => archiveRule(rule.id, isArchived)}
                        disabled={archivingRuleId === rule.id}
                      >
                        {isArchived ? (
                          <ArchiveRestore className="h-3 w-3" />
                        ) : (
                          <Archive className="h-3 w-3" />
                        )}
                      </Button>
                      {rule.source_feedback_id && (
                        <span className="text-primary">
                          <ExternalLink className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
