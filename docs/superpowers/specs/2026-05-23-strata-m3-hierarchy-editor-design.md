# Strata — Design Spec: M3 · Hierarchy / BOM Editor

- **Date:** 2026-05-23
- **Status:** Design — awaiting review before implementation planning
- **Scope of this document:** Milestone 3 only. Builds on M1 (read-only tree grid) and M2 (editing & aggregation).

---

## 1. Overview

M3 transforms the read-only tree grid into a **structure editor** — the tool
PLM/ERP users need to reshape bills of materials. After M1 delivers the tree
view and M2 adds inline cell editing, M3 adds the operations that change the
*shape* of the tree: add, delete, move, reparent, indent/outdent, and
cut/copy/paste subtrees.

All mutations flow through a **command model** with full undo/redo history.
Every structural change is a reversible command, enabling confident editing of
complex BOMs where mistakes are expensive.

---

## 2. Goals & non-goals

### Goals (M3)

- Add / insert nodes (as child, as sibling above/below).
- Delete nodes (single and multi-select delete).
- Drag-to-reparent with visual drop indicators distinguishing "reparent" from
  "reorder among siblings".
- Indent / outdent — keyboard shortcuts to change a node's parent.
- Sibling reorder — move up/down within the same parent.
- Move validation — block illegal moves (cycles, reparenting into own
  descendant, custom business rules).
- Undo / redo command history with configurable depth.
- Cut / copy / paste subtrees.
- Change tracking — dirty state for structural changes, for writing edits back
  to the ERP/PLM system.
- Multi-select move and delete.

### Non-goals (M3)

- Server-side persistence (M4 — the grid tracks changes; the consumer persists).
- Drag between separate grid instances.
- Collaborative / multi-user editing.
- Version history / branching (beyond linear undo/redo).

---

## 3. Architecture

### 3.1 Command model

Every structural mutation is a **Command** — a reversible operation with
`execute()` and `undo()` methods. Commands are pushed onto a history stack.

```ts
interface Command<TRow> {
  /** Unique command type identifier. */
  type: string;
  /** Human-readable description for undo/redo UI. */
  description: string;
  /** Apply the mutation. Returns the new data state. */
  execute(state: TreeState<TRow>): TreeState<TRow>;
  /** Reverse the mutation. Returns the previous data state. */
  undo(state: TreeState<TRow>): TreeState<TRow>;
}
```

The `TreeState<TRow>` is an immutable snapshot of the tree structure (nodes +
parent-child relationships). Commands produce new snapshots without mutating
the original.

### 3.2 Command types

| Command | Description |
|---|---|
| `AddNodeCommand` | Insert a new node as child of a parent (or as root) |
| `DeleteNodeCommand` | Remove a node and its subtree |
| `MoveNodeCommand` | Reparent a node under a new parent at a specific index |
| `ReorderNodeCommand` | Move a node within its siblings (up/down) |
| `IndentNodeCommand` | Make a node a child of its previous sibling |
| `OutdentNodeCommand` | Make a node a sibling of its current parent |
| `BatchCommand` | Groups multiple commands as one undo unit |

### 3.3 History manager

```ts
interface HistoryManager<TRow> {
  /** Execute a command and push to history. */
  execute(command: Command<TRow>): void;
  /** Undo the last command. */
  undo(): void;
  /** Redo the last undone command. */
  redo(): void;
  /** Whether undo is available. */
  canUndo: boolean;
  /** Whether redo is available. */
  canRedo: boolean;
  /** The current undo stack (for UI display). */
  undoStack: Command<TRow>[];
  /** The current redo stack (for UI display). */
  redoStack: Command<TRow>[];
  /** Clear all history. */
  clear(): void;
}
```

History depth is configurable (default: 50 commands). When the limit is
reached, the oldest command is dropped.

### 3.4 Move validation

Before executing a `MoveNodeCommand`, validators run to check legality:

```ts
type MoveValidator<TRow> = (
  source: TRow,
  target: TRow | null, // null = move to root
  position: 'child' | 'before' | 'after',
) => MoveValidationResult;

type MoveValidationResult = { allowed: true } | { allowed: false; reason: string };
```

Built-in validators:
- **Cycle prevention** — cannot move a node into its own descendant.
- **Self-move** — cannot move a node onto itself.

Custom validators are provided via `treeEditor.validateMove`.

