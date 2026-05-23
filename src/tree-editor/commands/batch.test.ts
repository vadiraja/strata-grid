import { describe, it, expect } from 'vitest';
import { BatchCommand } from './batch';
import { AddNodeCommand } from './add-node';
import { DeleteNodeCommand } from './delete-node';
import { buildTreeState } from '../build-tree-state';

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
    ],
    { getRowId: (r) => r.id, getParentId: (r) => r.parentId },
  );
}

describe('BatchCommand', () => {
  it('executes its commands in order', () => {
    const state = fixture();
    const batch = new BatchCommand<Row>([
      new AddNodeCommand<Row>({
        id: 'a1',
        parentId: 'a',
        data: { id: 'a1', parentId: 'a', name: 'A1' },
      }),
      new AddNodeCommand<Row>({
        id: 'a2',
        parentId: 'a',
        data: { id: 'a2', parentId: 'a', name: 'A2' },
      }),
    ]);
    const next = batch.execute(state);
    expect(next.nodes.get('a')?.childIds).toEqual(['a1', 'a2']);
  });

  it('undoes in reverse order', () => {
    const state = fixture();
    const cmds = [
      new AddNodeCommand<Row>({
        id: 'a1',
        parentId: 'a',
        data: { id: 'a1', parentId: 'a', name: 'A1' },
      }),
      new DeleteNodeCommand<Row>({ id: 'b' }),
    ];
    const batch = new BatchCommand<Row>(cmds);
    const after = batch.execute(state);
    expect(after.rootIds).toEqual(['a']);
    expect(after.nodes.get('a')?.childIds).toEqual(['a1']);
    const restored = batch.undo(after);
    expect(restored.rootIds).toEqual(['a', 'b']);
    expect(restored.nodes.get('a')?.childIds).toEqual([]);
  });
});
