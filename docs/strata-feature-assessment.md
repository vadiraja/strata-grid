# Strata Feature Assessment

Date: 2026-05-23

This assessment compares Strata's implemented surface with the current roadmap
and identifies missing, deferred, and additional capabilities.

## Current Position

Strata is strongest as an alpha-stage React tree data grid focused on
hierarchical enterprise data. The core value proposition is clear: a free,
DOM-accessible, indented multi-level tree grid with built-in UI, editing,
aggregation, export, data-source helpers, and themeability.

The implementation now appears broader than the roadmap table's early milestone
statuses suggest. M1 through M5 capabilities are largely present in code, and
M8 is partially present through the Starlight docs site, TypeDoc API reference,
contributing docs, and publish-prep scripts.

## Implemented Core Strengths

- Tree and flat grid rendering through one `DataGrid` component.
- Nested and flat parent-pointer hierarchy support.
- Row and column virtualization.
- Tree-aware sorting and filtering.
- Column resizing, reordering, pinning, grouping, and view-state helpers.
- Row selection, including tree cascade logic.
- Cell and row editing with built-in editors, validation, and custom editor
  extension points.
- Aggregation and BOM-style extended quantity rollups.
- Hierarchy editing primitives: add, delete, move, reorder, indent, outdent,
  clipboard, validators, history, drag/drop helpers, and change tracking.
- Data-source layer with in-memory, lazy tree, pagination, server query,
  live-update, where-used, and OData helpers.
- CSV and XLSX export utilities plus React export helpers.
- Theme system with CSS tokens, dark and high-contrast themes, density,
  striping, icon abstraction, auto theme, transitions, scrollbars, and print
  support.
- Documentation site with guides and generated API reference.
- npm publish preparation through package metadata, `npm pack`, `publint`, and
  CI/docs workflows.

## Planned But Still Missing

### M6 Plugin System

The roadmap's plugin/module architecture is not present yet.

Missing pieces:

- `registerModules([...])` API.
- Formal module lifecycle hooks such as `onInit`, `onDestroy`, `onRowRender`,
  `onCellRender`, and `onKeyDown`.
- Optional built-in feature modules for sorting, filtering, selection, editing,
  export, etc.
- Third-party module contract and docs.
- Module conflict detection.
- Lazy dynamic loading for heavy modules such as XLSX export.

Assessment: this is the largest architectural gap. It should wait until the
public API is cleaned up, because it will freeze important extension seams.

### M7 i18n, RTL, and Localization

No formal localization layer is visible yet.

Missing pieces:

- Locale provider.
- Built-in locale bundles.
- User-supplied partial locale overrides.
- RTL-aware layout and mirrored pinning/indent behavior.
- Locale-aware number/date formatting helpers.
- Pluralization support.
- Bidirectional text QA.

Assessment: this is important before international adoption. RTL support will
touch layout, pinning, tree indentation, icons, and keyboard behavior, so it
deserves a dedicated milestone.

### M8 Deferred Documentation Items

M8 is partially implemented, but the roadmap explicitly defers several developer
experience items.

Missing pieces:

- Storybook.
- Embedded StackBlitz/CodeSandbox playground examples.
- Cookbook/recipes.
- Migration guides.
- Changelog/release automation.
- Full link checking.
- Final publish verification on the intended Node/npm versions.

Assessment: docs are good enough for alpha evaluation, but not yet the complete
developer-experience package.

### M9 Performance and Benchmarks

Performance is implemented through virtualization, but not yet measured through
a benchmark program.

Missing pieces:

- Automated render/scroll/expand/sort/filter benchmarks at large scales.
- Bundle size budget.
- React Profiler snapshots.
- Memory profiling.
- Virtualization stress tests.
- Lazy hydration.
- Web Worker offloading for expensive sort/filter workloads.

Assessment: this should be next after publish readiness. Strata's market claim
depends on handling large enterprise trees, so benchmark proof matters.

### M10 Framework Adapters

Strata is currently React-first.

Missing pieces:

- Headless core package.
- Vue adapter.
- Svelte adapter.
- Web Component wrapper.
- Vanilla JS adapter.
- Shared adapter conformance test suite.

Assessment: this is a later expansion. It should follow M6 because clean module
boundaries will make extraction less painful.

## Important Missing Product Features Not Explicitly Emphasized

These are not all first-release blockers, but they are likely to matter for a
serious data-grid product.

- Column menus with discoverable sort/filter/pin/hide actions.
- Keyboard-first cell navigation polish: Home/End, PageUp/PageDown, range
  selection, and screen-reader announcements for edit/validation state.
- Clipboard interoperability with spreadsheets: copy selected ranges, paste
  TSV/CSV into editable grids, and fill-down patterns.
- Range selection and multi-cell operations.
- Frozen top/bottom rows, summary rows, or pinned total rows.
- Master/detail row panels.
- Row drag/drop fully integrated in `DataGrid`, not only exposed through
  hierarchy-editor helpers.
- Async validation and server-side validation UX.
- Error and empty states as first-class configurable UI.
- Column auto-size based on content.
- Persisted user preferences adapter examples for localStorage/server profiles.
- SSR/hydration guidance and tests.
- Accessibility audit with assistive technology, not only ARIA/test coverage.
- Security review for export, formula injection, and OData URL construction.
- Browser compatibility matrix.

## Additional Capabilities Already Present Beyond a Minimal Tree Grid

Strata already includes several features that go beyond a narrow M1 tree-grid
scope:

- BOM extended quantity rollups.
- Where-used lookup.
- OData adapter.
- XLSX export.
- Live update reconciliation.
- Command-based hierarchy editing.
- Runtime theme composition.
- Print-mode handling.
- Publish-prep gates and GitHub Pages docs deployment.

Assessment: these are good differentiators, but they increase API surface. The
next planning pass should decide which are stable public API and which should be
marked experimental before npm publishing.

## Recommended Next Moves

1. Finish M8 hygiene before publishing:
   - Mark M8 plan checkboxes or add completion notes.
   - Resolve or explicitly document TypeDoc/Starlight warnings.
   - Verify `lint:types` on Node 20, matching CI.
   - Run a docs link crawl.

2. Create an API stabilization pass:
   - Review every export from `src/index.ts`.
   - Mark experimental APIs.
   - Remove accidental public exports.
   - Ensure TypeDoc has comments for exported types.

3. Prioritize M9 before M6:
   - Benchmarks will validate Strata's core promise.
   - Benchmark results will reveal whether plugin extraction is urgent for
     bundle size or can wait.

4. Plan M7 as a real milestone:
   - RTL and localization should not be patched in piecemeal.
   - It crosses styling, layout, icons, keyboard behavior, and docs.

5. Defer M10 until extension boundaries settle:
   - Framework adapters are valuable, but premature extraction could slow the
     React package before the API is stable.

## Suggested Status Wording

For the roadmap, the most accurate current wording is:

> M8: Implemented partially. Docs site, API reference, guides, contributing
> docs, and publish-prep are present. Storybook, playground embeds, cookbook,
> migration guides, changelog automation, and final publish verification remain
> deferred.

For the package status, the most accurate wording is:

> Alpha. Feature-rich and suitable for evaluation/prototypes, but API
> stabilization, benchmarks, localization, and extension architecture are still
> pending before a confident 1.0.
