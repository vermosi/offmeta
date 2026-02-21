/**
 * Generic undo/redo stack for reversible actions.
 * Each action stores an `undo` and `redo` callback plus a human-readable label.
 * @module hooks/useUndoRedo
 */

import { useState, useCallback, useRef } from 'react';

export interface UndoableAction {
  /** Short label shown in toast (e.g. "Remove Sol Ring") */
  label: string;
  /** Execute the inverse of the original action */
  undo: () => void | Promise<void>;
  /** Re-execute the original action */
  redo: () => void | Promise<void>;
}

const MAX_STACK = 30;

export function useUndoRedo() {
  const undoStack = useRef<UndoableAction[]>([]);
  const redoStack = useRef<UndoableAction[]>([]);
  const [version, setVersion] = useState(0);

  const push = useCallback((action: UndoableAction) => {
    undoStack.current.push(action);
    if (undoStack.current.length > MAX_STACK) undoStack.current.shift();
    redoStack.current = []; // clear redo on new action
    setVersion((v) => v + 1);
  }, []);

  const undo = useCallback(async () => {
    const action = undoStack.current.pop();
    if (!action) return null;
    await action.undo();
    redoStack.current.push(action);
    setVersion((v) => v + 1);
    return action;
  }, []);

  /** Undo multiple actions at once (jump to a point in history). */
  const undoTo = useCallback(async (index: number) => {
    const count = undoStack.current.length - index;
    let last: UndoableAction | null = null;
    for (let i = 0; i < count; i++) {
      const action = undoStack.current.pop();
      if (!action) break;
      await action.undo();
      redoStack.current.push(action);
      last = action;
    }
    setVersion((v) => v + 1);
    return last;
  }, []);

  const redo = useCallback(async () => {
    const action = redoStack.current.pop();
    if (!action) return null;
    await action.redo();
    undoStack.current.push(action);
    setVersion((v) => v + 1);
    return action;
  }, []);

  const clear = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    setVersion((v) => v + 1);
  }, []);

  return {
    push,
    undo,
    undoTo,
    redo,
    clear,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    /** Read-only snapshot of undo labels (oldest first) */
    undoLabels: undoStack.current.map((a) => a.label),
    /** Read-only snapshot of redo labels (most recent first) */
    redoLabels: [...redoStack.current].reverse().map((a) => a.label),
    /** Subscribe to changes by reading this value */
    version,
  };
}
