# Strata — M5 · Plan 8: Print stylesheet

- **Date:** 2026-05-23
- **Depends on:** M1 (virtualizer), M4 (lazy tree — for the warning logic).

## Goal

Make `window.print()` produce a clean static rendering of the grid: no
virtualization gaps, no horizontal scrollbar chrome, page-break-friendly
rows.

## Scope

### CSS

```css
@media print {
  .strata-grid {
    overflow: visible !important;
    border: 1px solid #000;
  }
  .strata-virtual-padding-before,
  .strata-virtual-padding-after { display: none; }
  .strata-horizontal-scrollbar-row,
  .strata-footer { display: none; }
  .strata-row,
  .strata-cell,
  .strata-header-cell {
    page-break-inside: avoid;
  }
  /* Headers repeat on each printed page where supported */
  .strata-header-area {
    display: table-header-group;
  }
  /* Hide interactive chrome */
  .strata-tree-toggle,
  .strata-resize-handle,
  .strata-filter-icon-btn { visibility: hidden; }
}
```

### JS: print-mode virtualization bypass

A new hook `src/virtual/use-print-mode.ts`:

- Subscribes to `matchMedia('print')`.
- When matched: flips a `printing` flag that the row virtualizer reads to
  switch from "windowed" to "all loaded rows" rendering.
- After `afterprint`: restores windowed mode.

The row virtualizer respects this flag by returning `getVirtualItems()` for
the full row range when `printing=true`.

### Lazy-tree warning

When `printing` becomes `true` and a `useLazyTree` instance reports any
unloaded children among visible parents, emit a single `console.warn`:

> Strata: printing while lazy tree has unloaded children. Printout will not
> include unloaded rows. Call `lazyTree.loadAll()` before printing if you
> want a complete export.

## Tests

- `src/virtual/use-print-mode.test.ts`:
  - mock `matchMedia('print')`, assert printing flag flips,
  - assert virtualizer returns all loaded items in printing mode.
- `DataGrid.print.test.tsx`:
  - render with 500 rows, force `printing=true`, assert all 500 row elements
    are present in the DOM.

## Acceptance

- `cmd-P` from any playground tab yields a printable preview that includes
  the visible row set without virtualization gaps.
- Page breaks land between rows, not through rows.
- Headers repeat across pages on browsers that support
  `display: table-header-group`.
