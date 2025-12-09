import { useState } from "react";
import { Deck } from "@/lib/deck";
import { validateDeckFormat, getFormatDisplayName, DeckFormat, FormatValidation } from "@/lib/format-validation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, AlertTriangle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FormatValidatorProps {
  deck: Deck;
  selectedFormat: DeckFormat;
  onFormatChange: (format: DeckFormat) => void;
}

const formats: DeckFormat[] = ["standard", "modern", "pioneer", "legacy", "vintage", "commander", "pauper"];

export function FormatValidator({ deck, selectedFormat, onFormatChange }: FormatValidatorProps) {
  const validation = validateDeckFormat(deck, selectedFormat);
  const hasCards = deck.mainboard.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Format
        </h4>
        <Select value={selectedFormat} onValueChange={(v) => onFormatChange(v as DeckFormat)}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {formats.map((format) => (
              <SelectItem key={format} value={format} className="text-xs">
                {getFormatDisplayName(format)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasCards && (
        <div className="space-y-2">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 gap-1">
                <CheckCircle className="h-3 w-3" />
                Legal
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                <AlertCircle className="h-3 w-3" />
                {validation.errors.length} Issue{validation.errors.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {validation.warnings.length > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {validation.warnings.length} Warning{validation.warnings.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Errors */}
          {validation.errors.length > 0 && (
            <div className="space-y-1">
              {validation.errors.slice(0, 3).map((error, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/5 px-2 py-1.5 rounded cursor-help">
                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{error}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p>{error}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
              {validation.errors.length > 3 && (
                <p className="text-xs text-muted-foreground pl-5">
                  +{validation.errors.length - 3} more issues
                </p>
              )}
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && validation.errors.length === 0 && (
            <div className="space-y-1">
              {validation.warnings.slice(0, 2).map((warning, index) => (
                <div key={index} className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/5 px-2 py-1.5 rounded">
                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-1">{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
