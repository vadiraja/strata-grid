# Strata M2 · Plan 3 — Validation · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement per-column validation with synchronous and async validators. Validation runs on each keystroke (debounced 300ms) and on commit attempt. Invalid commits are blocked and errors display inline below the editor.

**Architecture:** A `useValidation` hook accepts the column's `validate` field and the current pending value. It runs validators (debounced), tracks status (`valid | invalid | validating`), and exposes the result. The `CellEditor` reads validation state and conditionally blocks commit. A `ValidationMessage` component renders error text below the active cell.

**Tech Stack:** TypeScript, React 18/19, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md` (§3.4). Builds on Plan 2 (editors).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/use-validation.ts` | create | Validation hook — runs validators, debounces, tracks state |
| `src/model/use-validation.test.ts` | create | Unit tests for validation logic |
| `src/components/editors/ValidationMessage.tsx` | create | Error tooltip below active cell |
| `src/components/editors/CellEditor.tsx` | modify | Wire validation, block invalid commits |
| `src/strata.css` | modify | Validation message styles |

---

## Task 1: useValidation hook

- [ ] **Step 1: Write failing tests for `src/model/use-validation.test.ts`**
- [ ] **Step 2: Create `src/model/use-validation.ts`**
- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: ValidationMessage component

- [ ] **Step 1: Create `src/components/editors/ValidationMessage.tsx`**
- [ ] **Step 2: Add validation CSS to `src/strata.css`**
- [ ] **Step 3: Commit**

## Task 3: Wire validation into CellEditor

- [ ] **Step 1: Update `CellEditor.tsx` to use `useValidation`**
- [ ] **Step 2: Block commit when validation status is `invalid` or `validating`**
- [ ] **Step 3: Render `ValidationMessage` when there's an error**
- [ ] **Step 4: Integration test — invalid value blocks commit**
- [ ] **Step 5: Integration test — async validator shows "validating" state**
- [ ] **Step 6: Run full suite — PASS**
- [ ] **Step 7: Commit**
