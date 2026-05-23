# Strata — M8 · Plan 3: Guide content & contributing guide

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author the user-facing content — Getting Started (3 pages beyond the introduction stub), 10 Guides pages (one per shipped capability, each with at least one live `<DataGrid>` example), and a 4-page Contributing guide. Also add a top-level `CONTRIBUTING.md` that points into the docs.

**Architecture:** All content is MDX under `docs-site/src/content/docs/`. Live examples are React island components under `docs-site/src/components/examples/` and mounted with `<Example client:load />`. Example files import directly from `strata-grid` (workspace-linked).

**Tech Stack:** MDX, Starlight, React 19, `strata-grid` (workspace).

**Date:** 2026-05-23
**Depends on:** M8 Plans 1 and 2.

---

### Conventions used across all content

- Every guide page starts with frontmatter: `title`, `description`, `sidebar.order`.
- Examples live in `docs-site/src/components/examples/<topic>/<ExampleName>.tsx` (one folder per guide).
- Each example file is self-contained: includes its own data, columns, and default-exports the component.
- Examples import `'strata-grid/styles.css'` so the page renders correctly even if the user visits a single page.
- Code snippets in MDX use ` ```tsx ` fenced blocks.
- The MDX page imports the example component and renders it with `<Example client:load />`.

---

### Task 1: Getting Started — Installation page

**Files:**
- Create: `docs-site/src/content/docs/getting-started/installation.mdx`

- [ ] **Step 1: Write `installation.mdx`**

```mdx
---
title: Installation
description: Install strata-grid and import its styles.
sidebar:
  order: 2
---

import { Tabs, TabItem } from '@astrojs/starlight/components';

## Install the package

<Tabs>
  <TabItem label="npm">
    ```bash
    npm install strata-grid
    ```
  </TabItem>
  <TabItem label="pnpm">
    ```bash
    pnpm add strata-grid
    ```
  </TabItem>
  <TabItem label="yarn">
    ```bash
    yarn add strata-grid
    ```
  </TabItem>
</Tabs>

## Peer dependencies

Strata requires React 18 or later:

```bash
npm install react@>=18 react-dom@>=18
```

## Import the stylesheet

The base stylesheet is required:

```tsx
import 'strata-grid/styles.css';
```

Optional theme files give you a token reset and a dark theme:

```tsx
import 'strata-grid/theme/tokens.css';
import 'strata-grid/theme/dark.css';
```

## TypeScript

Strata ships its own type definitions. No separate `@types` package is needed.
```

- [ ] **Step 2: Build to verify**

Run: `npm run build -w @strata-grid/docs-site`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add docs-site/src/content/docs/getting-started/installation.mdx
git commit -m "docs(m8): installation page"
```

---

### Task 2: Getting Started — Quick start (flat grid)

**Files:**
- Create: `docs-site/src/components/examples/quick-start/FlatGrid.tsx`
- Create: `docs-site/src/content/docs/getting-started/quick-start-flat.mdx`

- [ ] **Step 1: Create the example**

`docs-site/src/components/examples/quick-start/FlatGrid.tsx`:

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
  { id: '3', name: 'Grace Hopper', role: 'Engineer', level: 5 },
  { id: '4', name: 'Hedy Lamarr', role: 'Researcher', level: 4 },
];

export default function FlatGrid() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={300}
      defaultSort={[{ columnId: 'name', direction: 'asc' }]}
    />
  );
}
```

- [ ] **Step 2: Write the MDX page**

`docs-site/src/content/docs/getting-started/quick-start-flat.mdx`:

```mdx
---
title: Quick start — flat grid
description: Render a plain, sortable, filterable grid with no hierarchy config.
sidebar:
  order: 3
---

import FlatGrid from '../../../components/examples/quick-start/FlatGrid.tsx';

Strata works as a plain flat grid with no tree config required.

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

<DataGrid
  data={data}
  columns={columns}
  height={300}
  defaultSort={[{ columnId: 'name', direction: 'asc' }]}
/>
```

## Live

<FlatGrid client:load />
```

- [ ] **Step 3: Build & view**

Run: `npm run build -w @strata-grid/docs-site`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add docs-site/src/components/examples/quick-start/FlatGrid.tsx docs-site/src/content/docs/getting-started/quick-start-flat.mdx
git commit -m "docs(m8): quick-start flat grid example"
```

---

### Task 3: Getting Started — Quick start (tree grid)

**Files:**
- Create: `docs-site/src/components/examples/quick-start/TreeGrid.tsx`
- Create: `docs-site/src/components/examples/quick-start/FlatTreeGrid.tsx`
- Create: `docs-site/src/content/docs/getting-started/quick-start-tree.mdx`

- [ ] **Step 1: Create the nested-data example**

`docs-site/src/components/examples/quick-start/TreeGrid.tsx`:

```tsx
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface FileNode {
  id: string;
  name: string;
  kind: 'folder' | 'file';
  size: number;
  children?: FileNode[];
}

const data: FileNode[] = [
  {
    id: '1',
    name: 'src',
    kind: 'folder',
    size: 0,
    children: [
      { id: '1.1', name: 'index.ts', kind: 'file', size: 1200 },
      { id: '1.2', name: 'app.tsx', kind: 'file', size: 4096 },
      {
        id: '1.3',
        name: 'components',
        kind: 'folder',
        size: 0,
        children: [
          { id: '1.3.1', name: 'Button.tsx', kind: 'file', size: 800 },
          { id: '1.3.2', name: 'Modal.tsx', kind: 'file', size: 1600 },
        ],
      },
    ],
  },
  { id: '2', name: 'README.md', kind: 'file', size: 5300 },
];

