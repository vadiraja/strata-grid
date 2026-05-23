import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  ChangeSet,
  Command,
  MoveValidator,
  TreeState,
} from './types';
import { useHistoryManager } from './use-history-manager';
import { useChangeTracker } from './use-change-tracker';
import { useClipboard } from './use-clipboard';
import { AddNodeCommand } from './commands/add-node';
import { DeleteNodeCommand } from './commands/delete-node';
import { MoveNodeCommand } from './commands/move-node';
import { ReorderNodeCommand } from './commands/reorder-node';
import { IndentNodeCommand } from './commands/indent-node';
import { OutdentNodeCommand } from './commands/outdent-node';
import { BatchCommand } from './commands/batch';
import { filterToTopLevelNodes } from './ancestor-filter';

/**
 * Configuration for `useTreeEditor` — the hook that turns a tree grid into a
 * fully-editable hierarchy with add/delete/move/reorder/indent/outdent,
 * clipboard, drag-drop, and multi-level undo/redo.
 */
export interface UseTreeEditorOptions<TRow> {
  /** Initial tree state. */
  initialState: TreeState<TRow>;
  /** Optional move validator (in addition to built-in cycle/self check). */
  validateMove?: MoveValidator<TRow>;
  /** Generate ids for new and pasted nodes. Required for `addNode` / paste. */
  generateId?: () => string;
  /** Optional row-data factory for `addNode` when `data` is omitted. */
  createNode?: (parentId: string | null) => TRow;
  /** Maximum undo history depth (default 50). */
  historyDepth?: number;
  /**
   * Called after any successful tree mutation, including undo/redo and
   * paste. Receives the new state and the current change set.
   */
  onTreeChange?: (state: TreeState<TRow>, changeSet: ChangeSet<TRow>) => void;
}

/**
 * Return value of `useTreeEditor` — current tree state, change tracking, undo
 * stack, clipboard flag, and command dispatchers for every supported mutation.
 */
export interface UseTreeEditorReturn<TRow> {
  /** Current tree state. */
  state: TreeState<TRow>;
  /** Accumulated change set since the last `markClean()`. */
  changeSet: ChangeSet<TRow>;
  /** `true` when any structural change is pending. */
  isDirty: boolean;
  /** Whether undo is available. */
  canUndo: boolean;
  /** Whether redo is available. */
  canRedo: boolean;
  /** Undo stack, most recent command last. */
  undoStack: Command<TRow>[];
  /** Redo stack, most recent command last. */
  redoStack: Command<TRow>[];
  /** Whether the internal clipboard has content. */
  hasClipboardContent: boolean;

  /**
   * Add a new node under `parentId` at `index`. Pass `data` explicitly or
   * rely on the `createNode` factory. Returns the new node's id.
   */
  addNode: (
    parentId: string | null,
    options?: { data?: TRow; index?: number; id?: string },
  ) => string;
  deleteNode: (id: string) => void;
  /**
   * Delete several nodes as a single undoable batch. Ids whose ancestor is
   * also selected are filtered out (the parent already removes them).
   * Returns the count of commands actually executed.
   */
  deleteNodes: (ids: string[]) => number;
  /**
   * Move several nodes under a new parent as a single undoable batch.
   * Ids whose ancestor is also selected are filtered out. Returns the
   * count of commands actually executed.
   */
  moveNodes: (
    ids: string[],
    newParentId: string | null,
    options?: { position?: 'child' | 'before' | 'after' },
  ) => number;
  moveNode: (
    id: string,
    newParentId: string | null,
    options?: { index?: number; position?: 'child' | 'before' | 'after' },
  ) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  indentNode: (id: string) => void;
  outdentNode: (id: string) => void;

  cut: (id: string) => void;
  copy: (id: string) => void;
  paste: (targetParentId: string | null, index?: number) => boolean;

  undo: () => void;
  redo: () => void;

  /** Snapshot the current change set. */
  getChangeSet: () => ChangeSet<TRow>;
  /** Mark the current state as the new clean baseline. */
  markClean: () => void;

  /** Execute a raw command (escape hatch for custom commands). */
  execute: (command: Command<TRow>) => void;
}

/**
 * Top-level orchestrator for tree editing. Combines `useHistoryManager`,
 * `useChangeTracker`, and `useClipboard` and exposes a high-level API
 * matching the M3 spec.
 */
