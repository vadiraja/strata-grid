# Strata — M8 · Plan 1: npm workspaces & Astro Starlight skeleton

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Convert the repo to an npm workspace, scaffold an Astro Starlight docs site at `docs-site/` that consumes `strata-grid` from the workspace, and render a placeholder landing page.

**Architecture:** Root `package.json` gains `"workspaces": ["docs-site"]`. The new `docs-site/` directory is a self-contained Astro Starlight project that depends on `strata-grid` via `workspace:*` and `@astrojs/react` for live React islands.

**Tech Stack:** npm workspaces, Astro 5.x, Starlight, `@astrojs/react`, React 19.

**Date:** 2026-05-23
**Depends on:** M5 (theming) merged — already in `master`.
**Spec:** `docs/superpowers/specs/2026-05-23-m8-docs-and-npm-prep-design.md`

**Status:** Completed. The npm workspace and Astro Starlight docs skeleton are
implemented, the introduction smoke-test page imports `DataGrid` from the
workspace package, and the docs site builds successfully.

---

### Task 1: Enable npm workspaces at the repo root

**Files:**
- Modify: `package.json`

- [x] **Step 1: Add `workspaces` field to root `package.json`**

Add to `package.json` immediately after the `"files"` array:

```json
  "workspaces": [
    "docs-site"
  ],
```

- [x] **Step 2: Verify nothing breaks**

Run: `npm install`
Expected: completes without error; no new dependencies installed (no `docs-site/` yet).

Run: `npm run build`
Expected: passes — library still builds.

Run: `npm test`
Expected: all existing tests pass.

- [x] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: enable npm workspaces for docs-site"
```

---

### Task 2: Scaffold the `docs-site/` directory with Astro Starlight

**Files:**
- Create: `docs-site/package.json`
- Create: `docs-site/astro.config.mjs`
- Create: `docs-site/tsconfig.json`
- Create: `docs-site/.gitignore`
- Create: `docs-site/src/content/docs/index.mdx`
- Create: `docs-site/src/content.config.ts`

- [x] **Step 1: Create `docs-site/package.json`**

```json
{
  "name": "@strata-grid/docs-site",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/react": "^4.2.0",
    "@astrojs/starlight": "^0.30.0",
    "astro": "^5.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sharp": "^0.33.5",
    "strata-grid": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

- [x] **Step 2: Create `docs-site/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://vadiraja.github.io',
  base: '/strata-grid',
  integrations: [
    react(),
    starlight({
      title: 'Strata',
      description: 'Open-source React tree data grid for hierarchical and nested data.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/vadiraja/strata-grid' },
      ],
      sidebar: [
        {
          label: 'Getting started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'API reference',
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Contributing',
          autogenerate: { directory: 'contributing' },
        },
      ],
    }),
  ],
});
```

- [x] **Step 3: Create `docs-site/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [x] **Step 4: Create `docs-site/.gitignore`**

```
dist/
.astro/
node_modules/
src/content/docs/api/
```

(The `api/` line is for the TypeDoc-generated content added in Plan 2.)

- [x] **Step 5: Create `docs-site/src/content.config.ts`**

```ts
import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
```

- [x] **Step 6: Create placeholder landing page `docs-site/src/content/docs/index.mdx`**

```mdx
---
title: Strata
description: Open-source React tree data grid for hierarchical and nested data.
template: splash
hero:
  tagline: An open-source React tree data grid for hierarchical and nested data.
  actions:
    - text: Get started
      link: /getting-started/introduction/
      icon: right-arrow
      variant: primary
    - text: View on GitHub
      link: https://github.com/vadiraja/strata-grid
      icon: external
---

import { Card, CardGrid } from '@astrojs/starlight/components';

## Why Strata

<CardGrid stagger>
  <Card title="Tree-first" icon="list-format">
    Indented, multi-level tree grid out of the box — the canonical view for
    bills of materials, file explorers, and org charts.
  </Card>
  <Card title="Virtualized" icon="rocket">
    Row *and* column virtualization for datasets in the tens of thousands.
  </Card>
  <Card title="Themable" icon="setting">
    CSS-custom-property tokens, dark mode, density presets, and print support.
  </Card>
  <Card title="Free & MIT-spirit" icon="open-book">
    Apache-2.0 licensed; no paywalled tree-grid, no enterprise tier.
  </Card>
</CardGrid>
```

- [x] **Step 7: Install workspace dependencies**

Run: `npm install`
Expected: installs Astro/Starlight/React under `docs-site/node_modules` (or hoisted to root), and links `strata-grid` from the root as a workspace dependency.

- [x] **Step 8: Build the docs site to verify the scaffold**

Run: `npm run build -w @strata-grid/docs-site`
Expected: Astro builds without errors; `docs-site/dist/index.html` exists.

- [x] **Step 9: Commit**

```bash
git add docs-site/ package.json package-lock.json
git commit -m "docs(m8): scaffold Astro Starlight docs site"
```

---

### Task 3: Add a smoke-test page that imports `<DataGrid>` from the workspace

This verifies the workspace wiring works end-to-end before we write any real content.

**Files:**
- Create: `docs-site/src/components/examples/SmokeTestGrid.tsx`
- Create: `docs-site/src/content/docs/getting-started/introduction.mdx`

- [x] **Step 1: Create the example component**

`docs-site/src/components/examples/SmokeTestGrid.tsx`:

```tsx
import { DataGrid, type ColumnDef } from 'strata-grid';
import 'strata-grid/styles.css';

interface Person {
  id: string;
  name: string;
  role: string;
}

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'role', header: 'Role', accessor: 'role' },
];

