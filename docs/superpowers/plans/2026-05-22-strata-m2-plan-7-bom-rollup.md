# Strata M2 · Plan 7 — BOM Quantity Roll-up · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement BOM extended quantity roll-up — the defining PLM feature. Extended quantity = parent's extended qty × this row's component quantity, cascading from root to leaves. The roll-up recomputes when quantities are edited or data changes.

**Architecture:** A `computeExtendedQuantity` pure function traverses the tree top-down, multiplying parent extended qty by each child's component qty. A `useBomRollup` hook wraps this computation, memoizes results, and recomputes on data/edit changes. The computed values are injected into a virtual "extQty" column or displayed via a cell renderer on the target column.

**Tech Stack:** TypeScript, React 18/19, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-22-strata-m2-editing-aggregation-design.md` (§3.6, §7). Builds on Plans 1 (edit state) and M1 (tree data).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/model/bom-rollup.ts` | create | Pure function: compute extended quantities |
| `src/model/bom-rollup.test.ts` | create | Roll-up math unit tests |
| `src/model/use-bom-rollup.ts` | create | Hook: memoized roll-up, recomputes on changes |
| `src/model/use-bom-rollup.test.ts` | create | Hook integration tests |
| `src/components/DataGrid.tsx` | modify | Accept `aggregation.extendedQuantity`, wire hook |
| `src/components/DataGrid.bomRollup.test.tsx` | create | Full integration tests |

---

## Task 1: BOM roll-up pure function

- [ ] **Step 1: Write failing tests for `computeExtendedQuantity`**

Test cases:
- Single root: extQty = qty (parentExtQty defaults to 1)
- Two levels: root qty=2, child qty=3 → child extQty=6
- Three levels: root=2, child=3, grandchild=4 → grandchild extQty=24
- Zero quantity: propagates zero down
- Null/undefined qty: treated as 0, dev-warn
- Multiple roots: each root starts fresh

- [ ] **Step 2: Create `src/model/bom-rollup.ts`**

```ts
export interface BomNode {
  id: string;
  qty: number;
  children: BomNode[];
}

export interface ExtendedQtyResult {
  /** Map of rowId → computed extended quantity. */
  extendedQuantities: Map<string, number>;
}

/**
 * Computes extended quantities for a BOM tree.
 *
 * Extended quantity = parent's extended qty × this node's component qty.
 * Root nodes have extQty = their own qty (parentExtQty = 1).
 *
 * O(n) — single top-down traversal.
 */
export function computeExtendedQuantity(roots: BomNode[]): ExtendedQtyResult {
  const result = new Map<string, number>();

  function visit(node: BomNode, parentExtQty: number): void {
    const qty = node.qty ?? 0;
    const extQty = parentExtQty * qty;
    result.set(node.id, extQty);
    for (const child of node.children) {
      visit(child, extQty);
    }
  }

  for (const root of roots) {
    visit(root, 1);
  }

  return { extendedQuantities: result };
}
```

- [ ] **Step 3: Run tests — PASS**
- [ ] **Step 4: Commit**

## Task 2: useBomRollup hook

- [ ] **Step 1: Write failing tests for the hook**
- [ ] **Step 2: Create `src/model/use-bom-rollup.ts`**
- [ ] **Step 3: Memoize computation based on data + dirty state**
- [ ] **Step 4: Recompute when a qty cell is committed**
- [ ] **Step 5: Run tests — PASS**
- [ ] **Step 6: Commit**

## Task 3: Wire into DataGrid

- [ ] **Step 1: Accept `aggregation.extendedQuantity` config**
- [ ] **Step 2: Build `BomNode[]` from tree data + source column**
- [ ] **Step 3: Inject computed extQty into target column's cell renderer**
- [ ] **Step 4: Integration test — extQty displays correctly in tree grid**
- [ ] **Step 5: Integration test — editing qty recomputes extQty**
- [ ] **Step 6: Run full suite — PASS**
- [ ] **Step 7: Commit**
