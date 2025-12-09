import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { shortcutsList } from "@/hooks/useKeyboardShortcuts";
import { Keyboard } from "lucide-react";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-2">
          {shortcutsList.map((shortcut) => (
            <div
              key={shortcut.key + (shortcut.shift ? "-shift" : "")}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono font-semibold">
                {shortcut.shift && "Shift + "}
                {shortcut.key === " " ? "Space" : shortcut.key.toUpperCase()}
              </kbd>
            </div>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4">
          Hover over a card and press a shortcut to perform the action.
        </p>
      </DialogContent>
    </Dialog>
  );
}
