# Strata M3 · Plan 1 — Command Model & History · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the command pattern infrastructure — the `Command` interface, `useHistoryManager` hook with undo/redo stack, configurable depth, and the `TreeState` immutable snapshot type. This is the foundation all M3 operations build on.

**Architecture:** Commands are plain objects with `execute` and `undo` methods that transform a `TreeState`. The `useHistoryManager` hook maintains an undo stack and redo stack, executes commands, and exposes `canUndo`/`canRedo` state. History depth is configurable (default 50). Executing a new command clears the redo stack.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md` (§3.1, §3.3).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/tree-editor/types.ts` | create | `Command`, `TreeState`, `TreeNode` interfaces |
| `src/tree-editor/use-history-manager.ts` | create | Undo/redo stack hook |
| `src/tree-editor/use-history-manager.test.ts` | create | History manager unit tests |
| `src/tree-editor/index.ts` | create | Barrel export |

---

## Task 1: Tree editor types

Define the core interfaces: `TreeState`, `TreeNode`, `Command`, and supporting types for the command pattern.

**Files:**
- Create: `src/tree-editor/types.ts`

- [ ] **Step 1: Create `src/tree-editor/types.ts`**

```ts
import type { ReactNode } from 'react';

/**
 * A node in the tree state. Wraps the user's row data with structural
 * information (id, parentId, children).
 */
export interface TreeNode<TRow> {
  /** Unique node id. */
  id: string;
  /** Parent node id, or null for root nodes. */
  parentId: string | null;
  /** Ordered child node ids. */
  childIds: string[];
  /** The user's row data. */
  data: TRow;
}

/**
 * Immutable snapshot of the tree structure. Commands transform one
 * TreeState into another without mutation.
 */
export interface TreeState<TRow> {
  /** All nodes keyed by id. */
  nodes: Map<string, TreeNode<TRow>>;
  /** Ordered root node ids. */
  rootIds: string[];
}

/**
 * A reversible command that transforms tree state.
 * All structural mutations (add, delete, move, etc.) are commands.
 */
export interface Command<TRow> {
  /** Unique command type identifier (e.g., 'add-node', 'move-node'). */
  type: string;
  /** Human-readable description for undo/redo UI. */
  description: string;
  /** Apply the mutation. Returns the new tree state. */
  execute(state: TreeState<TRow>): TreeState<TRow>;
  /** Reverse the mutation. Returns the previous tree state. */
  undo(state: TreeState<TRow>): TreeState<TRow>;
}

/**
 * Result of a move validation check.
 */
export type MoveValidationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Validates whether a move operation is legal.
 */
export type MoveValidator<TRow> = (
  sourceId: string,
  targetId: string | null,
  position: 'child' | 'before' | 'after',
  state: TreeState<TRow>,
) => MoveValidationResult;

/**
 * Configuration for the tree editor.
 */
export interface TreeEditorConfig<TRow> {
  /** Whether drag-to-reparent is enabled. Default: true. */
  enableDrag?: boolean;
  /** Whether keyboard indent/outdent is enabled. Default: true. */
  enableIndent?: boolean;
  /** Custom move validator. */
  validateMove?: MoveValidator<TRow>;
  /** Factory for creating new nodes. */
  createNode?: (parentId: string | null) => TRow;
  /** Generate a unique ID for new/pasted nodes. */
  generateId?: () => string;
  /** Maximum undo history depth. Default: 50. */
  historyDepth?: number;
}

/**
 * Change tracking — the delta since the last save point.
 */
export interface ChangeSet<TRow> {
  added: { id: string; parentId: string | null; data: TRow }[];
  deleted: { id: string; parentId: string | null; data: TRow }[];
  moved: { id: string; oldParentId: string | null; newParentId: string | null }[];
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tree-editor/types.ts
git commit -m "feat(m3): add tree editor types — Command, TreeState, TreeNode"
```

---