const columns: ColumnDef<FileNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
  { id: 'kind', header: 'Kind', accessor: 'kind' },
  { id: 'size', header: 'Size', accessor: 'size' },
];

export default function TreeGrid() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={350}
      treeData={{
        getRowId: (row) => row.id,
        getChildren: (row) => row.children,
      }}
      defaultExpanded
    />
  );
}
```

- [ ] **Step 2: Create the flat parent-pointer variant**

`docs-site/src/components/examples/quick-start/FlatTreeGrid.tsx`:

```tsx
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface FlatNode {
  id: string;
  parentId: string | null;
  name: string;
  kind: 'folder' | 'file';
}

const data: FlatNode[] = [
  { id: '1', parentId: null, name: 'src', kind: 'folder' },
  { id: '1.1', parentId: '1', name: 'index.ts', kind: 'file' },
  { id: '1.2', parentId: '1', name: 'app.tsx', kind: 'file' },
  { id: '1.3', parentId: '1', name: 'components', kind: 'folder' },
  { id: '1.3.1', parentId: '1.3', name: 'Button.tsx', kind: 'file' },
  { id: '2', parentId: null, name: 'README.md', kind: 'file' },
];

const columns: ColumnDef<FlatNode>[] = [
  { id: 'name', header: 'Name', accessor: 'name', isTreeColumn: true },
  { id: 'kind', header: 'Kind', accessor: 'kind' },
];

export default function FlatTreeGrid() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={300}
      treeData={{
        getRowId: (row) => row.id,
        getParentId: (row) => row.parentId,
      }}
      defaultExpanded
    />
  );
}
```

- [ ] **Step 3: Write the MDX page**

`docs-site/src/content/docs/getting-started/quick-start-tree.mdx`:

```mdx
---
title: Quick start — tree grid
description: Render a multi-level tree from nested or flat parent-pointer data.
sidebar:
  order: 4
---

import TreeGrid from '../../../components/examples/quick-start/TreeGrid.tsx';
import FlatTreeGrid from '../../../components/examples/quick-start/FlatTreeGrid.tsx';

Strata renders any parent/child hierarchy. Use the `treeData` prop and mark
one column as the tree column with `isTreeColumn`.

## Nested data (`getChildren`)

When your rows already contain a `children` array, supply `getChildren`:

```tsx
<DataGrid
  data={files}
  columns={columns}
  treeData={{
    getRowId: (row) => row.id,
    getChildren: (row) => row.children,
  }}
  defaultExpanded
/>
```

<TreeGrid client:load />

## Flat parent-pointer data (`getParentId`)

For flat rows that reference a parent by id, supply `getParentId` instead:

```tsx
<DataGrid
  data={rows}
  columns={columns}
  treeData={{
    getRowId: (row) => row.id,
    getParentId: (row) => row.parentId,
  }}
  defaultExpanded
/>
```

<FlatTreeGrid client:load />
```

- [ ] **Step 4: Build & spot-check**

Run: `npm run build -w @strata-grid/docs-site`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add docs-site/src/components/examples/quick-start/TreeGrid.tsx docs-site/src/components/examples/quick-start/FlatTreeGrid.tsx docs-site/src/content/docs/getting-started/quick-start-tree.mdx
git commit -m "docs(m8): quick-start tree grid examples (nested + flat)"
```

---

### Task 4: Guide — Tree data

**Files:**
- Create: `docs-site/src/content/docs/guides/tree-data.mdx`
- Reuse: examples from Task 3.

- [ ] **Step 1: Write `tree-data.mdx`**

```mdx
---
title: Tree data
description: Indented, multi-level grids from nested or flat data.
sidebar:
  order: 1
---

import TreeGrid from '../../../components/examples/quick-start/TreeGrid.tsx';
import FlatTreeGrid from '../../../components/examples/quick-start/FlatTreeGrid.tsx';

Strata's defining capability is the indented, multi-level tree grid. This guide
covers the two shapes of input data, the tree column, and expand/collapse
behavior.

## The two shapes

| Input shape       | Config field            | Use when…                                            |
|-------------------|------------------------|------------------------------------------------------|
| Nested children   | `getChildren(row)`     | Your rows already form a tree (e.g., JSON imports). |
| Flat parent ids   | `getParentId(row)`     | Your rows come from a flat table with `parentId`.   |

Strata internally normalizes both to the same row model, so sorting and
filtering behave identically.

## The tree column

Mark exactly one column as the tree column with `isTreeColumn: true`. That column
renders the indentation guides and the expand/collapse chevron. All other
columns render normally.

## Expand / collapse

- Click the chevron in the tree column to toggle.
- `defaultExpanded` expands every row on first render.
- The grid tracks expansion state internally by row id; programmatic control is
  available via the `GridApi`.

## Examples

Nested:

<TreeGrid client:load />

Flat parent-pointer:

<FlatTreeGrid client:load />
```

