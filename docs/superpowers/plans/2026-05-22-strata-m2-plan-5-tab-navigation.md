# Strata M2 · Plan 5 — Tab Navigation & Focus · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Tab/Shift+Tab/Enter navigation between editable cells during editing. Tab commits the current cell and moves the editor to the next editable cell in the row. Enter commits and moves down. Shift+Tab moves backward.

**Architecture:** A `useEditNavigation` hook listens for Tab/Enter/Shift+Tab on the active editor. It resolves the next/previous editable cell by scanning the column list and row list. On navigation, it commits the current cell and immediately starts editing the target cell.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md` (§6). Builds on Plans 1–2.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/use-edit-navigation.ts` | create | Tab/Enter navigation logic |
| `src/model/use-edit-navigation.test.ts` | create | Navigation unit tests |
| `src/components/editors/CellEditor.tsx` | modify | Wire navigation into editor key handlers |
| `src/components/DataGrid.editNav.test.tsx` | create | Integration tests for Tab navigation |

---

## Task 1: Edit navigation hook

- [ ] **Step 1: Write failing tests — next/prev editable cell resolution**
- [ ] **Step 2: Create `src/model/use-edit-navigation.ts`**
- [ ] **Step 3: Handle Tab → next editable cell in row (wrap to next row)**
- [ ] **Step 4: Handle Shift+Tab → previous editable cell (wrap to prev row)**
- [ ] **Step 5: Handle Enter → same column, next row**
- [ ] **Step 6: Skip non-editable cells in navigation**
- [ ] **Step 7: Run tests — PASS**
- [ ] **Step 8: Commit**

## Task 2: Wire navigation into CellEditor

- [ ] **Step 1: Intercept Tab/Shift+Tab/Enter in editor key handlers**
- [ ] **Step 2: Commit current cell, then call `startEdit` on target cell**
- [ ] **Step 3: Prevent default Tab behavior (don't leave the grid)**
- [ ] **Step 4: Integration tests — Tab moves through editable cells**
- [ ] **Step 5: Run full suite — PASS**
- [ ] **Step 6: Commit**