### 3.5 Drag-and-drop

Drag uses the HTML5 Drag and Drop API (no external library). Drop indicators
distinguish three positions:

- **Child** — drop onto a node (becomes last child) — indicator: highlight the
  target row background.
- **Before** — drop above a node (becomes sibling before) — indicator: line
  above the row.
- **After** — drop below a node (becomes sibling after) — indicator: line below
  the row.

The drop position is determined by the cursor's vertical position within the
row: top 25% = before, bottom 25% = after, middle 50% = child.

### 3.6 Clipboard (cut/copy/paste)

- **Copy** — serializes the selected subtree(s) to an internal clipboard format.
- **Cut** — copy + delete (the delete is a command, undoable).
- **Paste** — deserializes and inserts as children of the focused node.

The clipboard is internal to the grid instance (not system clipboard, to avoid
security restrictions). New IDs are generated for pasted nodes to avoid
duplicates.

### 3.7 Change tracking

The grid tracks all structural changes since the last "save point":

```ts
interface ChangeSet<TRow> {
  added: TRow[];       // nodes that were added
  deleted: TRow[];     // nodes that were deleted
  moved: { node: TRow; oldParentId: string | null; newParentId: string | null }[];
  modified: { node: TRow; changes: Record<string, { old: unknown; new: unknown }> }[];
}
```

`getChangeSet()` returns the delta — useful for sending minimal updates to the
backend. `markClean()` resets the tracking (after a successful save).

---

## 4. Component breakdown (additions to M1/M2)

```
<DataGrid>
└─ GridRoot
   ├─ ... (existing components) ...
   ├─ DragOverlay           ghost element during drag
   ├─ DropIndicator         line/highlight showing drop position
   └─ UndoRedoToolbar       undo/redo buttons (optional slot)
```

### New hooks

| Hook | Responsibility |
|---|---|
| `useTreeEditor` | Orchestrates commands, history, validation, change tracking |
| `useHistoryManager` | Undo/redo stack management |
| `useDragDrop` | HTML5 DnD handlers, drop position calculation, ghost element |
| `useClipboard` | Cut/copy/paste operations on subtrees |

---

## 5. Public API additions

### 5.1 DataGrid props (new in M3)

```ts
interface DataGridProps<TRow> {
  // ... existing M1/M2 props ...

  /** Enables tree structure editing (add/delete/move/reparent). */
  treeEditor?: TreeEditorConfig<TRow>;
  /** Called when the tree structure changes. */
  onTreeChange?: (event: TreeChangeEvent<TRow>) => void;
}

interface TreeEditorConfig<TRow> {
  /** Whether drag-to-reparent is enabled. Default: true. */
  enableDrag?: boolean;
  /** Whether keyboard indent/outdent is enabled. Default: true. */
  enableIndent?: boolean;
  /** Custom move validator. */
  validateMove?: MoveValidator<TRow>;
  /** Factory for creating new nodes (for add operations). */
  createNode?: (parent: TRow | null) => TRow;
  /** Generate a unique ID for new/pasted nodes. */
  generateId?: () => string;
  /** Maximum undo history depth. Default: 50. */
  historyDepth?: number;
}
```

### 5.2 TreeChangeEvent

```ts
interface TreeChangeEvent<TRow> {
  /** The type of change. */
  type: 'add' | 'delete' | 'move' | 'reorder' | 'indent' | 'outdent' | 'batch';
  /** The affected node(s). */
  nodes: TRow[];
  /** The new tree data after the change. */
  data: TRow[];
  /** The command that was executed. */
  command: Command<TRow>;
}
```

### 5.3 GridApi additions

```ts
interface GridApi<TRow> {
  // ... existing M1/M2 methods ...

  // M3 tree editing
  addNode(parentId: string | null, node?: Partial<TRow>, index?: number): void;
  deleteNode(nodeId: string): void;
  deleteNodes(nodeIds: string[]): void;
  moveNode(nodeId: string, newParentId: string | null, index?: number): void;
  indentNode(nodeId: string): void;
  outdentNode(nodeId: string): void;
  moveUp(nodeId: string): void;
  moveDown(nodeId: string): void;

  // Clipboard
  cut(nodeIds?: string[]): void;
  copy(nodeIds?: string[]): void;
  paste(targetId?: string): void;

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  getUndoStack(): Command<TRow>[];

  // Change tracking
  getChangeSet(): ChangeSet<TRow>;
  markClean(): void;
  isDirty(): boolean;
}
```