- [ ] **Step 2: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/content/docs/guides/tree-data.mdx
git commit -m "docs(m8): guide — tree data"
```

---

### Task 5: Guide — Sorting & filtering

**Files:**
- Create: `docs-site/src/components/examples/sorting-filtering/SortableGrid.tsx`
- Create: `docs-site/src/content/docs/guides/sorting-filtering.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/sorting-filtering/SortableGrid.tsx`:

```tsx
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Part {
  id: string;
  partNumber: string;
  qty: number;
  children?: Part[];
}

const data: Part[] = [
  {
    id: '1', partNumber: 'A-100', qty: 1,
    children: [
      { id: '1.1', partNumber: 'B-201', qty: 2 },
      { id: '1.2', partNumber: 'B-202', qty: 3 },
    ],
  },
  {
    id: '2', partNumber: 'A-110', qty: 1,
    children: [
      { id: '2.1', partNumber: 'B-301', qty: 4 },
    ],
  },
];

const columns: ColumnDef<Part>[] = [
  { id: 'partNumber', header: 'Part #', accessor: 'partNumber', isTreeColumn: true, filter: 'text' },
  { id: 'qty', header: 'Qty', accessor: 'qty', filter: 'number' },
];

export default function SortableGrid() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={320}
      treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
      defaultExpanded
      defaultSort={[{ columnId: 'partNumber', direction: 'asc' }]}
    />
  );
}
```

- [ ] **Step 2: Write `sorting-filtering.mdx`**

```mdx
---
title: Sorting & filtering
description: Tree-aware sort and per-column filter, with multi-column sort.
sidebar:
  order: 2
---

import SortableGrid from '../../../components/examples/sorting-filtering/SortableGrid.tsx';

Sorting and filtering in Strata are **tree-aware**: children stay grouped under
their parents, and ancestors of matching rows are preserved during a filter so
the path stays visible.

## Per-column sort

Click a header to sort ascending; click again to flip; click again to clear.
Shift-click additional headers to add them to a multi-column sort. Use
`defaultSort` to set an initial multi-column order:

```tsx
<DataGrid
  // ...
  defaultSort={[
    { columnId: 'partNumber', direction: 'asc' },
    { columnId: 'qty', direction: 'desc' },
  ]}
/>
```

## Per-column filter

Pass a `filter` value on each column definition:

| Value      | Behavior                                |
|------------|-----------------------------------------|
| `'text'`   | Case-insensitive contains match.        |
| `'number'` | Numeric comparison with operator menu.  |
| `false`    | No filter UI for this column (default). |

Filtering preserves ancestors of every matching row, so you never see an
orphaned child without its parent.

<SortableGrid client:load />
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/sorting-filtering/ docs-site/src/content/docs/guides/sorting-filtering.mdx
git commit -m "docs(m8): guide — sorting & filtering"
```

---

### Task 6: Guide — Column management

**Files:**
- Create: `docs-site/src/components/examples/columns/ManagedColumnsGrid.tsx`
- Create: `docs-site/src/content/docs/guides/column-management.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/columns/ManagedColumnsGrid.tsx`:

```tsx
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Row {
  id: string;
  a: string;
  b: string;
  c: string;
  d: string;
}

const rows: Row[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i),
  a: `A-${i}`,
  b: `B-${i}`,
  c: `C-${i}`,
  d: `D-${i}`,
}));

const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'A (pinned left)', accessor: 'a', pin: 'left', width: 140 },
  { id: 'b', header: 'B', accessor: 'b', width: 120 },
  { id: 'c', header: 'C', accessor: 'c', width: 120 },
  { id: 'd', header: 'D (pinned right)', accessor: 'd', pin: 'right', width: 140 },
];

export default function ManagedColumnsGrid() {
  return <DataGrid data={rows} columns={columns} height={300} />;
}
```

- [ ] **Step 2: Write `column-management.mdx`**

```mdx
---
title: Column management
description: Resize, drag-to-reorder, pin, and virtualize columns.
sidebar:
  order: 3
---

import ManagedColumnsGrid from '../../../components/examples/columns/ManagedColumnsGrid.tsx';

Strata supports per-column resize, drag-to-reorder, left/right pinning, and
column virtualization. All four are built in — no plugins required.

## Pinning

Set `pin: 'left'` or `pin: 'right'` on a column definition to pin it. Pinned
columns stick during horizontal scroll.

```tsx
const columns: ColumnDef<Row>[] = [
  { id: 'a', header: 'A', accessor: 'a', pin: 'left' },
  { id: 'b', header: 'B', accessor: 'b' },
  { id: 'd', header: 'D', accessor: 'd', pin: 'right' },
];
```

## Resize & reorder

Resize: drag the column edge.
Reorder: drag the column header.

State can be controlled via the `GridApi` or persisted with the `useViewState`
hook.

## Column virtualization

Strata virtualizes columns as well as rows. Off-screen columns do not render
DOM, keeping wide grids snappy.

<ManagedColumnsGrid client:load />
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/columns/ docs-site/src/content/docs/guides/column-management.mdx
git commit -m "docs(m8): guide — column management"
```

---

### Task 7: Guide — Row selection

**Files:**
- Create: `docs-site/src/components/examples/selection/SelectableTree.tsx`
- Create: `docs-site/src/content/docs/guides/row-selection.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/selection/SelectableTree.tsx`:

```tsx
import { useState } from 'react';
import { DataGrid, type ColumnDef, type SelectionState } from 'strata-grid';
import 'strata-grid/styles.css';

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const data: Node[] = [
  {
    id: '1', label: 'Group A',
    children: [
      { id: '1.1', label: 'Item A1' },
      { id: '1.2', label: 'Item A2' },
    ],
  },
  {
    id: '2', label: 'Group B',
    children: [{ id: '2.1', label: 'Item B1' }],
  },
];

