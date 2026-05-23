import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragDrop } from './use-drag-drop';
import { buildTreeState } from './build-tree-state';
import { MoveNodeCommand } from './commands/move-node';
import type { MoveValidator } from './types';

interface Row {
  id: string;
  parentId: string | null;
  name: string;
}

/** Two-level fixture:
 *   root1
 *     ├ child1
 *     └ child2
 *   root2
 */
function fixture() {
  const rows: Row[] = [
    { id: 'root1', parentId: null, name: 'Root 1' },
    { id: 'child1', parentId: 'root1', name: 'Child 1' },
    { id: 'child2', parentId: 'root1', name: 'Child 2' },
    { id: 'root2', parentId: null, name: 'Root 2' },
  ];
  return buildTreeState<Row>(rows, {
    getRowId: (r) => r.id,
    getParentId: (r) => r.parentId,
  });
}

describe('useDragDrop — initial state', () => {
  it('starts idle', () => {
    const execute = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute }),
    );
    expect(result.current.dragState).toEqual({
      sourceId: null,
      targetId: null,
      position: null,
      isValid: false,
    });
  });
});

describe('useDragDrop — drag lifecycle', () => {
  it('records the source on drag start', () => {
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute: vi.fn() }),
    );
    act(() => result.current.onDragStart('child1'));
    expect(result.current.dragState.sourceId).toBe('child1');
  });

  it('updates target and position on drag over', () => {
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute: vi.fn() }),
    );
    act(() => result.current.onDragStart('child1'));
    act(() => result.current.onDragOver('root2', 'child'));
    expect(result.current.dragState.targetId).toBe('root2');
    expect(result.current.dragState.position).toBe('child');
    expect(result.current.dragState.isValid).toBe(true);
  });

  it('marks invalid when dropping a node onto itself', () => {
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute: vi.fn() }),
    );
    act(() => result.current.onDragStart('root1'));
    act(() => result.current.onDragOver('root1', 'child'));
    expect(result.current.dragState.isValid).toBe(false);
  });

  it('marks invalid when dropping a parent onto its own descendant', () => {
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute: vi.fn() }),
    );
    act(() => result.current.onDragStart('root1'));
    act(() => result.current.onDragOver('child1', 'child'));
    expect(result.current.dragState.isValid).toBe(false);
  });

  it('clears the hover target on drag leave (only when ids match)', () => {
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute: vi.fn() }),
    );
    act(() => result.current.onDragStart('child1'));
    act(() => result.current.onDragOver('root2', 'child'));
    act(() => result.current.onDragLeave('someoneElse'));
    expect(result.current.dragState.targetId).toBe('root2');
    act(() => result.current.onDragLeave('root2'));
    expect(result.current.dragState.targetId).toBeNull();
    expect(result.current.dragState.sourceId).toBe('child1');
  });

  it('resets fully on drag end', () => {
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute: vi.fn() }),
    );
    act(() => result.current.onDragStart('child1'));
    act(() => result.current.onDragOver('root2', 'child'));
    act(() => result.current.onDragEnd());
    expect(result.current.dragState.sourceId).toBeNull();
    expect(result.current.dragState.targetId).toBeNull();
  });
});

describe('useDragDrop — drop', () => {
  it("on 'child' executes a MoveNodeCommand reparenting under the target", () => {
    const execute = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute }),
    );
    act(() => result.current.onDragStart('child1'));
    act(() => result.current.onDragOver('root2', 'child'));
    let returned = false;
    act(() => { returned = result.current.onDrop('root2', 'child'); });
    expect(returned).toBe(true);
    expect(execute).toHaveBeenCalledOnce();
    const cmd = execute.mock.calls[0][0];
    expect(cmd).toBeInstanceOf(MoveNodeCommand);
  });

  it("on 'after' inserts as next sibling of the target", () => {
    const execute = vi.fn();
    const state = fixture();
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state, execute }),
    );
    act(() => result.current.onDragStart('root2'));
    act(() => result.current.onDragOver('child1', 'after'));
    act(() => { result.current.onDrop('child1', 'after'); });
    // Apply the command to verify computed destination.
    const cmd = execute.mock.calls[0][0] as MoveNodeCommand<Row>;
    const after = cmd.execute(state);
    expect(after.nodes.get('root1')?.childIds).toEqual([
      'child1',
      'root2',
      'child2',
    ]);
    expect(after.rootIds).toEqual(['root1']);
  });

  it('refuses to drop a node onto its own descendant', () => {
    const execute = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute }),
    );
    act(() => result.current.onDragStart('root1'));
    act(() => result.current.onDragOver('child1', 'child'));
    let returned = true;
    act(() => { returned = result.current.onDrop('child1', 'child'); });
    expect(returned).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects when a custom validator says no', () => {
    const execute = vi.fn();
    const validator: MoveValidator<Row> = () => ({
      allowed: false,
      reason: 'nope',
    });
    const { result } = renderHook(() =>
      useDragDrop<Row>({
        state: fixture(),
        execute,
        validators: [validator],
      }),
    );
    act(() => result.current.onDragStart('child1'));
    act(() => result.current.onDragOver('root2', 'child'));
    let returned = true;
    act(() => { returned = result.current.onDrop('root2', 'child'); });
    expect(returned).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });

  it('no-ops when there is no active source', () => {
    const execute = vi.fn();
    const { result } = renderHook(() =>
      useDragDrop<Row>({ state: fixture(), execute }),
    );
    let returned = true;
    act(() => { returned = result.current.onDrop('root2', 'child'); });
    expect(returned).toBe(false);
    expect(execute).not.toHaveBeenCalled();
  });
});
