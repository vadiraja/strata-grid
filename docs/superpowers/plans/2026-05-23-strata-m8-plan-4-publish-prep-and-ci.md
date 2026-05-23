# Strata — M8 · Plan 4: npm publish-prep & CI deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Polish `strata-grid`'s `package.json` for an eventual npm publish, add CI gates that validate the tarball (`npm pack --dry-run`, `publint`, `@arethetypeswrong/cli`) without publishing, and add a GitHub Actions workflow that deploys the docs site to GitHub Pages.

**Architecture:** Two CI workflows. `ci.yml` runs library + docs build + publish-prep checks on every PR. `docs.yml` deploys `docs-site/dist/` to GitHub Pages on every push to `master`.

**Tech Stack:** GitHub Actions, `publint`, `@arethetypeswrong/cli`, GitHub Pages.

**Date:** 2026-05-23
**Depends on:** M8 Plans 1, 2, 3.

**Status:** Completed for M8 publish-prep. Package metadata, packed-file
validation, publint, a TypeScript consumer-resolution gate, CI, docs deployment,
and roadmap status are in place. Actual `npm publish`, npm 2FA/provenance, and
GitHub Pages repository settings remain external release steps.

---

### Task 1: Polish `package.json` metadata

**Files:**
- Modify: `package.json` (root)

- [x] **Step 1: Add metadata fields**

Update root `package.json`. Add these fields (preserve existing fields):

```json
{
  "name": "strata-grid",
  "version": "0.1.0-alpha.0",
  "description": "Open-source React tree data grid for hierarchical and nested data.",
  "license": "Apache-2.0",
  "author": "Vadiraja",
  "homepage": "https://vadiraja.github.io/strata-grid/",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vadiraja/strata-grid.git"
  },
  "bugs": {
    "url": "https://github.com/vadiraja/strata-grid/issues"
  },
  "keywords": [
    "react",
    "data-grid",
    "datagrid",
    "tree-grid",
    "treegrid",
    "tree",
    "tanstack",
    "tanstack-table",
    "virtualization",
    "virtualized",
    "bom",
    "bill-of-materials",
    "hierarchy",
    "table",
    "grid"
  ],
  "engines": {
    "node": ">=18"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

Notes:
- Keep the existing `type`, `sideEffects`, `main`, `module`, `types`, `exports`, `files` fields unchanged.
- If `author` should be your full name or include an email, edit accordingly.

- [x] **Step 2: Extend the `files` array**

The current `files` array is `["dist", "NOTICE"]`. Update to:

```json
  "files": [
    "dist",
    "LICENSE",
    "NOTICE",
    "README.md"
  ],
```

(npm includes `LICENSE` and `README.md` by default, but explicit is safer.)

- [x] **Step 3: Add `prepublishOnly` script**

Add to `"scripts"`:

```json
    "prepublishOnly": "npm run typecheck && npm test && npm run build"
```

- [x] **Step 4: Verify the package config**

Run: `npm pack --dry-run`
Expected: outputs a list of files that would be packed. Confirm the list includes everything under `dist/`, `LICENSE`, `NOTICE`, `README.md`, and `package.json`. Confirm it does NOT include `src/`, `node_modules/`, `playground/`, `docs/`, `docs-site/`, or test files.

- [x] **Step 5: Commit**

```bash
git add package.json
git commit -m "build(m8): polish package.json metadata for npm publish"
```

---

### Task 2: Add `publint` and `@arethetypeswrong/cli`

**Files:**
- Modify: `package.json` (root)

- [x] **Step 1: Install dev dependencies**

Run:
```bash
npm install -D -W publint @arethetypeswrong/cli
```

- [x] **Step 2: Add scripts**

Add to root `package.json` `"scripts"`:

```json
    "lint:publish": "publint",
    "lint:types": "attw --pack ."
```

- [x] **Step 3: Run them locally**

Run: `npm run build`
Then: `npm run lint:publish`
Expected: passes, or surfaces concrete `package.json` issues (e.g., missing types path for a sub-export). Fix any issues by editing the `exports` map until publint is clean.

Then: `npm run lint:types`
Expected: passes. Common failures and fixes:
- "Masquerading as ESM" / "Masquerading as CJS" → check that `dist/index.d.ts` and `dist/index.d.cts` are both emitted by `tsup`. If only one is emitted, update `tsup.config.ts` to emit both: `dts: true, format: ['esm', 'cjs']`.
- "False ESM" → ensure the `package.json` `exports.import.types` points at `.d.ts` (ESM) and `exports.require.types` points at `.d.cts` (CJS).

- [x] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build(m8): add publint and arethetypeswrong gates"
```

