# Strata M3 · Plan 3 — Move & Reorder Commands · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `MoveNodeCommand` (reparent a node under a new parent) and `ReorderNodeCommand` (move a node up/down among siblings). Add built-in move validation (cycle prevention, self-move detection) and the custom validator hook.

**Architecture:** `MoveNodeCommand` removes a node from its current parent's childIds and inserts it into the target parent's childIds at the specified index. It stores the original parentId and index for undo. `ReorderNodeCommand` is a simpler variant that only changes position within the same parent. Validators run before execution — if any returns `{ allowed: false }`, the command is rejected.

**Tech Stack:** TypeScript, React 18/19, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md` (§3.2, §3.4). Builds on Plan 2.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/tree-editor/commands/move-node.ts` | create | MoveNodeCommand |
| `src/tree-editor/commands/move-node.test.ts` | create | Move tests |
| `src/tree-editor/commands/reorder-node.ts` | create | ReorderNodeCommand |
| `src/tree-editor/commands/reorder-node.test.ts` | create | Reorder tests |
| `src/tree-editor/validators.ts` | create | Built-in validators (cycle, self-move) |
| `src/tree-editor/validators.test.ts` | create | Validator tests |

---

## Task 1: Move validation

- [ ] **Step 1: Write failing tests for cycle detection and self-move**

Test cases:
- Moving a node to its own child → blocked
- Moving a node to its grandchild → blocked
- Moving a node to an unrelated node → allowed
- Moving a node to itself → blocked
- Moving a root to another root's child → allowed

- [ ] **Step 2: Create `src/tree-editor/validators.ts`**

```ts
export function isDescendant<TRow>(nodeId: string, potentialAncestorId: string, state: TreeState<TRow>): boolean
export function validateCycleAndSelf<TRow>(...): MoveValidationResult
```

- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: MoveNodeCommand

- [ ] **Step 1: Write failing tests for MoveNodeCommand**

Test cases:
- Move leaf from parent A to parent B → correct childIds on both
- Move node with children → subtree follows
- Move to root (targetId = null) → added to rootIds
- Move from root to child → removed from rootIds
- Move to specific index → inserted at correct position
- Undo restores original parent and position
- Rejected when validator returns allowed: false

- [ ] **Step 2: Create `src/tree-editor/commands/move-node.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 3: ReorderNodeCommand

- [ ] **Step 1: Write failing tests for ReorderNodeCommand**

Test cases:
- Move up (index - 1) → swaps with previous sibling
- Move down (index + 1) → swaps with next sibling
- Move up at index 0 → no-op
- Move down at last index → no-op
- Undo restores original order
- Works for root-level reorder

- [ ] **Step 2: Create `src/tree-editor/commands/reorder-node.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Update commands barrel export**
- [ ] **Step 5: Run full suite — PASS**
- [ ] **Step 6: Commit**
