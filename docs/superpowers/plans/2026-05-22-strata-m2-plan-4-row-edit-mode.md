# Strata M2 · Plan 4 — Row Edit Mode · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement row-level editing — clicking "Edit" on a row opens all editable cells simultaneously. A row-level Save/Cancel commits or discards all changes at once. Row edit mode fires `onRowEditStart` and `onRowEditEnd` events.

**Architecture:** When `editable.mode === 'row'`, the edit state tracks a `rowId` instead of a single cell. All editable cells in that row render their editors simultaneously. A `RowEditControls` component renders Save/Cancel buttons (pinned to the right or in a dedicated action column). Validation runs on all cells; Save is blocked if any cell is invalid.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md` (§3.2, §5.4). Builds on Plans 1–3.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/use-edit-state.ts` | modify | Add row-level edit tracking |
| `src/model/use-edit-state.test.ts` | modify | Row edit mode tests |
| `src/components/editors/RowEditControls.tsx` | create | Save/Cancel buttons for row edit |
| `src/components/GridRow.tsx` | modify | Detect row edit mode, render all editors |
| `src/components/DataGrid.tsx` | modify | Accept `onRowEditStart`, `onRowEditEnd` |
| `src/components/DataGrid.rowEdit.test.tsx` | create | Row edit integration tests |
| `src/strata.css` | modify | Row edit controls styles |

---

## Task 1: Row edit state

- [ ] **Step 1: Extend `useEditState` with `startRowEdit`, `commitRowEdit`, `discardRowEdit`**
- [ ] **Step 2: Track `activeRowId` and per-cell pending values for the row**
- [ ] **Step 3: Write tests for row edit lifecycle**
- [ ] **Step 4: Run tests — PASS**
- [ ] **Step 5: Commit**

## Task 2: RowEditControls component

- [ ] **Step 1: Create `src/components/editors/RowEditControls.tsx`**
- [ ] **Step 2: Save button commits all row edits; Cancel discards**
- [ ] **Step 3: Save is disabled when any cell has validation errors**
- [ ] **Step 4: Add CSS for row edit controls**
- [ ] **Step 5: Commit**

## Task 3: Wire row edit into GridRow

- [ ] **Step 1: When `activeRowId` matches, render editors in all editable cells**
- [ ] **Step 2: Render `RowEditControls` at the end of the row**
- [ ] **Step 3: Integration tests — row edit start/commit/discard**
- [ ] **Step 4: Run full suite — PASS**
- [ ] **Step 5: Commit**
