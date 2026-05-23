import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryManager } from './use-history-manager';
import { useClipboard } from './use-clipboard';
import { buildTreeState } from './build-tree-state';
import type { TreeState } from './types';

interface Row {
  id: string;
  parentId: string | null;
  name: string;
}

function fixture(): TreeState<Row> {
  const rows: Row[] = [
    { id: 'a', parentId: null, name: 'A' },
    { id: 'a1', parentId: 'a', name: 'A1' },
    { id: 'a1a', parentId: 'a1', name: 'A1A' },
    { id: 'a2', parentId: 'a', name: 'A2' },
    { id: 'b', parentId: null, name: 'B' },
  ];
  return buildTreeState<Row>(rows, {
    getRowId: (r) => r.id,
    getParentId: (r) => r.parentId,
  });
}

/**
 * Renders `useHistoryManager` + `useClipboard` together so tests can drive
 * the same code paths a consumer would.
 */
function setup(initial: TreeState<Row> = fixture()) {
  let nextId = 0;
  const generateId = () => `new${++nextId}`;
  return renderHook(() => {
    const history = useHistoryManager<Row>({ initialState: initial });
    const clipboard = useClipboard<Row>({
      state: history.state,
      execute: history.execute,
      generateId,
    });
    return { history, clipboard };
  });
}

describe('useClipboard — initial state', () => {
  it('starts empty', () => {
    const { result } = setup();
    expect(result.current.clipboard.hasContent).toBe(false);
    expect(result.current.clipboard.mode).toBeNull();
  });
});

describe('useClipboard — copy', () => {
  it('records the snapshot and leaves the source intact', () => {
    const { result } = setup();
    act(() => result.current.clipboard.copy('a1'));
    expect(result.current.clipboard.hasContent).toBe(true);
    expect(result.current.clipboard.mode).toBe('copy');
    // Source still present.
    expect(result.current.history.state.nodes.has('a1')).toBe(true);
  });

  it('overwrites the previous clipboard entry', () => {
    const { result } = setup();
    act(() => result.current.clipboard.copy('a1'));
    act(() => result.current.clipboard.copy('a2'));
    act(() => result.current.clipboard.paste('b'));
    const b = result.current.history.state.nodes.get('b')!;
    expect(b.childIds).toHaveLength(1);
    const pasted = result.current.history.state.nodes.get(b.childIds[0])!;
    expect(pasted.data.name).toBe('A2');
  });
});

describe('useClipboard — cut', () => {
  it('deletes the source as an undoable command', () => {
    const { result } = setup();
    act(() => result.current.clipboard.cut('a1'));
    expect(result.current.history.state.nodes.has('a1')).toBe(false);
    expect(result.current.history.canUndo).toBe(true);
    expect(result.current.clipboard.hasContent).toBe(true);
    expect(result.current.clipboard.mode).toBe('cut');
  });

  it('undo restores the cut subtree', () => {
    const { result } = setup();
    act(() => result.current.clipboard.cut('a1'));
    act(() => result.current.history.undo());
    expect(result.current.history.state.nodes.has('a1')).toBe(true);
    expect(result.current.history.state.nodes.has('a1a')).toBe(true);
  });
});

describe('useClipboard — paste', () => {
  it('inserts the cloned subtree under the target with fresh ids', () => {
    const { result } = setup();
    act(() => result.current.clipboard.copy('a1'));
    act(() => result.current.clipboard.paste('b'));
    const b = result.current.history.state.nodes.get('b')!;
    expect(b.childIds).toHaveLength(1);
    const pastedRootId = b.childIds[0];
    // New id (not the original).
    expect(pastedRootId).not.toBe('a1');
    // Children also re-id'd.
    const pastedRoot = result.current.history.state.nodes.get(pastedRootId)!;
    expect(pastedRoot.childIds).toHaveLength(1);
    expect(pastedRoot.childIds[0]).not.toBe('a1a');
    // Original tree untouched.
    expect(result.current.history.state.nodes.has('a1')).toBe(true);
    expect(result.current.history.state.nodes.has('a1a')).toBe(true);
  });

  it('multiple pastes from the same copy use unique ids', () => {
    const { result } = setup();
    act(() => result.current.clipboard.copy('a1'));
    act(() => result.current.clipboard.paste('b'));
    act(() => result.current.clipboard.paste('b'));
    const b = result.current.history.state.nodes.get('b')!;
    expect(b.childIds).toHaveLength(2);
    expect(b.childIds[0]).not.toBe(b.childIds[1]);
  });

  it('is a no-op when the clipboard is empty', () => {
    const { result } = setup();
    let ok = true;
    act(() => { ok = result.current.clipboard.paste('b'); });
    expect(ok).toBe(false);
  });

  it('is a no-op when target parent is missing', () => {
    const { result } = setup();
    act(() => result.current.clipboard.copy('a1'));
    let ok = true;
    act(() => { ok = result.current.clipboard.paste('does-not-exist'); });
    expect(ok).toBe(false);
  });

  it('inserts at root when targetParentId is null', () => {
    const { result } = setup();
    act(() => result.current.clipboard.copy('a1'));
    act(() => result.current.clipboard.paste(null, 0));
    const rootIds = result.current.history.state.rootIds;
    expect(rootIds[0]).not.toBe('a');
    // The pasted node is now root[0].
    expect(rootIds.slice(1)).toEqual(['a', 'b']);
  });

  it('paste is undoable', () => {
    const { result } = setup();
    act(() => result.current.clipboard.copy('a1'));
    act(() => result.current.clipboard.paste('b'));
    const stateAfterPaste = result.current.history.state;
    act(() => result.current.history.undo());
    expect(result.current.history.state.nodes.size).toBe(
      stateAfterPaste.nodes.size - 2, // a1 clone + a1a clone removed
    );
  });
});

describe('useClipboard — clear', () => {
  it('clears content and mode', () => {
    const { result } = setup();
    act(() => result.current.clipboard.copy('a1'));
    act(() => result.current.clipboard.clear());
    expect(result.current.clipboard.hasContent).toBe(false);
    expect(result.current.clipboard.mode).toBeNull();
  });
});
