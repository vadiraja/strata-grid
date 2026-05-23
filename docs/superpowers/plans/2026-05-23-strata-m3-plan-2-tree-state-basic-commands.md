# Strata M3 · Plan 2 — Tree State & Basic Commands · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `TreeState` construction from user data, and the two fundamental commands: `AddNodeCommand` (insert a new node) and `DeleteNodeCommand` (remove a node and its subtree). These are the building blocks for all higher-level operations.

**Architecture:** A `buildTreeState` function converts the user's `data` array + `treeData` config into a `TreeState<TRow>`. `AddNodeCommand` inserts a node at a specified index under a parent (or as root). `DeleteNodeCommand` removes a node and recursively removes all descendants. Both commands store enough information to fully reverse themselves.

**Tech Stack:** TypeScript, React 18/19, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md` (§3.2). Builds on Plan 1.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/tree-editor/build-tree-state.ts` | create | Convert user data → TreeState |
| `src/tree-editor/build-tree-state.test.ts` | create | Construction tests |
| `src/tree-editor/commands/add-node.ts` | create | AddNodeCommand |
| `src/tree-editor/commands/add-node.test.ts` | create | Add node tests |
| `src/tree-editor/commands/delete-node.ts` | create | DeleteNodeCommand |
| `src/tree-editor/commands/delete-node.test.ts` | create | Delete node tests |
| `src/tree-editor/commands/index.ts` | create | Commands barrel |

---

## Task 1: Build tree state from user data

- [ ] **Step 1: Write failing tests for `buildTreeState`**

Test cases:
- Flat array with `getChildren` → correct nodes map and rootIds
- Nested data → parent/child relationships correct
- Empty data → empty state
- Single root → one rootId, correct childIds

- [ ] **Step 2: Create `src/tree-editor/build-tree-state.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: AddNodeCommand

- [ ] **Step 1: Write failing tests for AddNodeCommand**

Test cases:
- Add as root (parentId = null) → appended to rootIds
- Add as child at end → appended to parent's childIds
- Add at specific index → inserted at correct position
- Undo removes the added node
- Undo restores original rootIds/childIds order

- [ ] **Step 2: Create `src/tree-editor/commands/add-node.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 3: DeleteNodeCommand

- [ ] **Step 1: Write failing tests for DeleteNodeCommand**

Test cases:
- Delete leaf node → removed from parent's childIds and nodes map
- Delete node with children → entire subtree removed
- Delete root node → removed from rootIds
- Undo restores node and all descendants
- Undo restores correct position in parent's childIds

- [ ] **Step 2: Create `src/tree-editor/commands/delete-node.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Create `src/tree-editor/commands/index.ts` barrel**
- [ ] **Step 5: Run full suite — PASS**
- [ ] **Step 6: Commit**
