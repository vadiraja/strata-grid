# Strata

**An open-source React tree data grid for PLM bills of materials and enterprise data.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Status: pre-release](https://img.shields.io/badge/status-pre--release-orange.svg)](#status)

Strata is a fast, accessible, themable **tree/BOM data grid** delivered as a
single `<DataGrid>` React component. Its defining capability is the **indented
multi-level tree grid** — the canonical view for Product Lifecycle Management
(PLM) bills of materials and other hierarchical enterprise data — delivered
free, where every comparable library either paywalls it or omits it.

---

## Why Strata

Existing data grids fail the hierarchical-data use case in one of two ways:

| Library | Gap |
|---|---|
| AG Grid | Tree Data, row grouping, pivoting are **Enterprise (paid)** |
| MUI X Data Grid | Tree data and grouping are **Pro/Premium (paid)** |
| Syncfusion | Commercial license; heavy |
| TanStack Table | Free & MIT, but **headless** — no UI, no virtualization, no styling |
| Glide Data Grid | Free, but **canvas-only** — weak DOM customization & accessibility |

The precise gap: **TanStack Table is free and includes a tree-aware row model,
but you must build the entire UI yourself.** Strata fills exactly that gap — it
*is* that UI, built on TanStack Table's tree-native row model so sorting and
filtering compose correctly with the hierarchy.

## Status

Strata is in **active early development** (Milestone 1: the read-only BOM /
tree data grid). The API is settling and may change before a `1.0` release.
It is **not yet published to npm**. See the [roadmap](./docs/roadmap.md) for
what is planned.

## Features

- **Tree / BOM mode** — indented, multi-level hierarchy with expand/collapse,
  from either nested data (`getChildren`) or flat parent-pointer data
  (`getParentId`).
- **Flat data grid** — the same component renders a plain grid with no
  hierarchy config.
- **Virtualized** — both row *and* column virtualization for large datasets.
- **Tree-aware sorting** — multi-column sorting that keeps children under their
  parents.
- **Per-column filtering** — built-in `text` and `number` filters, tree-aware
  (ancestors of matches are preserved).
- **Column management** — resize, drag-to-reorder, and left/right pinning.
- **Pluggable data source** — a `DataSource` seam with an `InMemoryDataSource`
  implementation included.
- **TypeScript-first** — fully typed, generic over your row type,
  uncontrolled-by-default API.
- **Accessible** — renders as an ARIA `treegrid`.
- **Themable** — styled entirely with CSS custom properties.

## Installation

> Not yet on npm. For now, clone this repository (see [Development](#development)).

Once published:

```bash
npm install strata-grid
```

`react` and `react-dom` (>= 18) are peer dependencies.

## Quick start

```tsx
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Material {
  id: string;
  material: string;
  description: string;
  qty: number;
}

const columns: ColumnDef<Material>[] = [
  { id: 'material', header: 'Material', accessor: 'material', filter: 'text' },
  { id: 'description', header: 'Description', accessor: 'description' },
  { id: 'qty', header: 'Qty', accessor: 'qty', filter: 'number' },
];

const data: Material[] = [
  { id: 'PT-3000', material: 'PT-3000', description: 'Front Triangle', qty: 1 },
  { id: 'PT-3001', material: 'PT-3001', description: 'Rear Triangle', qty: 1 },
];

export function Example() {
  return <DataGrid data={data} columns={columns} defaultSort={[{ columnId: 'material', direction: 'asc' }]} />;
}
```

## Tree / BOM mode

Pass a `treeData` config to turn the grid into a tree. Mark one column as the
tree column with `isTreeColumn` — it renders the indentation and the
expand/collapse control.

```tsx
interface BomNode {
  id: string;
  material: string;
  description: string;
  qty: number;
  children?: BomNode[];
}

const columns: ColumnDef<BomNode>[] = [
  { id: 'material', header: 'Material', accessor: 'material', isTreeColumn: true },
  { id: 'description', header: 'Description', accessor: 'description' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

<DataGrid
  data={bom}
  columns={columns}
  treeData={{
    getRowId: (row) => row.id,
    getChildren: (row) => row.children,
  }}
  defaultExpanded
/>;
```

For flat, parent-pointer data, supply `getParentId` instead of `getChildren`.

## API overview

### `<DataGrid>` props

| Prop | Type | Description |
|---|---|---|
| `data` | `TRow[]` | The rows to display. |
| `columns` | `ColumnDef<TRow>[]` | Column definitions. |
| `height` | `number` | Scrollable body height in px. Defaults to `400`. |
| `treeData` | `TreeDataConfig<TRow>` | Enables tree/BOM mode. |
| `defaultExpanded` | `boolean` | Tree mode: start every row expanded. |
| `defaultSort` | `ColumnSort[]` | Initial multi-column sort. |

### `ColumnDef` highlights

`id`, `header`, `accessor`, `cell` (custom renderer), `width` / `minWidth`,
`isTreeColumn`, `sortable`, `filter` (`'text' | 'number' | false`), and
`pin` (`'left' | 'right'`).

## Theming

Strata ships unopinionated styles driven by CSS custom properties. Import the
stylesheet (`strata-grid/styles.css`) and override the `--strata-*` tokens in
your own CSS to match your design system.

## Development

```bash
git clone https://github.com/vadiraja/strata-grid.git
cd strata-grid
npm install
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite playground. |
| `npm test` | Run the Vitest suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run typecheck` | Type-check with `tsc --noEmit`. |
| `npm run build` | Build the library bundle with `tsup`. |

## Roadmap

Strata is built milestone by milestone. See [`docs/roadmap.md`](./docs/roadmap.md)
for the full plan — editing & aggregation (M2), the hierarchy/BOM editor (M3),
server-side data sources & export (M4), and more.

## Contributing

Contributions are welcome. The project follows a spec → plan → test-first build
cycle; design specs live in `docs/superpowers/specs/` and implementation plans
in `docs/superpowers/plans/`. Please open an issue to discuss substantial
changes before submitting a pull request.

## License

[MIT](./LICENSE)
