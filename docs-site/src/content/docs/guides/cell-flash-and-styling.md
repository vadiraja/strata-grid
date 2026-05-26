---
title: Cell flash and conditional styling
description: Briefly highlight cells when values change; apply per-row class or style overrides.
---

## Cell flash on update

Pair Strata with any source of streaming row updates — `useLiveUpdates`, polling,
WebSocket — and opt in to `flashOnUpdate` to briefly highlight cells whose value
changed between renders.

```tsx
<DataGrid data={rows} columns={columns} flashOnUpdate />
```

For a custom duration:

```tsx
<DataGrid data={rows} columns={columns} flashOnUpdate={{ durationMs: 800 }} />
```

Flash uses `Object.is` for equality, so reference changes that don't change the
displayed value will still flash. Keep your row updates surgical (mutate only
what changed) for the best result. Respects `prefers-reduced-motion` — users
who opt out see a static highlight instead of an animation.

## Conditional cell styling

`ColumnDef.cellClass` and `ColumnDef.cellStyle` are functions of `(CellContext)`
that return a class string or `React.CSSProperties` object per row. Use them
when you want value-driven styling without writing a full custom `cell`
renderer.

```tsx
const columns: ColumnDef<Row>[] = [
  {
    id: 'balance',
    header: 'Balance',
    accessor: 'balance',
    cellClass: ({ value }) => ((value as number) < 0 ? 'negative' : undefined),
    cellStyle: ({ value }) =>
      (value as number) < 0 ? { color: 'crimson' } : undefined,
  },
];
```

Both are called per-render, so keep them pure and cheap.