export function useTreeEditor<TRow>(
  options: UseTreeEditorOptions<TRow>,
): UseTreeEditorReturn<TRow> {
  const {
    initialState,
    validateMove,
    generateId,
    createNode,
    historyDepth,
    onTreeChange,
  } = options;

  const history = useHistoryManager<TRow>({ initialState, historyDepth });
  const tracker = useChangeTracker<TRow>({ state: history.state });

  const validators = useMemo<MoveValidator<TRow>[]>(
    () => (validateMove ? [validateMove] : []),
    [validateMove],
  );

  const requireGenerateId = useCallback(() => {
    if (!generateId) {
      throw new Error(
        'useTreeEditor: `generateId` is required for this operation.',
      );
    }
    return generateId;
  }, [generateId]);

  const clipboard = useClipboard<TRow>({
    state: history.state,
    execute: history.execute,
    // Lazy — paste calls this; throws if not configured.
    generateId: generateId ?? (() => {
      throw new Error('useTreeEditor: `generateId` is required for paste.');
    }),
  });

  // Fire onTreeChange whenever state mutates (skip the initial render).
  const skip = useRef(true);
  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    onTreeChange?.(history.state, tracker.changeSet);
  }, [history.state, tracker.changeSet, onTreeChange]);

  const addNode = useCallback<UseTreeEditorReturn<TRow>['addNode']>(
    (parentId, opts) => {
      const id = opts?.id ?? requireGenerateId()();
      const data =
        opts?.data ??
        (createNode
          ? createNode(parentId)
          : (() => {
              throw new Error(
                'useTreeEditor.addNode: pass `data` or configure `createNode`.',
              );
            })());
      history.execute(
        new AddNodeCommand<TRow>({
          id,
          parentId,
          data,
          index: opts?.index,
        }),
      );
      return id;
    },
    [history, createNode, requireGenerateId],
  );

  const deleteNode = useCallback(
    (id: string) => history.execute(new DeleteNodeCommand<TRow>({ id })),
    [history],
  );

  const deleteNodes = useCallback(
    (ids: string[]): number => {
      const top = filterToTopLevelNodes(history.state, ids);
      if (top.length === 0) return 0;
      if (top.length === 1) {
        history.execute(new DeleteNodeCommand<TRow>({ id: top[0] }));
        return 1;
      }
      history.execute(
        new BatchCommand<TRow>(
          top.map((id) => new DeleteNodeCommand<TRow>({ id })),
          `Delete ${top.length} nodes`,
        ),
      );
      return top.length;
    },
    [history],
  );

  const moveNodes = useCallback(
    (
      ids: string[],
      newParentId: string | null,
      opts?: { position?: 'child' | 'before' | 'after' },
    ): number => {
      const top = filterToTopLevelNodes(history.state, ids);
      if (top.length === 0) return 0;
      if (top.length === 1) {
        history.execute(
          new MoveNodeCommand<TRow>({
            id: top[0],
            newParentId,
            position: opts?.position,
            validators,
          }),
        );
        return 1;
      }
      history.execute(
        new BatchCommand<TRow>(
          top.map(
            (id) =>
              new MoveNodeCommand<TRow>({
                id,
                newParentId,
                position: opts?.position,
                validators,
              }),
          ),
          `Move ${top.length} nodes`,
        ),
      );
      return top.length;
    },
    [history, validators],
  );

  const moveNode = useCallback<UseTreeEditorReturn<TRow>['moveNode']>(
    (id, newParentId, opts) => {
      history.execute(
        new MoveNodeCommand<TRow>({
          id,
          newParentId,
          index: opts?.index,
          position: opts?.position,
          validators,
        }),
      );
    },
    [history, validators],
  );

  const moveUp = useCallback(
    (id: string) =>
      history.execute(new ReorderNodeCommand<TRow>({ id, direction: 'up' })),
    [history],
  );
  const moveDown = useCallback(
    (id: string) =>
      history.execute(new ReorderNodeCommand<TRow>({ id, direction: 'down' })),
    [history],
  );
  const indentNode = useCallback(
    (id: string) =>
      history.execute(new IndentNodeCommand<TRow>({ id, validators })),
    [history, validators],
  );
  const outdentNode = useCallback(
    (id: string) =>
      history.execute(new OutdentNodeCommand<TRow>({ id, validators })),
    [history, validators],
  );

  const getChangeSet = useCallback(
    () => tracker.changeSet,
    [tracker.changeSet],
  );

  return {
    state: history.state,
    changeSet: tracker.changeSet,
    isDirty: tracker.isDirty,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    undoStack: history.undoStack,
    redoStack: history.redoStack,
    hasClipboardContent: clipboard.hasContent,

    addNode,
    deleteNode,
    deleteNodes,
    moveNode,
    moveNodes,
    moveUp,
    moveDown,
    indentNode,
    outdentNode,

    cut: clipboard.cut,
    copy: clipboard.copy,
    paste: clipboard.paste,

    undo: history.undo,
    redo: history.redo,

    getChangeSet,
    markClean: tracker.markClean,

    execute: history.execute,
  };
}