const columns: ColumnDef<Node>[] = [
  { id: 'label', header: 'Label', accessor: 'label', isTreeColumn: true },
];

export default function SelectableTree() {
  const [selection, setSelection] = useState<SelectionState>({});
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={280}
      treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
      defaultExpanded
      selection={{ mode: 'multi', cascade: true }}
      selectionState={selection}
      onSelectionChange={setSelection}
    />
  );
}
```

- [ ] **Step 2: Write `row-selection.mdx`**

```mdx
---
title: Row selection
description: Single and multi-select with tri-state cascade in tree mode.
sidebar:
  order: 4
---

import SelectableTree from '../../../components/examples/selection/SelectableTree.tsx';

Pass a `selection` config to enable checkbox selection. In tree mode, set
`cascade: true` for tri-state behavior — selecting a parent selects all
descendants; partial selection shows an indeterminate checkbox.

```tsx
<DataGrid
  // ...
  selection={{ mode: 'multi', cascade: true }}
  selectionState={selection}
  onSelectionChange={setSelection}
/>
```

<SelectableTree client:load />
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/selection/ docs-site/src/content/docs/guides/row-selection.mdx
git commit -m "docs(m8): guide — row selection"
```

---

### Task 8: Guide — Editing

**Files:**
- Create: `docs-site/src/components/examples/editing/EditableGrid.tsx`
- Create: `docs-site/src/content/docs/guides/editing.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/editing/EditableGrid.tsx`:

```tsx
import { useState } from 'react';
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Task {
  id: string;
  title: string;
  hours: number;
  done: boolean;
}

const initial: Task[] = [
  { id: '1', title: 'Write spec', hours: 2, done: true },
  { id: '2', title: 'Write plan', hours: 1.5, done: false },
  { id: '3', title: 'Implement', hours: 6, done: false },
];

export default function EditableGrid() {
  const [rows, setRows] = useState(initial);

  const columns: ColumnDef<Task>[] = [
    { id: 'title', header: 'Title', accessor: 'title', editable: { type: 'text' } },
    { id: 'hours', header: 'Hours', accessor: 'hours', editable: { type: 'number' } },
    { id: 'done', header: 'Done', accessor: 'done', editable: { type: 'checkbox' } },
  ];

  return (
    <DataGrid
      data={rows}
      columns={columns}
      height={260}
      onCellEditEnd={(e) => {
        setRows((prev) =>
          prev.map((r) => (r.id === e.rowId ? { ...r, [e.columnId]: e.newValue } : r)),
        );
      }}
    />
  );
}
```

- [ ] **Step 2: Write `editing.mdx`**

```mdx
---
title: Editing
description: Built-in editors, custom editors, validation, and row-edit workflow.
sidebar:
  order: 5
---

import EditableGrid from '../../../components/examples/editing/EditableGrid.tsx';

Strata supports in-cell editing with built-in `text`, `number`, `date`,
`checkbox`, and `select` editors, plus a `custom` editor escape hatch.

## Enabling an editor

Add `editable` to a column definition:

```tsx
{ id: 'title', header: 'Title', accessor: 'title', editable: { type: 'text' } }
```

## Committing changes

Strata's editing is **uncontrolled by default** — the grid manages the in-edit
state and emits an `onCellEditEnd` event with `{ rowId, columnId, oldValue,
newValue }` when the user commits. Update your data in the handler.

## Validation

Pass a `validate` function in `editable` to reject invalid input:

```tsx
{
  id: 'hours',
  header: 'Hours',
  accessor: 'hours',
  editable: {
    type: 'number',
    validate: (v) => (v >= 0 ? { valid: true } : { valid: false, message: 'Non-negative only' }),
  },
}
```

## Row-edit workflow

For multi-cell edits with a Save/Cancel action, set the grid's edit mode to
`'row'` and use the `onRowEditEnd` event.

<EditableGrid client:load />
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/editing/ docs-site/src/content/docs/guides/editing.mdx
git commit -m "docs(m8): guide — editing"
```

---

### Task 9: Guide — Aggregation

**Files:**
- Create: `docs-site/src/components/examples/aggregation/AggregatedTree.tsx`
- Create: `docs-site/src/content/docs/guides/aggregation.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/aggregation/AggregatedTree.tsx`:

```tsx
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Part {
  id: string;
  partNumber: string;
  qty: number;
  cost: number;
  children?: Part[];
}

const data: Part[] = [
  {
    id: '1', partNumber: 'A-100', qty: 1, cost: 0,
    children: [
      { id: '1.1', partNumber: 'B-201', qty: 2, cost: 5 },
      { id: '1.2', partNumber: 'B-202', qty: 3, cost: 7 },
    ],
  },
];

const columns: ColumnDef<Part>[] = [
  { id: 'partNumber', header: 'Part #', accessor: 'partNumber', isTreeColumn: true },
  { id: 'qty', header: 'Qty', accessor: 'qty', aggregate: 'sum' },
  { id: 'cost', header: 'Cost', accessor: 'cost', aggregate: 'sum' },
];

