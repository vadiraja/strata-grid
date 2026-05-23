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