const data: Person[] = [
  { id: '1', name: 'Ada Lovelace', role: 'Engineer' },
  { id: '2', name: 'Alan Turing', role: 'Architect' },
];

export default function SmokeTestGrid() {
  return <DataGrid data={data} columns={columns} height={200} />;
}
```

- [x] **Step 2: Create a minimal introduction page that mounts the component**

`docs-site/src/content/docs/getting-started/introduction.mdx`:

```mdx
---
title: Introduction
description: What Strata is and why it exists.
sidebar:
  order: 1
---

import SmokeTestGrid from '../../../components/examples/SmokeTestGrid.tsx';

Strata is a fast, accessible, themable **tree data grid** delivered as a single
`<DataGrid>` React component. The defining capability is the **indented,
multi-level tree grid** — delivered free, where comparable libraries either
paywall it or omit it.

It renders any parent/child hierarchy, and works equally with **nested data**
(objects that hold a `children` array) and **flat, parent-pointer data** (rows
that reference a `parentId`).

## Smoke test

<SmokeTestGrid client:load />
```

- [x] **Step 3: Build the site again**

Run: `npm run build -w @strata-grid/docs-site`
Expected: passes. `docs-site/dist/getting-started/introduction/index.html` exists and references the React island bundle.

- [x] **Step 4: Run the dev server and manually verify**

Run: `npm run dev -w @strata-grid/docs-site`
Open `http://localhost:4321/strata-grid/getting-started/introduction/` in a browser.
Expected: page renders, the smoke-test grid shows two rows with names and roles.
Stop the dev server with Ctrl-C.

- [x] **Step 5: Commit**

```bash
git add docs-site/
git commit -m "docs(m8): add smoke-test introduction page with live DataGrid island"
```

---

## Acceptance

- `npm install` at the repo root installs both library and docs-site deps.
- `npm run build -w @strata-grid/docs-site` produces `docs-site/dist/`.
- `npm run dev -w @strata-grid/docs-site` serves the site at `localhost:4321/strata-grid/`.
- The introduction page renders a live `<DataGrid>` sourced from the workspace
  library (not a published version).
- Library scripts (`npm test`, `npm run build`, `npm run typecheck`) still pass
  unchanged.
