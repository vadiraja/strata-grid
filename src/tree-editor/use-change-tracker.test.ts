import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistoryManager } from './use-history-manager';
import { useChangeTracker } from './use-change-tracker';
import { buildTreeState } from './build-tree-state';
import { AddNodeCommand } from './commands/add-node';
import { DeleteNodeCommand } from './commands/delete-node';
import { MoveNodeCommand } from './commands/move-node';

interface Row {
  id: string;
  parentId: string | null;
  name: string;
}

function fixture() {
  return buildTreeState<Row>(
    [
      { id: 'a', parentId: null, name: 'A' },
      { id: 'b', parentId: null, name: 'B' },
      { id: 'a1', parentId: 'a', name: 'A1' },
    ],
    { getRowId: (r) => r.id, getParentId: (r) => r.parentId },
  );
}

function setup() {
  return renderHook(() => {
    const history = useHistoryManager<Row>({ initialState: fixture() });
    const tracker = useChangeTracker<Row>({ state: history.state });
    return { history, tracker };
  });
}

describe('useChangeTracker', () => {
  it('starts empty and clean', () => {
    const { result } = setup();
    expect(result.current.tracker.isDirty).toBe(false);
    expect(result.current.tracker.changeSet.added).toHaveLength(0);
    expect(result.current.tracker.changeSet.deleted).toHaveLength(0);
    expect(result.current.tracker.changeSet.moved).toHaveLength(0);
  });

  it('records an add', () => {
    const { result } = setup();
    act(() => {
      result.current.history.execute(
        new AddNodeCommand<Row>({
          id: 'c',
          parentId: null,
          data: { id: 'c', parentId: null, name: 'C' },
        }),
      );
    });
    expect(result.current.tracker.isDirty).toBe(true);
    expect(result.current.tracker.changeSet.added.map((n) => n.id)).toEqual([
      'c',
    ]);
  });

  it('records a delete', () => {
    const { result } = setup();
    act(() => {
      result.current.history.execute(new DeleteNodeCommand<Row>({ id: 'b' }));
    });
    const ids = result.current.tracker.changeSet.deleted.map((d) => d.id);
    expect(ids).toContain('b');
  });

  it('records a move', () => {
    const { result } = setup();
    act(() => {
      result.current.history.execute(
        new MoveNodeCommand<Row>({ id: 'a1', newParentId: 'b' }),
      );
    });
    expect(result.current.tracker.changeSet.moved).toEqual([
      { id: 'a1', oldParentId: 'a', newParentId: 'b' },
    ]);
  });

  it('undo of an add removes it from the change set', () => {
    const { result } = setup();
    act(() => {
      result.current.history.execute(
        new AddNodeCommand<Row>({
          id: 'c',
          parentId: null,
          data: { id: 'c', parentId: null, name: 'C' },
        }),
      );
    });
    act(() => result.current.history.undo());
    expect(result.current.tracker.isDirty).toBe(false);
    expect(result.current.tracker.changeSet.added).toHaveLength(0);
  });

  it('add then delete of the same id cancels out', () => {
    const { result } = setup();
    act(() => {
      result.current.history.execute(
        new AddNodeCommand<Row>({
          id: 'c',
          parentId: null,
          data: { id: 'c', parentId: null, name: 'C' },
        }),
      );
    });
    act(() => {
      result.current.history.execute(new DeleteNodeCommand<Row>({ id: 'c' }));
    });
    expect(result.current.tracker.isDirty).toBe(false);
  });

  it('markClean resets the tracker', () => {
    const { result } = setup();
    act(() => {
      result.current.history.execute(
        new AddNodeCommand<Row>({
          id: 'c',
          parentId: null,
          data: { id: 'c', parentId: null, name: 'C' },
        }),
      );
    });
    act(() => result.current.tracker.markClean());
    expect(result.current.tracker.isDirty).toBe(false);
    expect(result.current.tracker.changeSet.added).toHaveLength(0);
  });

  it('accumulates multiple operations', () => {
    const { result } = setup();
    act(() => {
      result.current.history.execute(
        new AddNodeCommand<Row>({
          id: 'c',
          parentId: null,
          data: { id: 'c', parentId: null, name: 'C' },
        }),
      );
    });
    act(() => {
      result.current.history.execute(
        new MoveNodeCommand<Row>({ id: 'a1', newParentId: 'b' }),
      );
    });
    expect(result.current.tracker.changeSet.added).toHaveLength(1);
    expect(result.current.tracker.changeSet.moved).toHaveLength(1);
  });
});
