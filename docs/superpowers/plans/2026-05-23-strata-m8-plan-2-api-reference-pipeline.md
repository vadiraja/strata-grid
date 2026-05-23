# Strata — M8 · Plan 2: API reference pipeline (TypeDoc)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-generate the API reference for the public surface (`src/index.ts`) from TSDoc into Markdown that Starlight renders, plus a small frontmatter shim and a TSDoc audit pass.

**Architecture:** TypeDoc walks `src/index.ts`, `typedoc-plugin-markdown` emits one `.md` per exported symbol into `docs-site/src/content/docs/api/`. A small Node post-processor adds Starlight frontmatter. A `predev`/`prebuild` script in `docs-site` runs the generator so the API ref is always fresh. The directory is gitignored.

**Tech Stack:** TypeDoc 0.27.x, `typedoc-plugin-markdown` 4.x, Node ESM script.

**Date:** 2026-05-23
**Depends on:** M8 Plan 1.

---

### Task 1: Install TypeDoc & plugin

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Install dev dependencies at the repo root**

Run:
```bash
npm install -D -W typedoc@^0.27.0 typedoc-plugin-markdown@^4.4.0
```
(`-W` installs to the root workspace.)
Expected: both packages appear under `devDependencies` in root `package.json`.

- [ ] **Step 2: Commit dependency change**

```bash
git add package.json package-lock.json
git commit -m "build(m8): add typedoc + typedoc-plugin-markdown dev deps"
```

---

### Task 2: Configure TypeDoc to emit Markdown into the docs-site content collection

**Files:**
- Create: `typedoc.json` (root)

- [ ] **Step 1: Create `typedoc.json`**

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "tsconfig": "tsconfig.json",
  "out": "docs-site/src/content/docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "githubPages": false,
  "hideGenerator": true,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "outputFileStrategy": "modules",
  "entryFileName": "index",
  "fileExtension": ".md",
  "hidePageHeader": true,
  "hideBreadcrumbs": true
}
```

- [ ] **Step 2: Run TypeDoc once to verify it walks the source without errors**

Run: `npx typedoc`
Expected: writes Markdown files under `docs-site/src/content/docs/api/`. There will be TSDoc warnings — that's expected and will be addressed in Task 5.

- [ ] **Step 3: Inspect generated output**

Run: `ls docs-site/src/content/docs/api/`
Expected: an `index.md` and one or more files/subdirectories covering symbols re-exported from `src/index.ts` (e.g., `DataGrid`, `ColumnDef`, `InMemoryDataSource`).

- [ ] **Step 4: Commit the config (NOT the generated output, which is gitignored)**

```bash
git add typedoc.json
git commit -m "build(m8): configure typedoc to emit markdown into docs-site"
```

---

### Task 3: Write the frontmatter post-processor

TypeDoc Markdown output has no frontmatter; Starlight requires at minimum a `title`. We write a tiny script that walks the generated `api/` directory and prepends frontmatter using the first H1 line as the title.

**Files:**
- Create: `scripts/add-starlight-frontmatter.mjs`
- Create: `scripts/add-starlight-frontmatter.test.mjs`

- [ ] **Step 1: Write the failing test first**

`scripts/add-starlight-frontmatter.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractTitle, withFrontmatter } from './add-starlight-frontmatter.mjs';

test('extractTitle pulls the first H1', () => {
  const md = '# DataGrid\n\nA tree-aware grid component.\n';
  assert.equal(extractTitle(md), 'DataGrid');
});

test('extractTitle returns null when no H1', () => {
  assert.equal(extractTitle('No heading here\n'), null);
});

test('withFrontmatter prepends frontmatter and strips the H1', () => {
  const md = '# DataGrid\n\nBody text.\n';
  const out = withFrontmatter(md, 'DataGrid');
  assert.ok(out.startsWith('---\ntitle: "DataGrid"\n'));
  assert.ok(!out.includes('# DataGrid'));
  assert.ok(out.includes('Body text.'));
});

test('withFrontmatter escapes double quotes in titles', () => {
  const out = withFrontmatter('# Foo "bar"\n', 'Foo "bar"');
  assert.ok(out.includes('title: "Foo \\"bar\\""'));
});

