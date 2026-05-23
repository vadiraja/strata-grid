# Strata

**An open-source React tree data grid for hierarchical and nested data.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![Status: pre-release](https://img.shields.io/badge/status-pre--release-orange.svg)](#status)

Strata is a fast, accessible, themable **tree data grid** delivered as a single
`<DataGrid>` React component. Its defining capability is the **indented,
multi-level tree grid** — delivered free, where comparable libraries either
paywall it or omit it.

It renders any parent/child hierarchy, and works equally with **nested data**
(objects that hold a `children` array) and **flat, parent-pointer data** (rows
that reference a `parentId`).

### Use it for

- File and folder explorers
- Org charts and reporting lines
- Category, taxonomy, and navigation trees
- Threaded or nested comments
- Chart-of-accounts and ledger hierarchies
- Bills of materials and product structures
- JSON and nested-data inspectors

…or as a plain flat grid — the same component renders both.

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

Strata is in **alpha**. The core grid, tree data, editing, aggregation,
hierarchy editor, data-source, export, and theming APIs are implemented and
covered by tests, but the public API may still change before a `1.0` release.
Use the `0.x` releases for evaluation, prototypes, and early integrations.

## Features

- **Tree mode** — indented, multi-level hierarchy with expand/collapse, from
  either nested data (`getChildren`) or flat parent-pointer data (`getParentId`).
- **Flat data grid** — the same component renders a plain grid with no
  hierarchy config.
- **Virtualized** — both row *and* column virtualization for large datasets.
- **Tree-aware sorting** — multi-column sorting that keeps children under their
  parents.
- **Per-column filtering** — built-in `text` and `number` filters, tree-aware
  (ancestors of matches are preserved).
- **Column management** — resize, drag-to-reorder, and left/right pinning.
- **Row selection** — single and multi-select modes with tree-aware cascade
  support.
- **Editing** — built-in text, number, date, checkbox, and select editors,
  custom editor support, validation, and row-edit workflows.
- **Aggregation** — grouped-row and footer aggregates, plus BOM-style extended
  quantity rollups for product structures.
- **Hierarchy editor** — command-driven add/delete/move/reorder,
  indent/outdent, clipboard, drag/drop, history, and change tracking helpers.
- **Pluggable data source** — a `DataSource` seam with an `InMemoryDataSource`
  implementation included.
- **Server-scale helpers** — pagination, lazy tree loading, live updates,
  where-used lookup, quick search, advanced filter builders, and an OData
  adapter.
- **Export** — CSV and XLSX writer utilities plus a React export hook.
- **TypeScript-first** — fully typed, generic over your row type,
  uncontrolled-by-default API.
- **Accessible** — renders as an ARIA `treegrid`.
- **Themable** — styled with CSS custom properties, token files, dark theme
  support, density options, and high-contrast states.

## Installation

```bash
npm install strata-grid
```

`react` and `react-dom` (>= 18) are peer dependencies.

## Quick start

A plain flat grid — no hierarchy config required:

```tsx
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Person {
  id: string;
  name: string;
  role: string;
  level: number;
}

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name', filter: 'text' },
  { id: 'role', header: 'Role', accessor: 'role', filter: 'text' },
  { id: 'level', header: 'Level', accessor: 'level', filter: 'number' },
];

const data: Person[] = [
  { id: '1', name: 'Ada Lovelace', role: 'Engineer', level: 5 },
  { id: '2', name: 'Alan Turing', role: 'Architect', level: 6 },
];

export function Example() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      defaultSort={[{ columnId: 'name', direction: 'asc' }]}
    />
  );
}
```

## Tree mode

Pass a `treeData` config to turn the grid into a tree. Mark one column as the
tree column with `isTreeColumn` — it renders the indentation and the
expand/collapse control. This example models a file explorer:

```tsx
interface FileNode {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  size: number;
  children?: FileNode[];
}

const columns: ColumnDef<FileNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
  { id: 'kind', header: 'Kind', accessor: 'kind' },
  { id: 'size', header: 'Size', accessor: 'size' },
];

<DataGrid
  data={files}
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
| `treeData` | `TreeDataConfig<TRow>` | Enables tree mode. |
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

Optional theme token files are exported for direct imports:

```tsx
import 'strata-grid/styles.css';
import 'strata-grid/theme/tokens.css';
import 'strata-grid/theme/dark.css';
```

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

## Documentation

Full documentation lives at <https://vadiraja.github.io/strata-grid/>:

- [Getting started](https://vadiraja.github.io/strata-grid/getting-started/introduction/)
- [Guides](https://vadiraja.github.io/strata-grid/guides/tree-data/) - one page per shipped capability
- [API reference](https://vadiraja.github.io/strata-grid/api/) - auto-generated from TSDoc

## Roadmap

Strata is built milestone by milestone. See [`docs/roadmap.md`](./docs/roadmap.md)
for the full plan and current release track.

## Contributing

Contributions are welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and the
[contributing guide in the docs](https://vadiraja.github.io/strata-grid/contributing/overview/).
The project follows a spec to plan to test-first cycle; design specs live in
`docs/superpowers/specs/` and implementation plans in `docs/superpowers/plans/`.

## License

[Apache License 2.0](./LICENSE) — see the [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE) files.
