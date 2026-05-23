import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTreeEditor } from './use-tree-editor';
import { buildTreeState } from './build-tree-state';
import type { MoveValidator } from './types';

interface Row {
  id: string;
  parentId: string | null;
  name: string;
}

function fixture() {
  return buildTreeState<Row>(
    [
      { id: 'a', parentId: null, name: 'A' },
      { id: 'a1', parentId: 'a', name: 'A1' },
      { id: 'b', parentId: null, name: 'B' },
    ],
    { getRowId: (r) => r.id, getParentId: (r) => r.parentId },
  );
}

function setup(opts: Partial<Parameters<typeof useTreeEditor<Row>>[0]> = {}) {
  let n = 0;
  return renderHook(() =>
    useTreeEditor<Row>({
      initialState: fixture(),
      generateId: () => `new${++n}`,
      createNode: (parentId) => ({
        id: `placeholder-${++n}`,
        parentId,
        name: 'New',
      }),
      ...opts,
    }),
  );
}

describe('useTreeEditor — high-level operations', () => {
  it('addNode creates and executes an AddNodeCommand', () => {
    const { result } = setup();
    let newId = '';
    act(() => {
      newId = result.current.addNode('a', {
        data: { id: 'a2', parentId: 'a', name: 'A2' },
        id: 'a2',
      });
    });
    expect(newId).toBe('a2');
    expect(result.current.state.nodes.get('a')?.childIds).toEqual(['a1', 'a2']);
    expect(result.current.canUndo).toBe(true);
  });

  it('deleteNode removes the node', () => {
    const { result } = setup();
    act(() => result.current.deleteNode('a1'));
    expect(result.current.state.nodes.has('a1')).toBe(false);
  });

  it('moveNode reparents the node', () => {
    const { result } = setup();
    act(() => result.current.moveNode('a1', 'b'));
    expect(result.current.state.nodes.get('a1')?.parentId).toBe('b');
  });

  it('moveNode rejects invalid moves (validator returns disallowed)', () => {
    const validator: MoveValidator<Row> = () => ({
      allowed: false,
      reason: 'nope',
    });
    const { result } = setup({ validateMove: validator });
    expect(() => {
      act(() => result.current.moveNode('a1', 'b'));
    }).toThrow();
    expect(result.current.state.nodes.get('a1')?.parentId).toBe('a');
    expect(result.current.canUndo).toBe(false);
  });

  it('indent / outdent work end-to-end', () => {
    const { result } = setup();
    // Add a2 so a1 has a previous sibling on demand.
    act(() => {
      result.current.addNode('a', {
        data: { id: 'a2', parentId: 'a', name: 'A2' },
        id: 'a2',
      });
    });
    act(() => result.current.indentNode('a2'));
    expect(result.current.state.nodes.get('a2')?.parentId).toBe('a1');
    act(() => result.current.outdentNode('a2'));
    expect(result.current.state.nodes.get('a2')?.parentId).toBe('a');
  });

  it('moveUp / moveDown reorder siblings', () => {
    const { result } = setup();
    // Add a2 then move it up.
    act(() => {
      result.current.addNode('a', {
        data: { id: 'a2', parentId: 'a', name: 'A2' },
        id: 'a2',
      });
    });
    act(() => result.current.moveUp('a2'));
    expect(result.current.state.nodes.get('a')?.childIds).toEqual([
      'a2',
      'a1',
    ]);
    act(() => result.current.moveDown('a2'));
    expect(result.current.state.nodes.get('a')?.childIds).toEqual([
      'a1',
      'a2',
    ]);
  });

  it('undo / redo delegate to the history manager', () => {
    const { result } = setup();
    act(() => result.current.deleteNode('b'));
    expect(result.current.state.nodes.has('b')).toBe(false);
    act(() => result.current.undo());
    expect(result.current.state.nodes.has('b')).toBe(true);
    act(() => result.current.redo());
    expect(result.current.state.nodes.has('b')).toBe(false);
  });

  it('cut + paste moves the subtree (different ids)', () => {
    const { result } = setup();
    act(() => result.current.cut('a1'));
    expect(result.current.state.nodes.has('a1')).toBe(false);
    act(() => {
      result.current.paste('b');
    });
    const b = result.current.state.nodes.get('b')!;
    expect(b.childIds).toHaveLength(1);
    expect(b.childIds[0]).not.toBe('a1');
  });

  it('getChangeSet reflects pending changes; markClean resets', () => {
    const { result } = setup();
    act(() => result.current.deleteNode('b'));
    expect(result.current.getChangeSet().deleted.map((d) => d.id)).toEqual([
      'b',
    ]);
    expect(result.current.isDirty).toBe(true);
    act(() => result.current.markClean());
    expect(result.current.isDirty).toBe(false);
  });

  it('onTreeChange fires on every mutation, with the latest state', () => {
    const onTreeChange = vi.fn();
    let n = 0;
    const { result } = renderHook(() =>
      useTreeEditor<Row>({
        initialState: fixture(),
        generateId: () => `new${++n}`,
        onTreeChange,
      }),
    );
    act(() =>
      result.current.execute({
        type: 'noop',
        description: 'noop',
        execute: (s: import('./types').TreeState<Row>) => ({ ...s }),
        undo: (s: import('./types').TreeState<Row>) => s,
      }),
    );
    expect(onTreeChange).toHaveBeenCalled();
  });
});
