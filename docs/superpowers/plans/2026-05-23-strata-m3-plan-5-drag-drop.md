# Strata M3 · Plan 5 — Drag-and-Drop · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement drag-to-reparent with visual drop indicators. Users can drag a row and drop it onto another row to reparent (child), or above/below to reorder (sibling). Drop position is determined by cursor position within the target row. Invalid drops (cycles) show a "not allowed" indicator.

**Architecture:** A `useDragDrop` hook manages HTML5 Drag and Drop state: drag source, current drop target, drop position (child/before/after). `GridRow` gains `draggable` when tree editing is enabled. A `DropIndicator` component renders the visual cue (line or highlight). On drop, a `MoveNodeCommand` is created and executed through the history manager.

**Tech Stack:** TypeScript, React 18/19, HTML5 Drag and Drop API, Vitest + RTL, Playwright (E2E).

**Spec:** `docs/superpowers/specs/2026-05-23-strata-m3-hierarchy-editor-design.md` (§3.5). Builds on Plan 3.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/tree-editor/use-drag-drop.ts` | create | DnD state management hook |
| `src/tree-editor/use-drag-drop.test.ts` | create | Drop position calculation tests |
| `src/tree-editor/drop-position.ts` | create | Pure function: cursor Y → position |
| `src/tree-editor/drop-position.test.ts` | create | Position math tests |
| `src/components/DropIndicator.tsx` | create | Visual drop indicator (line/highlight) |
| `src/components/GridRow.tsx` | modify | Add draggable, drag/drop handlers |
| `src/components/DataGrid.dragDrop.test.tsx` | create | Integration tests |
| `src/strata.css` | modify | Drop indicator styles |

---

## Task 1: Drop position calculation

- [ ] **Step 1: Write failing tests for `calculateDropPosition`**

Test cases:
- Cursor in top 25% of row → 'before'
- Cursor in bottom 25% of row → 'after'
- Cursor in middle 50% of row → 'child'
- Edge cases: cursor at exact boundaries

- [ ] **Step 2: Create `src/tree-editor/drop-position.ts`**

```ts
export type DropPosition = 'before' | 'after' | 'child';

export function calculateDropPosition(
  cursorY: number,
  rowTop: number,
  rowHeight: number,
): DropPosition {
  const relativeY = cursorY - rowTop;
  const ratio = relativeY / rowHeight;
  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';
  return 'child';
}
```

- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: useDragDrop hook

- [ ] **Step 1: Write failing tests for drag state management**

Test cases:
- Initial state: no drag active
- onDragStart sets source node
- onDragOver updates target and position
- onDragEnd clears state
- onDrop executes MoveNodeCommand
- Invalid drop (cycle) → no command executed, shows error indicator

- [ ] **Step 2: Create `src/tree-editor/use-drag-drop.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 3: DropIndicator component

- [ ] **Step 1: Create `src/components/DropIndicator.tsx`**

Renders:
- A horizontal line (2px blue) for 'before'/'after' positions
- A background highlight for 'child' position
- A "not allowed" state (red line, cursor: not-allowed) for invalid drops

- [ ] **Step 2: Add CSS for drop indicators**

```css
.strata-drop-indicator-line { ... }
.strata-drop-indicator-child { ... }
.strata-drop-indicator-invalid { ... }
.strata-row-dragging { opacity: 0.5; }
```

- [ ] **Step 3: Commit**

## Task 4: Wire into GridRow

- [ ] **Step 1: Add `draggable` attribute when treeEditor.enableDrag is true**
- [ ] **Step 2: Add onDragStart, onDragOver, onDragLeave, onDrop handlers**
- [ ] **Step 3: Render DropIndicator based on current drop state**
- [ ] **Step 4: Auto-commit active cell edit on drag start**
- [ ] **Step 5: Integration tests — drag and drop reparents correctly**
- [ ] **Step 6: Integration tests — invalid drop shows error indicator**
- [ ] **Step 7: Run full suite — PASS**
- [ ] **Step 8: Commit**
