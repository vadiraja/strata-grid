# Strata M2 · Plan 6 — Column Aggregation · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add column-level aggregation (sum, avg, min, max, count, custom) displayed on group rows and optionally in the grid footer. When row grouping is active (from M1 Plan 9), group rows show the aggregate of their leaf rows. The footer can show aggregates of all visible rows.

**Architecture:** A `useAggregation` hook computes aggregates per column for each group and for the full dataset. TanStack Table's `getGroupedRowModel` already supports aggregation functions — we wire Strata's `ColumnDef.aggregate` into TanStack's `aggregationFn`. An `AggregateCell` component renders the computed value in group rows. The footer optionally shows column totals.

**Tech Stack:** TypeScript, React 18/19, `@tanstack/react-table` v8 (aggregation), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md` (§3.7, §5.5). Builds on M1 Plan 9 (row grouping).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/use-aggregation.ts` | create | Compute aggregates for groups and footer |
| `src/model/use-aggregation.test.ts` | create | Aggregation math unit tests |
| `src/model/aggregate-fns.ts` | create | Built-in aggregate functions (sum, avg, min, max, count) |
| `src/model/aggregate-fns.test.ts` | create | Aggregate function unit tests |
| `src/components/AggregateCell.tsx` | create | Renders aggregate value in group rows |
| `src/components/GroupRow.tsx` | modify | Render AggregateCell for columns with aggregation |
| `src/components/GridFooter.tsx` | modify | Optionally show column aggregates |
| `src/components/DataGrid.tsx` | modify | Accept `aggregation` config, wire into table |
| `src/components/DataGrid.aggregation.test.tsx` | create | Integration tests |

---

## Task 1: Aggregate functions

- [ ] **Step 1: Write failing tests for sum, avg, min, max, count**
- [ ] **Step 2: Create `src/model/aggregate-fns.ts`**
- [ ] **Step 3: Handle edge cases: empty arrays, null values, non-numeric values**
- [ ] **Step 4: Run tests — PASS**
- [ ] **Step 5: Commit**

## Task 2: useAggregation hook

- [ ] **Step 1: Write failing tests for group-level and footer-level aggregation**
- [ ] **Step 2: Create `src/model/use-aggregation.ts`**
- [ ] **Step 3: Wire TanStack's `aggregationFn` from `ColumnDef.aggregate`**
- [ ] **Step 4: Compute footer aggregates from all visible rows**
- [ ] **Step 5: Run tests — PASS**
- [ ] **Step 6: Commit**

## Task 3: AggregateCell component

- [ ] **Step 1: Create `src/components/AggregateCell.tsx`**
- [ ] **Step 2: Render formatted aggregate value (use `aggregateFormatter` if provided)**
- [ ] **Step 3: Add CSS for aggregate cells (bold, right-aligned for numbers)**
- [ ] **Step 4: Commit**

## Task 4: Wire into GroupRow and Footer

- [ ] **Step 1: Update `GroupRow` to render `AggregateCell` for each aggregated column**
- [ ] **Step 2: Update `GridFooter` to show column aggregates when `showFooterAggregates` is true**
- [ ] **Step 3: Integration tests — group aggregates display correctly**
- [ ] **Step 4: Integration tests — footer aggregates display correctly**
- [ ] **Step 5: Run full suite — PASS**
- [ ] **Step 6: Commit**