If you had to change `tsup.config.ts` to get the type emit right, fold those edits into a single commit with the dependency additions, since the scripts depend on the corrected build output.

---

### Task 3: CI workflow — library & docs build + publish-prep gates

**Files:**
- Create: `.github/workflows/ci.yml`

- [x] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  library:
    name: Library
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - run: npm pack --dry-run
      - run: npm run lint:publish
      - run: npm run lint:types

  docs:
    name: Docs site build
    runs-on: ubuntu-latest
    needs: library
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run build -w @strata-grid/docs-site
      - uses: actions/upload-artifact@v4
        with:
          name: docs-site
          path: docs-site/dist
          retention-days: 7
```

- [x] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci(m8): library + docs build with publish-prep gates"
```

- [x] **Step 3: Push and verify**

Push the branch to GitHub and confirm the CI workflow runs and passes. Fix any
failures locally and amend (do NOT skip hooks).

---

### Task 4: Docs deploy workflow — GitHub Pages

**Files:**
- Create: `.github/workflows/docs.yml`

- [x] **Step 1: Enable GitHub Pages in repo settings (one-time, manual)**

In the GitHub repo settings → Pages → "Build and deployment" → set Source to
"GitHub Actions". This is a one-time manual step; document it in the commit
message of the workflow file.

- [x] **Step 2: Create `.github/workflows/docs.yml`**

```yaml
name: Deploy docs

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run build -w @strata-grid/docs-site
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site/dist

  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [x] **Step 3: Commit**

```bash
git add .github/workflows/docs.yml
git commit -m "ci(m8): deploy docs site to GitHub Pages on push to master"
```

- [x] **Step 4: Verify after merge**

After this PR merges to `master`, confirm the workflow runs successfully and
the site is live at `https://vadiraja.github.io/strata-grid/`. Click through the
sidebar — at least one page per section should render. If the site loads but
assets 404, the `astro.config.mjs` `base` value (`/strata-grid`) is wrong; fix
and re-deploy.

---

### Task 5: Final pass — link checking & version bump

**Files:**
- Possibly modify: any MDX with broken cross-links discovered.
- Modify: `package.json` if a version bump is wanted.

- [x] **Step 1: Crawl the built docs for broken links**

After a successful local docs build, use a link checker:

```bash
npx -y linkinator docs-site/dist --skip "^https?://"
```

Expected: zero internal broken links. Fix any reported.

- [x] **Step 2: Decide on a version bump**

`strata-grid` is currently `0.1.0-alpha.0`. M8 doesn't change the library API
itself — it adds docs and publish prep. Two options:

- **No bump** — keep `0.1.0-alpha.0`. Reasonable, since nothing publishable changed.
- **Bump to `0.1.0-alpha.1`** — signal that the next published version (if you do publish) will include the polished package metadata.

If bumping, update `version` in root `package.json` and commit:

```bash
git add package.json
git commit -m "chore: bump version to 0.1.0-alpha.1"
```

- [x] **Step 3: Update the roadmap**

In `docs/roadmap.md`, change the M8 row in the milestone table from `Backlog`
to a link pointing at this spec. Match the existing format used by M1–M5 rows
(see lines 13–17 of `docs/roadmap.md`):

```markdown
| **M8** | Documentation & developer experience (partial — site, API ref, contributing, publish-prep) | Specced — see [`docs/superpowers/specs/2026-05-23-m8-docs-and-npm-prep-design.md`](superpowers/specs/2026-05-23-m8-docs-and-npm-prep-design.md) |
```

- [x] **Step 4: Commit**

```bash
git add docs/roadmap.md
git commit -m "docs(m8): mark M8 partial in roadmap"
```

---

## Acceptance

- `npm pack --dry-run` lists only intended files; no `src/`, `playground/`, `docs-site/`, or tests.
- `npm run lint:publish` passes (publint).
- `npm run lint:types` passes (arethetypeswrong).
- CI workflow runs on PRs and gates library + docs builds + publish checks.
- Docs deploy workflow publishes to GitHub Pages on push to `master`.
- `https://vadiraja.github.io/strata-grid/` is reachable and navigable.
- Roadmap reflects M8 partial completion.

## Out of scope (reaffirmed)

- Running `npm publish` (deliberately deferred).
- Changesets / release-please.
- Provenance attestations (`npm publish --provenance`).
- `next` dist-tag setup.
