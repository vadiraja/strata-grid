---
title: Interactive cell UX
description: Range selection, fill handle, status bar, context menu, and auto-size.
---

Strata 0.3.0 adds five Excel-class interactions to make cell-level work feel native.

## Range selection

Drag across cells with the mouse, or hold Shift and arrow to extend. Press
`Ctrl/Cmd+C` to copy the rectangular range to the clipboard as tab-separated
values. Range selection is independent of row selection — having both on is fine.

## Fill handle

When a range is active, a small dot appears at the bottom-right corner of the
focus cell. Drag it to extend the range; on release the grid emits
`onFillRange({ source, targets, value })`. Consumers are responsible for
applying the fill — Strata never mutates row data implicitly.

## Status bar

Opt in with `statusBar`. Defaults show row count, selected count, and range
stats. To customize:

```tsx
<DataGrid
  statusBar={{
    defaults: false,
    getSegments: ({ totalRowCount, range, rangeStats }) => [
      { id: 'rows', label: `${totalRowCount.toLocaleString()} rows` },
      ...(range && rangeStats.sum != null
        ? [{ id: 'sum', label: `Σ ${rangeStats.sum.toLocaleString()}` }]
        : []),
    ],
  }}
/>
```

## Context menu

Opt in with `contextMenu` or pass a `ContextMenuConfig` to customize. The
`getItems(ctx)` callback receives the target (cell/row/header) and the current
selection/range; return a fresh item list per open.

## Auto-size

Double-click a column's resize handle to fit it to the widest visible cell, or
call `GridApi.autoSizeColumn(id)` / `autoSizeAllColumns()`. Auto-size is also
available from the header context menu by default.
