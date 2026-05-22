# Strata M2 · Plan 8 — Custom Editors & GridApi · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the editing extension points: custom editor components via `ColumnDef.editor`, and imperative editing methods on `GridApi` (`startCellEdit`, `commitEdit`, `discardEdit`, `startRowEdit`, `getDirtyState`, `isDirty`). Also add the `singleClick` and `enter` activation modes.

**Architecture:** The `CellEditor` resolver already checks for `ColumnDef.editor` (custom component) before falling back to built-in editors. This plan ensures the custom editor receives the full `EditorContext` and integrates with validation and navigation. The `GridApi` editing methods delegate to `useEditState` via a ref, exposed through the existing `apiRef` pattern.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md` (§5.3, §5.6). Builds on Plans 1–5.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/components/editors/CellEditor.tsx` | modify | Wire custom editor rendering with full EditorContext |
| `src/components/DataCell.tsx` | modify | Support `singleClick` and `enter` activation |
| `src/model/use-grid-api.ts` | create | GridApi hook with editing methods |
| `src/model/use-grid-api.test.ts` | create | API method tests |
| `src/components/DataGrid.tsx` | modify | Wire apiRef, expose GridApi |
| `src/components/DataGrid.customEditor.test.tsx` | create | Custom editor integration tests |
| `src/index.ts` | modify | Export GridApi type |

---

## Task 1: Custom editor rendering

- [ ] **Step 1: Update CellEditor to call `ColumnDef.editor(ctx)` when provided**
- [ ] **Step 2: Build full `EditorContext` with validation state**
- [ ] **Step 3: Test — custom editor receives correct context**
- [ ] **Step 4: Test — custom editor can commit/discard via context**
- [ ] **Step 5: Commit**

## Task 2: Additional activation modes

- [ ] **Step 1: Support `activateOn: 'singleClick'` — single click activates**
- [ ] **Step 2: Support `activateOn: 'enter'` — Enter key activates (from keyboard nav)**
- [ ] **Step 3: Test — single click activation works**
- [ ] **Step 4: Test — Enter activation works**
- [ ] **Step 5: Commit**

## Task 3: GridApi editing methods

- [ ] **Step 1: Create `src/model/use-grid-api.ts`**

```ts
export interface GridApi<TRow> {
  // Existing M1 methods...
  expandAll(): void;
  collapseAll(): void;
  expandRow(id: string, expanded?: boolean): void;
  scrollToRow(id: string): void;
  getSelectedRows(): TRow[];

  // M2 editing methods
  startCellEdit(rowId: string, columnId: string): void;
  commitEdit(): void;
  discardEdit(): void;
  startRowEdit(rowId: string): void;
  commitRowEdit(): void;
  discardRowEdit(): void;
  getDirtyState(): Map<string, Map<string, unknown>>;
  isDirty(): boolean;
  clearDirtyState(): void;
}
```

- [ ] **Step 2: Wire API methods to `useEditState` via ref**
- [ ] **Step 3: Accept `apiRef` prop on DataGrid, populate on mount**
- [ ] **Step 4: Test — `apiRef.current.startCellEdit()` activates editing**
- [ ] **Step 5: Test — `apiRef.current.commitEdit()` commits**
- [ ] **Step 6: Test — `apiRef.current.isDirty()` reflects state**
- [ ] **Step 7: Export `GridApi` type from `src/index.ts`**
- [ ] **Step 8: Run full suite — PASS**
- [ ] **Step 9: Commit**

## Task 4: Playground demo

- [ ] **Step 1: Update `playground/App.tsx` with an editable BOM grid**
- [ ] **Step 2: Demo: editable qty column, extQty roll-up, validation**
- [ ] **Step 3: Demo: custom editor for material type (select)**
- [ ] **Step 4: Commit**