test('withFrontmatter is idempotent when frontmatter already present', () => {
  const md = '---\ntitle: "Existing"\n---\n\n# Body\n';
  assert.equal(withFrontmatter(md, 'Anything'), md);
});
```

- [ ] **Step 2: Run the test to verify it fails (module not yet implemented)**

Run: `node --test scripts/add-starlight-frontmatter.test.mjs`
Expected: FAIL — module cannot be imported.

- [ ] **Step 3: Implement the script**

`scripts/add-starlight-frontmatter.mjs`:

```js
#!/usr/bin/env node
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API_DIR = 'docs-site/src/content/docs/api';

export function extractTitle(markdown) {
  const m = markdown.match(/^#\s+(.+?)\s*$/m);
  return m ? m[1] : null;
}

export function withFrontmatter(markdown, title) {
  if (markdown.startsWith('---\n')) return markdown;
  const escaped = title.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const stripped = markdown.replace(/^#\s+.+?\s*$\n?/m, '');
  return `---\ntitle: "${escaped}"\n---\n\n${stripped.trimStart()}`;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.name.endsWith('.md')) {
      const raw = await readFile(full, 'utf8');
      const title = extractTitle(raw) ?? entry.name.replace(/\.md$/, '');
      const next = withFrontmatter(raw, title);
      if (next !== raw) await writeFile(full, next, 'utf8');
    }
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}` ||
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  try {
    await stat(API_DIR);
  } catch {
    console.error(`Directory ${API_DIR} not found — run typedoc first.`);
    process.exit(1);
  }
  await walk(API_DIR);
  console.log(`Added Starlight frontmatter under ${API_DIR}`);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test scripts/add-starlight-frontmatter.test.mjs`
Expected: 5 tests pass.

- [ ] **Step 5: Run the script end-to-end against the previously generated output**

Run: `node scripts/add-starlight-frontmatter.mjs`
Expected: prints `Added Starlight frontmatter under docs-site/src/content/docs/api`.

- [ ] **Step 6: Spot-check one file**

Run: `head -5 docs-site/src/content/docs/api/index.md`
Expected: starts with `---\ntitle: "..."\n---`.

- [ ] **Step 7: Commit**

```bash
git add scripts/add-starlight-frontmatter.mjs scripts/add-starlight-frontmatter.test.mjs
git commit -m "build(m8): add starlight frontmatter post-processor for typedoc output"
```

---

### Task 4: Wire generation into the docs-site build & dev scripts

**Files:**
- Modify: `package.json` (root) — add a top-level `docs:api` script
- Modify: `docs-site/package.json` — add `predev` and `prebuild`

- [ ] **Step 1: Add `docs:api` script to root `package.json`**

In the `"scripts"` object, after `"test:watch"`:

```json
    "docs:api": "typedoc && node scripts/add-starlight-frontmatter.mjs"
```

- [ ] **Step 2: Add `predev` and `prebuild` to `docs-site/package.json`**

In `docs-site/package.json` `"scripts"`, add (and keep existing):

```json
    "predev": "npm run docs:api -w ..",
    "prebuild": "npm run docs:api -w ..",
```

Note: `-w ..` runs the script in the parent workspace (root). If that flag form
doesn't work on the installed npm version, use `npm --prefix .. run docs:api`
instead.

- [ ] **Step 3: Verify the build pipeline**

Run: `rm -rf docs-site/src/content/docs/api`
Then: `npm run build -w @strata-grid/docs-site`
Expected: typedoc runs first, post-processor adds frontmatter, Astro builds successfully. `docs-site/dist/api/index.html` exists.

- [ ] **Step 4: Commit**

```bash
git add package.json docs-site/package.json package-lock.json
git commit -m "build(m8): regenerate api reference on docs-site dev/build"
```

---

### Task 5: TSDoc audit pass on public surface

The first TypeDoc run will have surfaced warnings about missing or weak comments on exported symbols. This task adds/improves TSDoc on the public surface only — items re-exported from `src/index.ts`.

**Files:**
- Modify: Various files under `src/` that own exports listed in `src/index.ts`

- [ ] **Step 1: Capture the baseline warning list**

Run: `npx typedoc 2>&1 | grep -E '(warning|error)' > /tmp/typedoc-warnings.txt || true`
Expected: a file listing all current warnings.

- [ ] **Step 2: For each exported symbol with a warning, add a TSDoc comment**

Walk `src/index.ts` top-to-bottom. For every export, ensure the underlying
declaration has a TSDoc block:

```ts
/**
 * One-line summary of what this symbol does.
 *
 * Optional second paragraph with details, edge cases, or examples.
 *
 * @example
 * ```tsx
 * <DataGrid data={rows} columns={cols} />
 * ```
 */
```

Coverage target — every symbol in this list must have at least a one-line TSDoc summary:

From `src/index.ts`:
- Component: `DataGrid` and `DataGridProps`
- Core types: `ColumnDef`, `ColumnGroup`, `AnyColumn`, `CellContext`, `TreeDataConfig`, `SortDirection`, `ColumnSort`, `SortingState`, `FilterType`, `ColumnOrderState`, `ColumnPinningState`, `ColumnSizingState`, `SelectionConfig`, `SelectionState`, `GridTheme`, `Density`, `AggregationConfig`, `ExtendedQuantityConfig`, `AdvancedFilterConfig`, `ExportConfig`, `ColumnManagementConfig`, `EditableConfig`, `EditorContext`, `EditorType`, `ValidationState`, `Validator`, `ValidationResult`, `CellEditEvent`, `CellEditEndEvent`, `RowEditEvent`, `RowEditEndEvent`, `AggregateType`
- Functions: `isColumnGroup`, `computeFlexWidths`
- Data source: `InMemoryDataSource`, `DataSource`, `GridApi`
- Tree editor (M3): `useTreeEditor`, `useHistoryManager`, `useChangeTracker`, `useClipboard`, `useDragDrop`, `buildTreeState`, `cloneSubtree`, `calculateDropPosition`, all `*Command` classes, `MoveRejectedError`, `isDescendant`, `validateCycleAndSelf`, plus the corresponding type exports
- Data (M4): `useDataSource`, `useServerDataSource`, `useLazyTree`, `usePagination`, `useLiveUpdates`, `useWhereUsed`, `reconcileChanges`, `buildDataQuery`, `findWhereUsed`, plus type exports
- Filter (M4): `evaluateFilter`, `useFilterBuilder`, `useQuickSearch`, plus type exports
- Export (M4): `CsvWriter`, `XlsxWriter`, `useExport`, plus type exports
- Column management (M4): `useColumnManagement`, `useViewState`, plus type exports
- UI (M4): `PaginationBar`, `ExportMenu`, `QuickSearchInput`, `FilterBuilderPanel`, `ColumnManagementPanel`, `WhereUsedDialog`, `LoadingOverlay`, `LoadingRow` and their props
- OData (M4): `ODataDataSource`, `ODataQueryBuilder`, `ODataDataSourceConfig`, `ODataAuth`, `ODataCollectionResponse`, `ODataErrorResponse`
- M5: `StrataIcon`, `StrataIconName`, `StrataIconProps`, `IconOverrides`, `createTheme`, `ThemeOverrides`, `ComposedTheme`, `usePrintMode`

Where a TSDoc block already exists and reads clearly, leave it. Only add or improve.

- [ ] **Step 3: Re-run TypeDoc and confirm clean warnings**

Run: `npx typedoc 2>&1 | grep -E '(warning|error)' | tee /tmp/typedoc-warnings-after.txt`
Expected: zero or only acceptable warnings (e.g., third-party type references). Diff `/tmp/typedoc-warnings.txt` vs `/tmp/typedoc-warnings-after.txt` to confirm reduction.

- [ ] **Step 4: Verify library tests still pass**

Run: `npm test`
Expected: all tests pass — no behavior changed, only comments.

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 5: Commit (one commit per `src/` subdirectory if helpful for review)**

Example commit (collect related TSDoc additions):

```bash
git add src/
git commit -m "docs(m8): add TSDoc on public API surface for typedoc generation"
```

---

### Task 6: Hand-written API landing page

The auto-generated `index.md` is bare; replace it with a curated landing that
groups symbols. Because the directory is regenerated, the landing must come
from a different location and override TypeDoc's index.

**Files:**
- Modify: `typedoc.json` — exclude root index
- Create: `docs-site/src/content/docs/api/overview.mdx` (hand-written, NOT under regen directory? — but Starlight needs it in `api/`).

Approach: keep TypeDoc's `index.md` but configure the post-processor to skip files that already start with frontmatter. Then commit a hand-written `api/overview.mdx` alongside it. The sidebar will list both.

Cleaner alternative used here: configure typedoc with `entryFileName: "modules"` so the generated index is `modules.md`, and commit a separate hand-written `index.mdx`.

- [ ] **Step 1: Update `typedoc.json`**

Change:

```json
  "entryFileName": "index",
```

to:

```json
  "entryFileName": "modules",
```

- [ ] **Step 2: Update `docs-site/.gitignore`**

Replace the `src/content/docs/api/` line with a more precise exclusion that
allows the hand-written `index.mdx`:

```
src/content/docs/api/*
!src/content/docs/api/index.mdx
```

- [ ] **Step 3: Create `docs-site/src/content/docs/api/index.mdx`**

```mdx
---
title: API reference
description: Public API surface of strata-grid.
sidebar:
  order: 0
---

import { LinkCard, CardGrid } from '@astrojs/starlight/components';

The reference below is auto-generated from TSDoc comments in the source.

## Components

<CardGrid>
  <LinkCard title="DataGrid" href="/strata-grid/api/classes/datagrid/" />
  <LinkCard title="PaginationBar" href="/strata-grid/api/functions/paginationbar/" />
  <LinkCard title="QuickSearchInput" href="/strata-grid/api/functions/quicksearchinput/" />
  <LinkCard title="FilterBuilderPanel" href="/strata-grid/api/functions/filterbuilderpanel/" />
  <LinkCard title="ColumnManagementPanel" href="/strata-grid/api/functions/columnmanagementpanel/" />
  <LinkCard title="ExportMenu" href="/strata-grid/api/functions/exportmenu/" />
  <LinkCard title="WhereUsedDialog" href="/strata-grid/api/functions/whereuseddialog/" />
</CardGrid>

## Hooks

<CardGrid>
  <LinkCard title="useTreeEditor" href="/strata-grid/api/functions/usetreeeditor/" />
  <LinkCard title="useExport" href="/strata-grid/api/functions/useexport/" />
  <LinkCard title="useDataSource" href="/strata-grid/api/functions/usedatasource/" />
  <LinkCard title="usePagination" href="/strata-grid/api/functions/usepagination/" />
  <LinkCard title="useColumnManagement" href="/strata-grid/api/functions/usecolumnmanagement/" />
  <LinkCard title="useFilterBuilder" href="/strata-grid/api/functions/usefilterbuilder/" />
  <LinkCard title="useQuickSearch" href="/strata-grid/api/functions/usequicksearch/" />
  <LinkCard title="usePrintMode" href="/strata-grid/api/functions/useprintmode/" />
</CardGrid>

## Data sources & adapters

<CardGrid>
  <LinkCard title="InMemoryDataSource" href="/strata-grid/api/classes/inmemorydatasource/" />
  <LinkCard title="ODataDataSource" href="/strata-grid/api/classes/odatadatasource/" />
</CardGrid>

## Theming

<CardGrid>
  <LinkCard title="createTheme" href="/strata-grid/api/functions/createtheme/" />
  <LinkCard title="StrataIcon" href="/strata-grid/api/functions/strataicon/" />
</CardGrid>

> Browse the full alphabetical listing in the sidebar, or jump to
> the [generated modules index](/strata-grid/api/modules/).
```

Note: After the first generation pass, run `ls docs-site/src/content/docs/api/`
and adjust the `LinkCard` hrefs to match the actual generated paths (TypeDoc's
slug scheme depends on plugin version). Hrefs are documentation, not contracts —
fix any 404s after a manual visual check.

- [ ] **Step 4: Rebuild and visually verify**

Run: `rm -rf docs-site/src/content/docs/api/*.md docs-site/src/content/docs/api/classes docs-site/src/content/docs/api/functions docs-site/src/content/docs/api/interfaces docs-site/src/content/docs/api/type-aliases`
(Clean any stale generated files.)

Run: `npm run build -w @strata-grid/docs-site`
Expected: builds cleanly.

Run: `npm run dev -w @strata-grid/docs-site`
Open `http://localhost:4321/strata-grid/api/` and click through the link cards. Fix any 404s by editing the hrefs.
Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add typedoc.json docs-site/.gitignore docs-site/src/content/docs/api/index.mdx
git commit -m "docs(m8): curated API landing page over generated reference"
```

---

## Acceptance

- `npm run docs:api` from the root generates Markdown under
  `docs-site/src/content/docs/api/` with valid Starlight frontmatter.
- The generated directory is gitignored except for the hand-written `index.mdx`.
- `npm run build -w @strata-grid/docs-site` produces an `api/` section in the
  built site, browsable in the sidebar.
- Every exported symbol from `src/index.ts` has at least a one-line TSDoc summary.
- Tests and typecheck still pass.
