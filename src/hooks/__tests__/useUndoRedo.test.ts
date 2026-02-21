import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import type { UndoableAction } from '@/hooks/useUndoRedo';

describe('useUndoRedo', () => {
  it('starts empty with no undo/redo available', () => {
    const { result } = renderHook(() => useUndoRedo());
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabels).toEqual([]);
    expect(result.current.redoLabels).toEqual([]);
  });

  it('push enables undo and records label', () => {
    const { result } = renderHook(() => useUndoRedo());
    act(() => {
      result.current.push({ label: 'Add Sol Ring', undo: vi.fn(), redo: vi.fn() });
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabels).toEqual(['Add Sol Ring']);
  });

  it('undo calls the undo callback and enables redo', async () => {
    const undoFn = vi.fn();
    const redoFn = vi.fn();
    const { result } = renderHook(() => useUndoRedo());
    act(() => {
      result.current.push({ label: 'Remove Card', undo: undoFn, redo: redoFn });
    });

    let returned: UndoableAction | null = null;
    await act(async () => {
      returned = await result.current.undo();
    });

    expect(undoFn).toHaveBeenCalledOnce();
    expect((returned as UndoableAction | null)?.label).toBe('Remove Card');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.redoLabels).toEqual(['Remove Card']);
  });

  it('redo calls the redo callback and restores undo', async () => {
    const undoFn = vi.fn();
    const redoFn = vi.fn();
    const { result } = renderHook(() => useUndoRedo());
    act(() => {
      result.current.push({ label: 'Move Card', undo: undoFn, redo: redoFn });
    });
    await act(async () => { await result.current.undo(); });
    await act(async () => { await result.current.redo(); });

    expect(redoFn).toHaveBeenCalledOnce();
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('push clears redo stack', async () => {
    const { result } = renderHook(() => useUndoRedo());
    act(() => { result.current.push({ label: 'A', undo: vi.fn(), redo: vi.fn() }); });
    await act(async () => { await result.current.undo(); });
    expect(result.current.canRedo).toBe(true);

    act(() => { result.current.push({ label: 'B', undo: vi.fn(), redo: vi.fn() }); });
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabels).toEqual(['B']);
  });

  it('undo returns null when stack is empty', async () => {
    const { result } = renderHook(() => useUndoRedo());
    let returned: UndoableAction | null = null;
    await act(async () => { returned = await result.current.undo(); });
    expect(returned).toBeNull();
  });

  it('redo returns null when stack is empty', async () => {
    const { result } = renderHook(() => useUndoRedo());
    let returned: UndoableAction | null = null;
    await act(async () => { returned = await result.current.redo(); });
    expect(returned).toBeNull();
  });

  it('respects MAX_STACK limit (30)', () => {
    const { result } = renderHook(() => useUndoRedo());
    for (let i = 0; i < 35; i++) {
      act(() => { result.current.push({ label: `Action ${i}`, undo: vi.fn(), redo: vi.fn() }); });
    }
    expect(result.current.undoLabels.length).toBe(30);
    expect(result.current.undoLabels[0]).toBe('Action 5');
    expect(result.current.undoLabels[29]).toBe('Action 34');
  });

  it('undoTo reverts multiple actions at once', async () => {
    const undoFns = [vi.fn(), vi.fn(), vi.fn()];
    const { result } = renderHook(() => useUndoRedo());
    act(() => {
      result.current.push({ label: 'A', undo: undoFns[0], redo: vi.fn() });
      result.current.push({ label: 'B', undo: undoFns[1], redo: vi.fn() });
      result.current.push({ label: 'C', undo: undoFns[2], redo: vi.fn() });
    });

    // Undo to index 0 means undo 3 actions (stack length 3, count = 3 - 0 = 3)
    await act(async () => { await result.current.undoTo(0); });
    expect(undoFns[2]).toHaveBeenCalledOnce();
    expect(undoFns[1]).toHaveBeenCalledOnce();
    expect(undoFns[0]).toHaveBeenCalledOnce();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.redoLabels.length).toBe(3);
  });

  it('clear empties both stacks', async () => {
    const { result } = renderHook(() => useUndoRedo());
    act(() => {
      result.current.push({ label: 'A', undo: vi.fn(), redo: vi.fn() });
      result.current.push({ label: 'B', undo: vi.fn(), redo: vi.fn() });
    });
    await act(async () => { await result.current.undo(); });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    act(() => { result.current.clear(); });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoLabels).toEqual([]);
    expect(result.current.redoLabels).toEqual([]);
  });

  it('handles async undo/redo callbacks', async () => {
    const undoFn = vi.fn(async () => { await new Promise(r => setTimeout(r, 10)); });
    const redoFn = vi.fn(async () => { await new Promise(r => setTimeout(r, 10)); });
    const { result } = renderHook(() => useUndoRedo());
    act(() => { result.current.push({ label: 'Async', undo: undoFn, redo: redoFn }); });

    await act(async () => { await result.current.undo(); });
    expect(undoFn).toHaveBeenCalledOnce();

    await act(async () => { await result.current.redo(); });
    expect(redoFn).toHaveBeenCalledOnce();
  });

  it('version increments on every state change', () => {
    const { result } = renderHook(() => useUndoRedo());
    const v0 = result.current.version;
    act(() => { result.current.push({ label: 'X', undo: vi.fn(), redo: vi.fn() }); });
    expect(result.current.version).toBeGreaterThan(v0);
  });
});
