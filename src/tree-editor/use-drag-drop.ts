import { useState, useCallback, useMemo } from 'react';
import type { MoveValidator, TreeState } from './types';
import { validateCycleAndSelf } from './validators';
import { MoveNodeCommand, MoveRejectedError } from './commands/move-node';
import type { DropPosition } from './drop-position';

export interface DragDropState {
  /** Id of the node currently being dragged, if any. */
  sourceId: string | null;
  /** Id of the row currently hovered as a drop target, if any. */
  targetId: string | null;
  /** Drop position relative to the target row. */
  position: DropPosition | null;
  /** Whether the current (source, target, position) combo is a valid move. */
  isValid: boolean;
}

const IDLE: DragDropState = {
  sourceId: null,
  targetId: null,
  position: null,
  isValid: false,
};

export interface UseDragDropOptions<TRow> {
  /** Current tree state — used to validate drops. */
  state: TreeState<TRow>;
  /**
   * Execute a command (typically the `execute` from `useHistoryManager`).
   * Called when a valid drop occurs.
   */
  execute: (command: MoveNodeCommand<TRow>) => void;
  /** Custom validators run in addition to the built-in cycle/self check. */
  validators?: MoveValidator<TRow>[];
}

export interface UseDragDropReturn {
  /** Current drag/drop state. */
  dragState: DragDropState;
  /** Begin dragging the given node. */
  onDragStart: (sourceId: string) => void;
  /** Update hover target + position; recomputes `isValid`. */
  onDragOver: (targetId: string, position: DropPosition) => void;
  /** Clear hover state (e.g., when cursor leaves a row). */
  onDragLeave: (targetId: string) => void;
  /** Cancel without dropping. */
  onDragEnd: () => void;
  /**
   * Commit the drop: executes a `MoveNodeCommand` if the combo is valid.
   * Returns `true` when a command was executed.
   */
  onDrop: (targetId: string, position: DropPosition) => boolean;
}

/**
 * Translate (source, target, position) into the new parent and insertion
 * index inside `state`. Returns `null` when the target is unknown.
 */
function resolveDestination<TRow>(
  state: TreeState<TRow>,
  targetId: string,
  position: DropPosition,
): { newParentId: string | null; index?: number } | null {
  const target = state.nodes.get(targetId);
  if (!target) return null;
  if (position === 'child') {
    return { newParentId: targetId };
  }
  const parentId = target.parentId;
  const siblings =
    parentId == null
      ? state.rootIds
      : (state.nodes.get(parentId)?.childIds ?? []);
  const targetIndex = siblings.indexOf(targetId);
  const offset = position === 'before' ? 0 : 1;
  return {
    newParentId: parentId,
    index: targetIndex < 0 ? undefined : targetIndex + offset,
  };
}

/**
 * Hook managing drag-and-drop state for tree reparenting.
 *
 * Validation runs on every `onDragOver` so the UI can render a "not allowed"
 * cue. `onDrop` only executes the move when the combo is valid; an invalid
 * drop is treated as a no-op (the command itself would also reject it).
 */
export function useDragDrop<TRow>(
  options: UseDragDropOptions<TRow>,
): UseDragDropReturn {
  const { state, execute, validators = [] } = options;
  const [dragState, setDragState] = useState<DragDropState>(IDLE);

  const validateCombo = useCallback(
    (sourceId: string, targetId: string, position: DropPosition): boolean => {
      const dest = resolveDestination(state, targetId, position);
      if (!dest) return false;
      // Reparenting onto the source itself or its descendants is blocked.
      const builtIn = validateCycleAndSelf(
        sourceId,
        dest.newParentId,
        position,
        state,
      );
      if (!builtIn.allowed) return false;
      for (const v of validators) {
        if (!v(sourceId, dest.newParentId, position, state).allowed) {
          return false;
        }
      }
      return true;
    },
    [state, validators],
  );

  const onDragStart = useCallback((sourceId: string) => {
    setDragState({
      sourceId,
      targetId: null,
      position: null,
      isValid: false,
    });
  }, []);

  const onDragOver = useCallback(
    (targetId: string, position: DropPosition) => {
      setDragState((prev) => {
        if (!prev.sourceId) return prev;
        const isValid = validateCombo(prev.sourceId, targetId, position);
        return { sourceId: prev.sourceId, targetId, position, isValid };
      });
    },
    [validateCombo],
  );

  const onDragLeave = useCallback((targetId: string) => {
    setDragState((prev) =>
      prev.targetId === targetId
        ? { ...prev, targetId: null, position: null, isValid: false }
        : prev,
    );
  }, []);

  const onDragEnd = useCallback(() => {
    setDragState(IDLE);
  }, []);

  const onDrop = useCallback(
    (targetId: string, position: DropPosition): boolean => {
      const { sourceId } = dragState;
      if (!sourceId) {
        setDragState(IDLE);
        return false;
      }
      const dest = resolveDestination(state, targetId, position);
      if (!dest || !validateCombo(sourceId, targetId, position)) {
        setDragState(IDLE);
        return false;
      }
      try {
        const cmd = new MoveNodeCommand<TRow>({
          id: sourceId,
          newParentId: dest.newParentId,
          index: dest.index,
          position,
          validators,
        });
        execute(cmd);
        setDragState(IDLE);
        return true;
      } catch (err) {
        // Validation passed but execute rejected — treat as no-op.
        if (!(err instanceof MoveRejectedError)) throw err;
        setDragState(IDLE);
        return false;
      }
    },
    [dragState, state, validators, execute, validateCombo],
  );

  return useMemo(
    () => ({
      dragState,
      onDragStart,
      onDragOver,
      onDragLeave,
      onDragEnd,
      onDrop,
    }),
    [dragState, onDragStart, onDragOver, onDragLeave, onDragEnd, onDrop],
  );
}
