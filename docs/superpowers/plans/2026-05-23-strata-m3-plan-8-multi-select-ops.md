# Strata M3 · Plan 8 — Multi-Select Operations · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement batch operations on multiple selected nodes: multi-delete, multi-move, and multi-cut. All multi-operations are wrapped in a `BatchCommand` so they undo/redo as a single unit. Also add Delete/Backspace keyboard shortcut and the Insert/Ctrl+Enter shortcut for adding nodes.

**Architecture:** A `BatchCommand` wraps an array of sub-commands and executes/undoes them in order (execute: forward, undo: reverse). Multi-select operations iterate over selected node IDs, create individual commands, and wrap them in a batch. Ancestor filtering ensures that if both a parent and its child are selected, only the parent is operated on (the child is implicitly included).

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md` (§3.2, §5.4). Builds on Plans 1–7.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/tree-editor/commands/batch-command.ts` | create | BatchCommand wrapper |
| `src/tree-editor/commands/batch-command.test.ts` | create | Batch tests |
| `src/tree-editor/ancestor-filter.ts` | create | Filter out descendants when ancestors are selected |
| `src/tree-editor/ancestor-filter.test.ts` | create | Filter tests |
| `src/tree-editor/use-tree-editor.ts` | modify | Add `deleteNodes`, `moveNodes` methods |
| `src/model/use-grid-keyboard.ts` | modify | Add Delete, Insert, Ctrl+Enter shortcuts |
| `src/components/DataGrid.multiSelect.test.tsx` | create | Integration tests |

---

## Task 1: BatchCommand

- [ ] **Step 1: Write failing tests**

Test cases:
- Execute runs all sub-commands in order
- Undo runs all sub-commands in reverse order
- Empty batch → no-op
- Description aggregates sub-command descriptions

- [ ] **Step 2: Create `src/tree-editor/commands/batch-command.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: Ancestor filtering

- [ ] **Step 1: Write failing tests for `filterToTopLevelNodes`**

Test cases:
- [parent, child] → [parent] (child is implicit)
- [parent, grandchild] → [parent]
- [sibling1, sibling2] → [sibling1, sibling2] (both kept)
- [unrelated1, unrelated2] → both kept
- Empty array → empty

- [ ] **Step 2: Create `src/tree-editor/ancestor-filter.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 3: Multi-delete and multi-move

- [ ] **Step 1: Add `deleteNodes(ids: string[])` to useTreeEditor**
- [ ] **Step 2: Filter to top-level, create DeleteNodeCommands, wrap in BatchCommand**
- [ ] **Step 3: Add `moveNodes(ids: string[], targetId, position)` to useTreeEditor**
- [ ] **Step 4: Tests — multi-delete removes all selected, undo restores all**
- [ ] **Step 5: Tests — multi-move reparents all selected**
- [ ] **Step 6: Commit**

## Task 4: Keyboard shortcuts for add/delete

- [ ] **Step 1: Delete/Backspace → delete selected node(s)**
- [ ] **Step 2: Insert / Ctrl+Enter → add new sibling below focused node**
- [ ] **Step 3: Ctrl+Shift+Enter → add new child of focused node**
- [ ] **Step 4: Ctrl+Z → undo**
- [ ] **Step 5: Ctrl+Shift+Z / Ctrl+Y → redo**
- [ ] **Step 6: Integration tests — all keyboard shortcuts work**
- [ ] **Step 7: Run full suite — PASS**
- [ ] **Step 8: Commit**

## Task 5: Playground demo

- [ ] **Step 1: Add a "Tree Editor" example to `playground/App.tsx`**
- [ ] **Step 2: Demo: drag-to-reparent, indent/outdent, add/delete, undo/redo**
- [ ] **Step 3: Show change set in a panel below the grid**
- [ ] **Step 4: Commit**
