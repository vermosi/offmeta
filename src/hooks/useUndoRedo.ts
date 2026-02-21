/**
 * Generic undo/redo stack for reversible actions.
 * Each action stores an `undo` and `redo` callback plus a human-readable label.
 * Uses state for derived render values while keeping mutable stacks in refs
 * that are only accessed inside callbacks (not during render).
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

/**
 * Derived state that is safe to read during render.
 * Updated via setState whenever the stacks change.
 */
interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  undoLabels: string[];
  redoLabels: string[];
}

const EMPTY_STATE: UndoRedoState = {
  canUndo: false,
  canRedo: false,
  undoLabels: [],
  redoLabels: [],
};

export function useUndoRedo() {
  const undoStackRef = useRef<UndoableAction[]>([]);
  const redoStackRef = useRef<UndoableAction[]>([]);
  const [derived, setDerived] = useState<UndoRedoState>(EMPTY_STATE);
  const [version, setVersion] = useState(0);

  /** Sync render-safe derived state from the mutable refs. */
  const sync = useCallback(() => {
    const u = undoStackRef.current;
    const r = redoStackRef.current;
    setDerived({
      canUndo: u.length > 0,
      canRedo: r.length > 0,
      undoLabels: u.map((a) => a.label),
      redoLabels: [...r].reverse().map((a) => a.label),
    });
    setVersion((v) => v + 1);
  }, []);

  const push = useCallback((action: UndoableAction) => {
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > MAX_STACK) undoStackRef.current.shift();
    redoStackRef.current = [];
    sync();
  }, [sync]);

  const undo = useCallback(async () => {
    const action = undoStackRef.current.pop();
    if (!action) return null;
    await action.undo();
    redoStackRef.current.push(action);
    sync();
    return action;
  }, [sync]);

  const undoTo = useCallback(async (index: number) => {
    const count = undoStackRef.current.length - index;
    let last: UndoableAction | null = null;
    for (let i = 0; i < count; i++) {
      const action = undoStackRef.current.pop();
      if (!action) break;
      await action.undo();
      redoStackRef.current.push(action);
      last = action;
    }
    sync();
    return last;
  }, [sync]);

  const redo = useCallback(async () => {
    const action = redoStackRef.current.pop();
    if (!action) return null;
    await action.redo();
    undoStackRef.current.push(action);
    sync();
    return action;
  }, [sync]);

  const clear = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    sync();
  }, [sync]);

  return {
    push,
    undo,
    undoTo,
    redo,
    clear,
    ...derived,
    version,
  };
}