export default function AggregatedTree() {
  return (
    <DataGrid
      data={data}
      columns={columns}
      height={240}
      treeData={{ getRowId: (r) => r.id, getChildren: (r) => r.children }}
      defaultExpanded
    />
  );
}
```

- [ ] **Step 2: Write `aggregation.mdx`**

```mdx
---
title: Aggregation
description: Group-row aggregates, footer totals, and BOM extended-quantity rollups.
sidebar:
  order: 6
---

import AggregatedTree from '../../../components/examples/aggregation/AggregatedTree.tsx';

Strata aggregates child values onto parent rows automatically when you set the
`aggregate` field on a column.

| `aggregate` value | Result on the parent row                |
|-------------------|-----------------------------------------|
| `'sum'`           | Sum of descendant values.               |
| `'avg'`           | Mean of descendant values.              |
| `'min'` / `'max'` | Min / max of descendant values.         |
| `'count'`         | Count of descendant rows.               |
| `'extended'`      | BOM extended-quantity rollup (qty × parent multiplier). |

```tsx
{ id: 'qty', header: 'Qty', accessor: 'qty', aggregate: 'sum' }
```

The grid also supports a footer totals row driven by the same `aggregate`
field.

<AggregatedTree client:load />
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/aggregation/ docs-site/src/content/docs/guides/aggregation.mdx
git commit -m "docs(m8): guide — aggregation"
```

---

### Task 10: Guide — Hierarchy editor

**Files:**
- Create: `docs-site/src/components/examples/hierarchy/HierarchyEditorDemo.tsx`
- Create: `docs-site/src/content/docs/guides/hierarchy-editor.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/hierarchy/HierarchyEditorDemo.tsx`:

```tsx
import { DataGrid, useTreeEditor, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Node {
  id: string;
  parentId: string | null;
  label: string;
}

const seed: Node[] = [
  { id: '1', parentId: null, label: 'Root' },
  { id: '1.1', parentId: '1', label: 'Child A' },
  { id: '1.2', parentId: '1', label: 'Child B' },
];

export default function HierarchyEditorDemo() {
  const editor = useTreeEditor<Node>({
    initial: seed,
    getRowId: (r) => r.id,
    getParentId: (r) => r.parentId,
  });

  const columns: ColumnDef<Node>[] = [
    { id: 'label', header: 'Label', accessor: 'label', isTreeColumn: true, editable: { type: 'text' } },
  ];

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => editor.undo()} disabled={!editor.canUndo}>Undo</button>
        <button onClick={() => editor.redo()} disabled={!editor.canRedo}>Redo</button>
      </div>
      <DataGrid
        data={editor.rows}
        columns={columns}
        height={260}
        treeData={{ getRowId: (r) => r.id, getParentId: (r) => r.parentId }}
        defaultExpanded
        onCellEditEnd={(e) => editor.dispatch({ type: 'editCell', rowId: e.rowId, columnId: e.columnId, value: e.newValue })}
      />
    </div>
  );
}
```

Note: the exact `editor.dispatch` payload shape should match what
`useTreeEditor` actually exposes; refer to its TSDoc / generated API reference
when wiring this up. Adjust the `dispatch` signature in the snippet if it
differs.

- [ ] **Step 2: Write `hierarchy-editor.mdx`**

```mdx
---
title: Hierarchy editor
description: Command-driven add/delete/move/reorder with history, clipboard, and drag/drop.
sidebar:
  order: 7
---

import HierarchyEditorDemo from '../../../components/examples/hierarchy/HierarchyEditorDemo.tsx';

The `useTreeEditor` hook turns a tree grid into a fully-editable hierarchy:
add, delete, move, reorder, indent/outdent, clipboard, drag/drop, and
multi-level undo/redo.

## Commands

Every mutation is a **command** that the editor dispatches through a history
stack. Built-in commands include `AddNodeCommand`, `DeleteNodeCommand`,
`MoveNodeCommand`, `ReorderNodeCommand`, `IndentNodeCommand`,
`OutdentNodeCommand`, `InsertSubtreeCommand`, and `BatchCommand` for grouping
mutations into a single undo unit.

## History

`useHistoryManager` (used internally by `useTreeEditor`) provides `undo`,
`redo`, `canUndo`, `canRedo`.

## Change tracking

`useChangeTracker` records dirty / added / deleted rows for diff-based saves.

## Validators

Pass a `MoveValidator` to reject moves (e.g., cycle prevention beyond the
built-in check, or a domain rule like "an assembly cannot contain itself").

<HierarchyEditorDemo client:load />
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/hierarchy/ docs-site/src/content/docs/guides/hierarchy-editor.mdx
git commit -m "docs(m8): guide — hierarchy editor"
```

---

### Task 11: Guide — Data sources

**Files:**
- Create: `docs-site/src/components/examples/data-sources/InMemoryExample.tsx`
- Create: `docs-site/src/content/docs/guides/data-sources.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/data-sources/InMemoryExample.tsx`:

```tsx
import { DataGrid, InMemoryDataSource, useDataSource, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';
import { useMemo } from 'react';

interface Row {
  id: string;
  name: string;
  qty: number;
}

const seed: Row[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i),
  name: `Item ${i}`,
  qty: (i % 7) + 1,
}));

