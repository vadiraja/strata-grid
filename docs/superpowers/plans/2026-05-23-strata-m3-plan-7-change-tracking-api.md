# Strata M3 · Plan 7 — Change Tracking & API · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement structural change tracking (`ChangeSet`) and wire all tree editing operations into the `GridApi`. Change tracking records added/deleted/moved nodes since the last save point, enabling consumers to send minimal deltas to their backend.

**Architecture:** A `useChangeTracker` hook observes commands as they execute and accumulates a `ChangeSet`. `markClean()` resets the tracker (after a successful save). Undo/redo correctly adjusts the change set. The `GridApi` gains all M3 methods: `addNode`, `deleteNode`, `moveNode`, `indentNode`, `outdentNode`, `moveUp`, `moveDown`, `cut`, `copy`, `paste`, `undo`, `redo`, `getChangeSet`, `markClean`.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md` (§3.7, §5.3). Builds on Plans 1–6.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/tree-editor/use-change-tracker.ts` | create | Tracks structural changes |
| `src/tree-editor/use-change-tracker.test.ts` | create | Change tracking tests |
| `src/tree-editor/use-tree-editor.ts` | create | Orchestrator hook (combines history, clipboard, tracking) |
| `src/tree-editor/use-tree-editor.test.ts` | create | Orchestrator tests |
| `src/model/use-grid-api.ts` | modify | Add M3 methods |
| `src/components/DataGrid.tsx` | modify | Accept `treeEditor` prop, wire hook |
| `src/components/DataGrid.treeEditor.test.tsx` | create | Full integration tests |
| `src/index.ts` | modify | Export tree editor types |

---

## Task 1: Change tracker

- [ ] **Step 1: Write failing tests for `useChangeTracker`**

Test cases:
- Initial state: empty change set, `isDirty` false
- After add: node appears in `added`
- After delete: node appears in `deleted`
- After move: node appears in `moved` with old/new parentId
- After undo of add: node removed from `added`
- After undo of delete: node removed from `deleted`
- `markClean()` resets to empty
- Multiple operations accumulate correctly
- Add then delete same node → cancels out (not in change set)

- [ ] **Step 2: Create `src/tree-editor/use-change-tracker.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: useTreeEditor orchestrator hook

- [ ] **Step 1: Write failing tests for the orchestrator**

Test cases:
- Combines history manager + clipboard + change tracker
- `addNode` creates and executes AddNodeCommand
- `deleteNode` creates and executes DeleteNodeCommand
- `moveNode` validates then executes MoveNodeCommand
- `indentNode` / `outdentNode` work correctly
- `undo` / `redo` delegate to history manager
- `getChangeSet` returns accumulated changes
- `onTreeChange` callback fires on every operation
- Invalid move → rejected, no state change, no history entry

- [ ] **Step 2: Create `src/tree-editor/use-tree-editor.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 3: Wire into DataGrid and GridApi

- [ ] **Step 1: Add `treeEditor` prop to `DataGridProps`**
- [ ] **Step 2: Add `onTreeChange` callback prop**
- [ ] **Step 3: Instantiate `useTreeEditor` when `treeEditor` is provided**
- [ ] **Step 4: Extend `GridApi` with all M3 methods**
- [ ] **Step 5: Export `TreeEditorConfig`, `ChangeSet`, `Command` from `src/index.ts`**
- [ ] **Step 6: Integration tests — full DataGrid with tree editing**
- [ ] **Step 7: Run full suite — PASS**
- [ ] **Step 8: Commit**
