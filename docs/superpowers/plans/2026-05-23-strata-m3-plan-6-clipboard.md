# Strata M3 · Plan 6 — Clipboard (Cut / Copy / Paste) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement cut/copy/paste for subtrees. Copy serializes selected subtree(s) to an internal clipboard. Cut = copy + delete (undoable). Paste inserts the clipboard contents as children of the focused node, generating new IDs to avoid duplicates.

**Architecture:** A `useClipboard` hook manages the internal clipboard (not system clipboard — avoids browser security restrictions). The clipboard stores a deep clone of the subtree structure. On paste, `generateId()` is called for each node to produce unique IDs. Paste creates an `AddNodeCommand` (or `BatchCommand` for multiple nodes). Keyboard shortcuts: Ctrl+C, Ctrl+X, Ctrl+V.

**Tech Stack:** TypeScript, React 18/19, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md` (§3.6). Builds on Plans 2–3.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/tree-editor/use-clipboard.ts` | create | Clipboard state and operations |
| `src/tree-editor/use-clipboard.test.ts` | create | Clipboard unit tests |
| `src/tree-editor/clone-subtree.ts` | create | Deep clone with ID regeneration |
| `src/tree-editor/clone-subtree.test.ts` | create | Clone tests |
| `src/model/use-grid-keyboard.ts` | modify | Add Ctrl+C/X/V shortcuts |
| `src/components/DataGrid.clipboard.test.tsx` | create | Integration tests |

---

## Task 1: Subtree cloning with ID regeneration

- [ ] **Step 1: Write failing tests for `cloneSubtree`**

Test cases:
- Single node → cloned with new ID
- Node with children → all descendants cloned with new IDs
- Parent-child relationships preserved in clone
- Original tree unmodified
- Custom `generateId` function is used

- [ ] **Step 2: Create `src/tree-editor/clone-subtree.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: useClipboard hook

- [ ] **Step 1: Write failing tests**

Test cases:
- Initial state: clipboard is empty, `hasContent` is false
- Copy: stores subtree in clipboard, `hasContent` is true
- Cut: stores subtree + executes DeleteNodeCommand
- Paste: inserts cloned subtree as children of target
- Paste with empty clipboard → no-op
- Multiple pastes from same copy → each gets unique IDs
- Copy replaces previous clipboard content

- [ ] **Step 2: Create `src/tree-editor/use-clipboard.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 3: Keyboard shortcuts and integration

- [ ] **Step 1: Add Ctrl+C → copy selected node(s)**
- [ ] **Step 2: Add Ctrl+X → cut selected node(s)**
- [ ] **Step 3: Add Ctrl+V → paste at focused node**
- [ ] **Step 4: Integration test — copy + paste duplicates subtree**
- [ ] **Step 5: Integration test — cut + paste moves subtree**
- [ ] **Step 6: Integration test — undo after cut restores node**
- [ ] **Step 7: Run full suite — PASS**
- [ ] **Step 8: Commit**
