import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryManager } from './use-history-manager';
import type { Command, TreeState } from './types';

interface Row { id: string; name: string }

function emptyState(): TreeState<Row> {
  return { nodes: new Map(), rootIds: [] };
}

function makeCommand(id: string): Command<Row> {
  return {
    type: 'test',
    description: `Test command ${id}`,
    execute: (state) => ({ ...state, rootIds: [...state.rootIds, id] }),
    undo: (state) => ({ ...state, rootIds: state.rootIds.filter((r) => r !== id) }),
  };
}

describe('useHistoryManager — initial state', () => {
  it('starts with empty stacks', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 50 }),
    );
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.undoStack).toHaveLength(0);
    expect(result.current.redoStack).toHaveLength(0);
  });
});

describe('useHistoryManager — execute', () => {
  it('executes a command and updates state', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 50 }),
    );
    act(() => { result.current.execute(makeCommand('a')); });
    expect(result.current.state.rootIds).toEqual(['a']);
    expect(result.current.canUndo).toBe(true);
  });

  it('clears redo stack on new execute', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 50 }),
    );
    act(() => { result.current.execute(makeCommand('a')); });
    act(() => { result.current.undo(); });
    expect(result.current.canRedo).toBe(true);
    act(() => { result.current.execute(makeCommand('b')); });
    expect(result.current.canRedo).toBe(false);
  });

  it('respects history depth limit', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 3 }),
    );
    act(() => { result.current.execute(makeCommand('a')); });
    act(() => { result.current.execute(makeCommand('b')); });
    act(() => { result.current.execute(makeCommand('c')); });
    act(() => { result.current.execute(makeCommand('d')); });
    expect(result.current.undoStack).toHaveLength(3);
    // Oldest command ('a') was dropped
  });
});

describe('useHistoryManager — undo', () => {
  it('reverses the last command', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 50 }),
    );
    act(() => { result.current.execute(makeCommand('a')); });
    act(() => { result.current.undo(); });
    expect(result.current.state.rootIds).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('no-ops when nothing to undo', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 50 }),
    );
    act(() => { result.current.undo(); });
    expect(result.current.state.rootIds).toEqual([]);
  });
});

describe('useHistoryManager — redo', () => {
  it('re-applies the last undone command', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 50 }),
    );
    act(() => { result.current.execute(makeCommand('a')); });
    act(() => { result.current.undo(); });
    act(() => { result.current.redo(); });
    expect(result.current.state.rootIds).toEqual(['a']);
    expect(result.current.canRedo).toBe(false);
  });

  it('no-ops when nothing to redo', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 50 }),
    );
    act(() => { result.current.redo(); });
    expect(result.current.state.rootIds).toEqual([]);
  });
});

describe('useHistoryManager — clear', () => {
  it('clears all history', () => {
    const { result } = renderHook(() =>
      useHistoryManager({ initialState: emptyState(), historyDepth: 50 }),
    );
    act(() => { result.current.execute(makeCommand('a')); });
    act(() => { result.current.execute(makeCommand('b')); });
    act(() => { result.current.clear(); });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    // State is preserved, only history is cleared
    expect(result.current.state.rootIds).toEqual(['a', 'b']);
  });
});