export default function InMemoryExample() {
  const source = useMemo(() => new InMemoryDataSource<Row>({ rows: seed, getRowId: (r) => r.id }), []);
  const ds = useDataSource(source);

  const columns: ColumnDef<Row>[] = [
    { id: 'name', header: 'Name', accessor: 'name', filter: 'text' },
    { id: 'qty', header: 'Qty', accessor: 'qty', filter: 'number' },
  ];

  return <DataGrid data={ds.rows} columns={columns} height={260} />;
}
```

- [ ] **Step 2: Write `data-sources.mdx`**

```mdx
---
title: Data sources
description: Pluggable DataSource seam, in-memory implementation, server-scale helpers.
sidebar:
  order: 8
---

import InMemoryExample from '../../../components/examples/data-sources/InMemoryExample.tsx';

A `DataSource` is the seam between the grid and your data. The built-in
`InMemoryDataSource` covers the common case; for server-backed data, implement
the interface or use one of the included adapters.

## In-memory

```tsx
import { InMemoryDataSource, useDataSource } from 'strata-grid';

const source = new InMemoryDataSource({ rows: seed, getRowId: (r) => r.id });
const ds = useDataSource(source);
<DataGrid data={ds.rows} columns={columns} />;
```

<InMemoryExample client:load />

## Server-scale helpers

| Hook                 | Purpose                                           |
|----------------------|---------------------------------------------------|
| `useServerDataSource`| Fetch pages of rows over the network.             |
| `useLazyTree`        | Lazy-load tree children on first expand.          |
| `usePagination`      | Page state + `PaginationBar` wiring.              |
| `useLiveUpdates`     | Apply incremental change events (add/update/del). |
| `useWhereUsed`       | Walk parent chains for "where is X used?" lookups.|
| `useQuickSearch`     | Debounced search input + filter expression.       |
| `useFilterBuilder`   | UI for composing nested filter expressions.       |

## OData adapter

```tsx
import { ODataDataSource } from 'strata-grid';

const source = new ODataDataSource({
  url: 'https://services.odata.org/V4/Northwind/Northwind.svc/Customers',
});
```

See the [API reference](/strata-grid/api/) for the full interface.
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/data-sources/ docs-site/src/content/docs/guides/data-sources.mdx
git commit -m "docs(m8): guide — data sources"
```

---

### Task 12: Guide — Export

**Files:**
- Create: `docs-site/src/components/examples/export/ExportExample.tsx`
- Create: `docs-site/src/content/docs/guides/export.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/export/ExportExample.tsx`:

```tsx
import { DataGrid, ExportMenu, useExport, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Row { id: string; name: string; qty: number; }

const rows: Row[] = [
  { id: '1', name: 'Alpha', qty: 1 },
  { id: '2', name: 'Bravo', qty: 2 },
  { id: '3', name: 'Charlie', qty: 3 },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

export default function ExportExample() {
  const exportApi = useExport({ rows, columns, filename: 'rows' });
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <ExportMenu exportApi={exportApi} />
      <DataGrid data={rows} columns={columns} height={200} />
    </div>
  );
}
```

- [ ] **Step 2: Write `export.mdx`**

```mdx
---
title: Export
description: CSV and XLSX writers plus a React hook.
sidebar:
  order: 9
---

import ExportExample from '../../../components/examples/export/ExportExample.tsx';

Strata ships CSV and XLSX writers plus a `useExport` hook and an `<ExportMenu>`
component that wires them up.

```tsx
import { useExport, ExportMenu } from 'strata-grid';

const exportApi = useExport({ rows, columns, filename: 'orders' });
<ExportMenu exportApi={exportApi} />;
```

Direct use of the writers is also supported:

```tsx
import { CsvWriter, XlsxWriter } from 'strata-grid';

const csv = new CsvWriter({ delimiter: ',' }).write(rows, columns);
const blob = await new XlsxWriter().write(rows, columns);
```

<ExportExample client:load />
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/export/ docs-site/src/content/docs/guides/export.mdx
git commit -m "docs(m8): guide — export"
```

---

### Task 13: Guide — Theming

**Files:**
- Create: `docs-site/src/components/examples/theming/ThemedGrid.tsx`
- Create: `docs-site/src/content/docs/guides/theming.mdx`

- [ ] **Step 1: Create example**

`docs-site/src/components/examples/theming/ThemedGrid.tsx`:

```tsx
import { useState, useMemo, useEffect } from 'react';
import { DataGrid, createTheme, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';
import 'strata-grid/theme/tokens.css';
import 'strata-grid/theme/dark.css';

interface Row { id: string; name: string; qty: number; }

const rows: Row[] = [
  { id: '1', name: 'Alpha', qty: 1 },
  { id: '2', name: 'Bravo', qty: 2 },
];

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'qty', header: 'Qty', accessor: 'qty' },
];

export default function ThemedGrid() {
  const [base, setBase] = useState<'light' | 'dark'>('light');
  const composed = useMemo(
    () => createTheme(base, { tokens: { 'strata-accent': '#7c3aed' } }),
    [base],
  );
  useEffect(() => () => composed.dispose(), [composed]);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button onClick={() => setBase((b) => (b === 'light' ? 'dark' : 'light'))}>
        Toggle base theme ({base})
      </button>
      <DataGrid data={rows} columns={columns} height={200} theme={composed.className} />
    </div>
  );
}
```

- [ ] **Step 2: Write `theming.mdx`**

```mdx
---
title: Theming
description: CSS-custom-property tokens, dark mode, density, high-contrast, print.
sidebar:
  order: 10