## Task 2: History manager hook

The `useHistoryManager` hook manages undo/redo stacks, executes commands, and enforces history depth limits.

**Files:**
- Create: `src/tree-editor/use-history-manager.ts`
- Create: `src/tree-editor/use-history-manager.test.ts`

- [ ] **Step 1: Write failing tests — `src/tree-editor/use-history-manager.test.ts`**

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/tree-editor/use-history-manager.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `src/tree-editor/use-history-manager.ts`**

```ts
import { useState, useCallback, useRef } from 'react';
import type { Command, TreeState } from './types';

export interface UseHistoryManagerOptions<TRow> {
  /** The initial tree state. */
  initialState: TreeState<TRow>;
  /** Maximum number of undo steps. Default: 50. */
  historyDepth?: number;
}

export interface HistoryManagerReturn<TRow> {
  /** Current tree state. */
  state: TreeState<TRow>;
  /** Execute a command: apply it and push to undo stack. */
  execute: (command: Command<TRow>) => void;
  /** Undo the last command. */
  undo: () => void;
  /** Redo the last undone command. */
  redo: () => void;
  /** Whether undo is available. */
  canUndo: boolean;
  /** Whether redo is available. */
  canRedo: boolean;
  /** The undo stack (most recent last). */
  undoStack: Command<TRow>[];
  /** The redo stack (most recent last). */
  redoStack: Command<TRow>[];
  /** Clear all history (preserves current state). */
  clear: () => void;
}

/**
 * Hook managing undo/redo history for tree commands.
 *
 * - Executing a command applies it and pushes to the undo stack.
 * - Undo reverses the last command and pushes to the redo stack.
 * - Redo re-applies the last undone command.
 * - Executing a new command clears the redo stack.
 * - History depth is enforced by dropping the oldest commands.
 */
export function useHistoryManager<TRow>(
  options: UseHistoryManagerOptions<TRow>,
): HistoryManagerReturn<TRow> {
  const { initialState, historyDepth = 50 } = options;

  const [state, setState] = useState<TreeState<TRow>>(initialState);
  const [undoStack, setUndoStack] = useState<Command<TRow>[]>([]);
  const [redoStack, setRedoStack] = useState<Command<TRow>[]>([]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const execute = useCallback(
    (command: Command<TRow>) => {
      const newState = command.execute(stateRef.current);
      setState(newState);
      setUndoStack((prev) => {
        const next = [...prev, command];
        // Enforce depth limit
        if (next.length > historyDepth) {
          return next.slice(next.length - historyDepth);
        }
        return next;
      });
      setRedoStack([]);
    },
    [historyDepth],
  );

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const command = prev[prev.length - 1];
      const newState = command.undo(stateRef.current);
      setState(newState);
      setRedoStack((redo) => [...redo, command]);
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const command = prev[prev.length - 1];
      const newState = command.execute(stateRef.current);
      setState(newState);
      setUndoStack((undos) => [...undos, command]);
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    state,
    execute,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    undoStack,
    redoStack,
    clear,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/tree-editor/use-history-manager.test.ts`
Expected: PASS — all tests passing.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 6: Commit**

```bash
git add src/tree-editor/use-history-manager.ts src/tree-editor/use-history-manager.test.ts
git commit -m "feat(m3): add useHistoryManager hook with undo/redo"
```

---

## Task 3: Barrel export

- [ ] **Step 1: Create `src/tree-editor/index.ts`**

```ts
export type {
  TreeNode,
  TreeState,
  Command,
  MoveValidator,
  MoveValidationResult,
  TreeEditorConfig,
  ChangeSet,
} from './types';
export { useHistoryManager } from './use-history-manager';
export type { UseHistoryManagerOptions, HistoryManagerReturn } from './use-history-manager';
```

- [ ] **Step 2: Commit**

```bash
git add src/tree-editor/index.ts
git commit -m "feat(m3): add tree-editor barrel export"
```
