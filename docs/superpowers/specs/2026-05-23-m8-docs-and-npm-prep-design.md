# Strata M8 — Documentation & npm Publish Prep — Design

**Status:** Specced
**Milestone:** M8 (Documentation & developer experience), partial — see [Scope](#scope)
**Date:** 2026-05-23

---

## Summary

Stand up a documentation site for Strata covering all shipped milestones (M1–M5),
auto-generate the API reference from TypeScript source, write a contributing
guide, and prepare the `strata-grid` package for an eventual npm publish — without
actually publishing in this round.

The docs site is built with **Astro Starlight**, lives in a new `docs-site/`
workspace, and deploys to **GitHub Pages** via a new GitHub Actions workflow.

## Goals

- Make Strata adoptable: a public docs site with installation, guides, and a
  searchable API reference.
- Make Strata contributable: a guide describing architecture, dev setup, and the
  spec → plan → test-first workflow.
- Make `strata-grid` ready to publish on npm with a single command (no actual
  publish in this milestone).

## Non-goals (deferred to follow-up milestones)

- Storybook component stories
- Interactive playground (CodeSandbox / StackBlitz embeds)
- Migration guides (no versions to migrate between yet)
- Cookbook / recipes pages
- Changelog automation (changesets / release-please)
- The actual `npm publish` (and 2FA, provenance setup)

## Scope

In: 3 of the 8 M8 sub-items —
1. Documentation site
4. API reference generation
7. Contributing guide

Plus npm publish-prep (cross-cuts the package itself, not a roadmap sub-item).

## Architecture

Strata stays a single npm package. Docs are a sibling app in a new npm
workspace.

```
datagrid/                       # repo root (npm workspaces enabled)
├── package.json                # workspaces: ["docs-site"]; library at root (unchanged shape)
├── src/                        # library source (unchanged)
├── dist/                       # library build output
├── docs-site/                  # NEW — Astro Starlight app
│   ├── package.json            # depends on workspace "strata-grid"
│   ├── astro.config.mjs
│   ├── src/
│   │   ├── content/docs/       # MDX content (guides, recipes, API)
│   │   ├── components/         # React example components (use real <DataGrid>)
│   │   └── styles/
│   └── public/
├── docs/                       # existing planning docs (roadmap, specs) — kept as-is
├── CONTRIBUTING.md             # NEW — top-level GitHub-discoverable copy
└── .github/workflows/
    └── docs.yml                # NEW — build + deploy to gh-pages on push to master
```

Key decisions:

- **npm workspaces** (not a separate repo). `docs-site` consumes the library via
  `"strata-grid": "workspace:*"`. Every doc example runs against in-repo source —
  no stale published version risk.
- **Only two `package.json` files**: root (library, unchanged) and `docs-site`.
  Library tooling is not reshuffled.
- **`docs/` directory stays put.** It holds planning/spec docs (roadmap, specs,
  plans). User-facing docs live in `docs-site/`.

## Content map

Sidebar has four top-level sections:

### 1. Getting started

- Introduction — what Strata is, why it exists (adapted from README)
- Installation — `npm install strata-grid`, peer deps, CSS imports
- Quick start — flat grid (live `<DataGrid>` example)
- Quick start — tree grid (live example, nested + parent-pointer variants)

### 2. Guides (one page per shipped capability)

- Tree data (M1) — nested vs flat, expand/collapse, indentation
- Sorting & filtering (M1) — tree-aware behavior
- Column management (M1/M4) — resize, reorder, pin, virtualization
- Row selection (M1) — single/multi, cascade
- Editing (M2) — built-in editors, custom editors, validation, row-edit
- Aggregation (M2) — grouped rows, footers, BOM extended-quantity rollups
- Hierarchy editor (M3) — commands, history, drag/drop, clipboard
- Data sources (M3/M4) — `DataSource` seam, `InMemoryDataSource`, pagination,
  lazy load, live updates, where-used, search, filter builder, OData
- Export (M4) — CSV/XLSX writers, React hook
- Theming (M5) — CSS tokens, dark theme, density, high-contrast, print

Every guide page has at least one **runnable live example** (Astro island
wrapping `<DataGrid>`). Examples live in `docs-site/src/components/examples/`.

### 3. API reference (auto-generated)

- Components (`<DataGrid>`)
- Types (`ColumnDef`, `TreeDataConfig`, `DataSource`, etc.)
- Hooks (export hook, etc.)
- Adapters (OData)

### 4. Contributing

- Project overview & architecture
- Development setup
- Spec → plan → test-first workflow
- PR conventions & commit style
- Testing expectations

## API reference pipeline

Auto-generated from TypeScript source via **TypeDoc** +
**`typedoc-plugin-markdown`**, emitting Markdown into Starlight's content
collection.

1. **Source:** TSDoc comments on exported symbols in `src/` (entry: `src/index.ts`,
   ~205 lines of exports).
2. **Generator:** `typedoc` reads `tsconfig.json`, walks the `src/index.ts`
   barrel, emits one `.md` per exported symbol.
3. **Output:** `docs-site/src/content/docs/api/**/*.md` — fits Starlight's
   content collection schema; sidebar picks up automatically.
4. **Frontmatter shim:** a small post-processor adds Starlight frontmatter
   (`title`, `sidebar.order`) to each generated file.
5. **Wired into build:** `docs-site` has `predev` and `prebuild` scripts that
   run `typedoc` so the API ref is always fresh.
6. **Hand-written index page:** `docs/api/index.mdx` (not generated) gives a
   curated landing — "Components" / "Types" / "Hooks" / "Adapters" — linking into
   the generated pages.

Implementation plan must include a **doc-comment audit pass** on `src/index.ts`
exports — adding/improving TSDoc for any export whose generated page would be
empty or unclear. Only the public surface re-exported from `src/index.ts` needs
to be documented; internals are out of scope.

Generated API pages are gitignored (build artifact). Source of truth is the
TSDoc in `.ts` files.

## Package publish-prep

Goal: `strata-grid` fully publish-ready so a future `npm publish` is a one-liner.
No actual publish in this milestone.

### `package.json` changes

- Add `repository`, `homepage`, `bugs`
- Add `keywords`: react, data-grid, tree-grid, tanstack, virtualization, bom,
  hierarchy, treegrid
- Add `author`; confirm `license: Apache-2.0`
- Add `engines.node`: `">=18"`
- Add `publishConfig.access: "public"`
- Tighten `files` array: add `LICENSE` and `README.md` (npm picks these up by
  default but explicit is safer)
- Add `prepublishOnly` script: `npm run typecheck && npm test && npm run build`

### CI verification (no npm account needed)

- `npm pack --dry-run` on every PR — fails if tarball is missing files or
  includes unexpected ones
- **`publint`** dev dependency + CI step — validates the `exports` field, types,
  ESM/CJS dual-build correctness
- **`@arethetypeswrong/cli`** in CI — catches `.d.ts` / `.d.cts` mistakes for
  dual-publish packages

### Explicitly deferred

- Changesets / release-please / changelog automation (M8 sub-item, deferred)
- Actual `npm publish` + npm 2FA setup
- Provenance attestations (`npm publish --provenance`)
- Pre-release `next` dist-tag strategy

Net effect: after this milestone, publishing is `npm login && npm publish` —
no other prep needed.

## Contributing guide & CI

### Contributing guide

Lives at `docs-site/src/content/docs/contributing/`. A thin top-level
`CONTRIBUTING.md` at the repo root mirrors a short version (just an intro +
links into the docs site), so GitHub's PR UI auto-links it.

Four short pages:

1. **Project overview** — architecture sketch (TanStack Table row model +
   custom UI/virtualization), directory map (`src/adapters`, `components`, `data`,
   `export`, `filter`, `icons`, `model`, `theme`, `tree-editor`, `virtual`), and
   where the public API lives (`src/index.ts`).
2. **Development setup** — clone, `npm install`, the four scripts (`dev`,
   `test`, `typecheck`, `build`). One paragraph on `npm run dev -w docs-site`.
3. **Spec → plan → test-first workflow** — points at `docs/superpowers/specs/`
   and `docs/superpowers/plans/`. Explains: brainstorm → spec → plan → TDD
   implementation → PR.
4. **PR conventions** — branch naming (`mN-feature-name`), commit style
   (subject-line summary, no AI attribution), required checks (typecheck, test,
   build, `publint`, `arethetypeswrong`, docs build).

### CI

New workflow file `.github/workflows/docs.yml`:

- On push to `master`: build library → build `docs-site` → deploy
  `docs-site/dist/` to `gh-pages` branch.
- On every PR: build `docs-site` (verify no breakage), but don't deploy.

The same workflow (or the existing CI) runs the publish-prep checks:
`npm pack --dry-run`, `publint`, `@arethetypeswrong/cli`.

### Root README edits

- Add a "Documentation" link pointing at the GH Pages URL.
- Add a "Contributing" link pointing at `CONTRIBUTING.md`.

## Dependencies (new)

Root (devDependencies):

- `typedoc`
- `typedoc-plugin-markdown`
- `publint`
- `@arethetypeswrong/cli`

`docs-site/` (its own `package.json`):

- `astro`
- `@astrojs/starlight`
- `@astrojs/react` (for live `<DataGrid>` islands)
- `react`, `react-dom` (peer to Strata; the docs site uses them directly)
- `strata-grid` via `workspace:*`

## Risk & open questions

- **TSDoc coverage today is unknown.** The first `typedoc` run will reveal gaps.
  Mitigation: the implementation plan includes an audit pass on `src/index.ts`
  exports.
- **GH Pages custom domain** — not in scope; site will live at
  `https://<owner>.github.io/strata-grid/`. A custom domain (e.g.,
  `strata-grid.dev`) is a follow-up.
- **Live React examples bundle size** — every guide page that uses a live
  `<DataGrid>` ships the library to the browser. Acceptable for a docs site;
  flagged for monitoring.

## Out of scope (reaffirmed)

Storybook, playground embeds, migration guides, cookbook recipes, changelog
automation, actual `npm publish`. These are M8 sub-items reserved for a
follow-up milestone.

## Acceptance criteria

- `npm run dev -w docs-site` starts a local Starlight server with all sections
  visible.
- `npm run build -w docs-site` produces a static site in `docs-site/dist/`.
- API reference pages are generated from TSDoc; the generated folder is
  gitignored.
- `npm pack --dry-run`, `publint`, and `@arethetypeswrong/cli` all pass.
- A PR to `master` triggers the docs build; a merge to `master` deploys to
  `gh-pages`.
- `CONTRIBUTING.md` exists at repo root; full contributing guide accessible
  from the docs sidebar.
- Root `README.md` links to the docs site and `CONTRIBUTING.md`.