---

import ThemedGrid from '../../../components/examples/theming/ThemedGrid.tsx';

Strata is styled with CSS custom properties. Override the `--strata-*` tokens
in your own CSS to match your design system, or compose a branded theme at
runtime with `createTheme`.

## Token-based theming

```css
.my-app {
  --strata-accent: #7c3aed;
  --strata-row-hover-bg: #f3e8ff;
}
```

## Built-in themes

Optional CSS files for the standard token set and dark mode:

```tsx
import 'strata-grid/theme/tokens.css';
import 'strata-grid/theme/dark.css';
```

## Runtime composition

```tsx
import { createTheme } from 'strata-grid';

const theme = createTheme('dark', { tokens: { 'strata-accent': '#7c3aed' } });
<DataGrid theme={theme.className} />;
// when unmounting:
theme.dispose();
```

## Density, high-contrast, print

- `density` prop: `'compact' | 'comfortable' | 'spacious'`.
- High-contrast tokens are exposed for system `prefers-contrast: more`.
- `usePrintMode()` swaps the grid into a printable layout that escapes virtualization.

<ThemedGrid client:load />
```

- [ ] **Step 3: Build & commit**

Run: `npm run build -w @strata-grid/docs-site`

```bash
git add docs-site/src/components/examples/theming/ docs-site/src/content/docs/guides/theming.mdx
git commit -m "docs(m8): guide — theming"
```

---

### Task 14: Contributing — Project overview page

**Files:**
- Create: `docs-site/src/content/docs/contributing/overview.mdx`

- [ ] **Step 1: Write `overview.mdx`**

```mdx
---
title: Project overview
description: Architecture and directory map for strata-grid.
sidebar:
  order: 1
---

Strata is a single React component (`<DataGrid>`) built on top of TanStack
Table's tree-aware row model. The library is structured so each feature owns
its own subdirectory under `src/` and re-exports through `src/index.ts`.

## Directory map

| Directory          | Purpose                                                      |
|--------------------|--------------------------------------------------------------|
| `src/components/`  | React components: `DataGrid`, panels, dialogs, overlays.     |
| `src/model/`       | Type definitions, column math, view-state, grid API.         |
| `src/data/`        | `DataSource` seam, in-memory source, pagination, live updates.|
| `src/filter/`      | Filter expression evaluation, quick search, builder.         |
| `src/tree-editor/` | Hierarchy editor: commands, history, clipboard, drag/drop.   |
| `src/virtual/`     | Row and column virtualization, print mode.                   |
| `src/export/`      | CSV/XLSX writers, `useExport` hook.                          |
| `src/icons/`       | Icon set + `StrataIcon` wrapper.                             |
| `src/theme/`       | Base stylesheet, token CSS, dark theme.                      |
| `src/themes/`      | Runtime theme composition (`createTheme`).                   |
| `src/adapters/`    | External adapters (OData).                                   |

## Public API

The public surface is exactly what's re-exported from `src/index.ts`. Anything
not listed there is considered internal and may change without notice.

## Stack

- React 19, TypeScript (strict).
- TanStack Table for the row model; TanStack Virtual for virtualization.
- `tsup` for the library bundle (ESM + CJS + type definitions).
- Vitest for tests, `jsdom` for component tests, `fast-check` for properties.
- Astro Starlight for these docs.
```

- [ ] **Step 2: Commit**

```bash
git add docs-site/src/content/docs/contributing/overview.mdx
git commit -m "docs(m8): contributing — project overview"
```

---

### Task 15: Contributing — Development setup page

**Files:**
- Create: `docs-site/src/content/docs/contributing/development.mdx`

- [ ] **Step 1: Write `development.mdx`**

```mdx
---
title: Development setup
description: Clone, install, and run the library + docs site.
sidebar:
  order: 2
---

## Clone and install

```bash
git clone https://github.com/vadiraja/strata-grid.git
cd strata-grid
npm install
```

The repo is an npm workspace. The library lives at the root; the docs site
lives in `docs-site/`.

## Library scripts

| Command              | What it does                                       |
|----------------------|----------------------------------------------------|
| `npm run dev`        | Start the Vite playground (`playground/`).         |
| `npm test`           | Run the Vitest suite once.                         |
| `npm run test:watch` | Run tests in watch mode.                           |
| `npm run typecheck`  | Type-check with `tsc --noEmit`.                    |
| `npm run build`      | Build the library bundle with `tsup`.              |
| `npm run docs:api`   | Regenerate the API reference under `docs-site/`.   |

## Docs site

```bash
npm run dev -w @strata-grid/docs-site     # http://localhost:4321/strata-grid/
npm run build -w @strata-grid/docs-site
```

The docs site automatically regenerates the API reference (`docs:api`) before
`dev` and `build`.
```

- [ ] **Step 2: Commit**

```bash
git add docs-site/src/content/docs/contributing/development.mdx
git commit -m "docs(m8): contributing — development setup"
```

---

### Task 16: Contributing — Workflow page

**Files:**
- Create: `docs-site/src/content/docs/contributing/workflow.mdx`

- [ ] **Step 1: Write `workflow.mdx`**

```mdx
---
title: Spec → plan → TDD workflow
description: How features land in Strata, from idea to merge.
sidebar:
  order: 3
