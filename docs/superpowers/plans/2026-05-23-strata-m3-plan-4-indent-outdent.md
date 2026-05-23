# Strata M3 · Plan 4 — Indent / Outdent · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `IndentNodeCommand` (make a node a child of its previous sibling) and `OutdentNodeCommand` (make a node a sibling of its current parent). Wire Tab/Shift+Tab keyboard shortcuts when tree editing is enabled.

**Architecture:** Indent is a specialized move: the node moves from its current parent to become the last child of its immediately preceding sibling. Outdent moves the node from its current parent to become the next sibling of that parent. Both validate via the standard move validators. Keyboard handling is added to `useGridKeyboard` when `treeEditor` is active.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md` (§3.2, §5.4). Builds on Plan 3.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/tree-editor/commands/indent-node.ts` | create | IndentNodeCommand |
| `src/tree-editor/commands/indent-node.test.ts` | create | Indent tests |
| `src/tree-editor/commands/outdent-node.ts` | create | OutdentNodeCommand |
| `src/tree-editor/commands/outdent-node.test.ts` | create | Outdent tests |
| `src/model/use-grid-keyboard.ts` | modify | Add Tab/Shift+Tab for indent/outdent |
| `src/components/DataGrid.indent.test.tsx` | create | Integration tests |

---

## Task 1: IndentNodeCommand

- [ ] **Step 1: Write failing tests**

Test cases:
- Node with previous sibling → becomes last child of that sibling
- First child (no previous sibling) → no-op / rejected
- Root node with previous root → becomes child of previous root
- Undo restores original parent and position
- Validates via move validators (no cycles possible here, but custom rules apply)

- [ ] **Step 2: Create `src/tree-editor/commands/indent-node.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: OutdentNodeCommand

- [ ] **Step 1: Write failing tests**

Test cases:
- Child node → becomes sibling after its parent
- Root node → no-op / rejected (already at top level)
- Node with children → children stay with it (subtree moves)
- Undo restores original parent and position
- Subsequent siblings of the outdented node become its children (optional behavior)

- [ ] **Step 2: Create `src/tree-editor/commands/outdent-node.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 3: Keyboard shortcuts

- [ ] **Step 1: Update `useGridKeyboard` to intercept Tab/Shift+Tab when treeEditor is active**
- [ ] **Step 2: Tab → execute IndentNodeCommand on focused row**
- [ ] **Step 3: Shift+Tab → execute OutdentNodeCommand on focused row**
- [ ] **Step 4: Ctrl+Shift+↑ → ReorderNodeCommand (move up)**
- [ ] **Step 5: Ctrl+Shift+↓ → ReorderNodeCommand (move down)**
- [ ] **Step 6: Integration tests — keyboard indent/outdent/reorder**
- [ ] **Step 7: Run full suite — PASS**
- [ ] **Step 8: Commit**