### 5.4 Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Tab` | Indent selected node (make child of previous sibling) |
| `Shift+Tab` | Outdent selected node (make sibling of parent) |
| `Ctrl+Shift+↑` | Move node up among siblings |
| `Ctrl+Shift+↓` | Move node down among siblings |
| `Delete` / `Backspace` | Delete selected node(s) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+X` | Cut |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste |
| `Insert` / `Ctrl+Enter` | Add new sibling below |
| `Ctrl+Shift+Enter` | Add new child |

---

## 6. Data flow (tree editing)

```
1. User action (drag, keyboard shortcut, API call)
2. Create Command (e.g., MoveNodeCommand)
3. Run validators → if invalid, show error and abort
4. Execute command → produces new TreeState
5. Push command to history stack
6. Fire onTreeChange event
7. Update tree data → grid re-renders
8. Update change tracking (added/deleted/moved)
```

### Undo flow

```
1. User presses Ctrl+Z
2. Pop last command from undo stack
3. Call command.undo(currentState) → previous TreeState
4. Push command to redo stack
5. Fire onTreeChange event
6. Update tree data → grid re-renders
```

---

## 7. Error handling & edge cases

| Edge case | Handling |
|---|---|
| Drag node onto its own descendant | Validator blocks; show "Cannot move into own subtree" tooltip |
| Delete node with children | Delete entire subtree; confirm dialog if > N children (configurable) |
| Paste creates duplicate IDs | Generate new IDs for all pasted nodes via `generateId()` |
| Undo after data refresh | Clear history on external data change; dev-warn |
| Move to same position (no-op) | Detect and skip; don't push to history |
| Multi-select with mixed depths | Batch command; validate each move independently |
| Drag during cell edit | Auto-commit active edit before starting drag |
| Delete node being edited | Auto-discard edit; delete proceeds |
| History overflow | Drop oldest commands when `historyDepth` exceeded |
| Custom `createNode` throws | Catch; show error; don't add to tree |

---

## 8. Testing strategy

| Layer | Tools | Coverage |
|---|---|---|
| Unit | Vitest | Command execute/undo, history manager, move validation, cycle detection, change tracking |
| Component | Vitest + RTL | Drag indicators, drop position calculation, keyboard shortcuts, undo/redo UI |
| Integration | Vitest + RTL | Full DataGrid with tree editing + selection + editing interactions |
| E2E | Playwright | Real drag-and-drop, keyboard flows, undo/redo sequences |

---

## 9. Success criteria for M3

M3 is complete when:

1. Nodes can be added, deleted, and moved via drag-and-drop with correct drop
   indicators (child/before/after).
2. Indent/outdent via Tab/Shift+Tab works correctly with proper validation.
3. Move validation prevents cycles and illegal moves; custom validators work.
4. Undo/redo works for all operations with configurable history depth.
5. Cut/copy/paste duplicates subtrees with new IDs.
6. Multi-select delete and move work correctly.
7. Change tracking accurately reports added/deleted/moved nodes.
8. All keyboard shortcuts are functional and accessible.
9. Drag-and-drop works smoothly without jank on large trees.
10. All operations have unit tests, component tests, and integration tests.

---

## 10. Implementation plan structure

| Plan | Title | Scope |
|---|---|---|
| **Plan 1** | Command model & history | `Command` interface, `useHistoryManager`, undo/redo stack |
| **Plan 2** | Tree state & basic commands | `TreeState`, `AddNodeCommand`, `DeleteNodeCommand` |
| **Plan 3** | Move & reorder commands | `MoveNodeCommand`, `ReorderNodeCommand`, move validation |
| **Plan 4** | Indent / outdent | `IndentNodeCommand`, `OutdentNodeCommand`, Tab shortcuts |
| **Plan 5** | Drag-and-drop | `useDragDrop`, drop indicators, ghost element, position detection |
| **Plan 6** | Clipboard | `useClipboard`, cut/copy/paste, ID regeneration |
| **Plan 7** | Change tracking & API | `ChangeSet`, `getChangeSet`, `markClean`, `GridApi` methods |
| **Plan 8** | Multi-select operations | Batch commands, multi-delete, multi-move |