---

Strata uses a deliberate, document-first workflow. Every non-trivial change
goes through four stages.

## 1. Brainstorm

Talk through goals, constraints, scope. The output is a shared understanding
of *what* and *why*.

## 2. Spec

Write a design doc to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.
The spec describes architecture, components, data flow, error handling, testing
strategy, and acceptance criteria. The spec is reviewed before any code is
written.

## 3. Plan

Decompose the spec into an implementation plan at
`docs/superpowers/plans/YYYY-MM-DD-<topic>-plan-N.md`. Each plan is a sequence
of small tasks; each task has files, code, and a test step. Big specs may have
multiple sequential plans.

## 4. TDD implementation

For each task: write the failing test first, run it to confirm it fails,
implement the minimum to make it pass, commit. Frequent commits, small steps.

## Branches

Use `mN-<feature-slug>` (e.g., `m8-docs-site`). Open a PR against `master`
once all plan tasks are complete.

## Reviewing your own work

Before requesting review, run the full check locally:

```bash
npm run typecheck
npm test
npm run build
npm run build -w @strata-grid/docs-site
```
```

- [ ] **Step 2: Commit**

```bash
git add docs-site/src/content/docs/contributing/workflow.mdx
git commit -m "docs(m8): contributing — spec/plan/TDD workflow"
```

---

### Task 17: Contributing — PR conventions page

**Files:**
- Create: `docs-site/src/content/docs/contributing/pr-conventions.mdx`

- [ ] **Step 1: Write `pr-conventions.mdx`**

```mdx
---
title: PR conventions
description: Branch naming, commit style, required checks.
sidebar:
  order: 4
---

## Branch naming

`mN-<feature-slug>` — e.g., `m8-docs-site`, `m6-plugin-loader`.

## Commit style

- Imperative subject line, scoped (`feat(m8): add docs site scaffold`).
- Wrap the body at 72 characters.
- Group related changes per commit; avoid mega-commits.
- **No AI attribution** in commit messages.

## Required checks

A PR must pass:

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run build -w @strata-grid/docs-site`
- `npm pack --dry-run` (validates the library tarball)
- `publint` (validates `package.json` `exports`)
- `@arethetypeswrong/cli` (validates types resolution)

## Code review

Open the PR with a short summary and a test plan. Address reviewer comments by
pushing new commits; squash-merge is the default.
```

- [ ] **Step 2: Commit**

```bash
git add docs-site/src/content/docs/contributing/pr-conventions.mdx
git commit -m "docs(m8): contributing — PR conventions"
```

---

### Task 18: Top-level `CONTRIBUTING.md`

GitHub's PR UI auto-discovers `CONTRIBUTING.md` at the repo root. We put a thin
pointer there that links into the docs site.

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write `CONTRIBUTING.md`**

```markdown
# Contributing to Strata

Thanks for your interest in contributing.

The full contributing guide lives in the docs site:

- [Project overview](https://vadiraja.github.io/strata-grid/contributing/overview/)
- [Development setup](https://vadiraja.github.io/strata-grid/contributing/development/)
- [Spec → plan → TDD workflow](https://vadiraja.github.io/strata-grid/contributing/workflow/)
- [PR conventions](https://vadiraja.github.io/strata-grid/contributing/pr-conventions/)

## TL;DR

```bash
git clone https://github.com/vadiraja/strata-grid.git
cd strata-grid
npm install
npm test
```

Open issues to discuss substantial changes before opening a PR. PR titles use
the `scope(mN): subject` convention; commits do not include AI attribution.
```

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs(m8): add top-level CONTRIBUTING.md"
```

---

### Task 19: Update root `README.md` with doc & contributing links

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a Documentation section before the Roadmap section**

In `README.md`, immediately before the existing `## Roadmap` section, insert:

```markdown
## Documentation

Full documentation lives at <https://vadiraja.github.io/strata-grid/>:

- [Getting started](https://vadiraja.github.io/strata-grid/getting-started/introduction/)
- [Guides](https://vadiraja.github.io/strata-grid/guides/tree-data/) — one page per shipped capability
- [API reference](https://vadiraja.github.io/strata-grid/api/) — auto-generated from TSDoc

```

- [ ] **Step 2: Update the existing Contributing section**

Replace the existing `## Contributing` paragraph with:

```markdown
## Contributing

Contributions are welcome. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) and the
[contributing guide in the docs](https://vadiraja.github.io/strata-grid/contributing/overview/).
The project follows a spec → plan → test-first cycle; design specs live in
`docs/superpowers/specs/` and implementation plans in `docs/superpowers/plans/`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs(m8): link README to docs site and CONTRIBUTING.md"
```

---

## Acceptance

- All four sidebar sections (Getting started, Guides, API reference,
  Contributing) are populated and navigable in the built site.
- Every guide page has at least one live `<DataGrid>` example rendered as a
  React island.
- `CONTRIBUTING.md` exists at repo root and is linked from `README.md`.
- `README.md` has a Documentation section pointing at the GH Pages URL.
- `npm run build -w @strata-grid/docs-site` succeeds with all pages.
