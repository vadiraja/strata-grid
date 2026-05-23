# Strata — M5 · Plan 2: Icon coverage rollout

- **Date:** 2026-05-23
- **Depends on:** M5 Plan 1.

## Goal

Replace every ad hoc text glyph in M1–M4 components with `<StrataIcon>` while
preserving all existing `aria-label`s and visual layout.

## Inventory of replacements

| File | Current | New |
|---|---|---|
| `src/components/TreeCell.tsx` | `▾` / `▸` | `chevron-down` / `chevron-right` |
| `src/components/ColumnHeaderCell.tsx` | sort arrows (text or unicode) | `arrow-up` / `arrow-down` |
| `src/components/ColumnHeaderCell.tsx` | filter button glyph | `filter` / `filter-active` |
| `src/components/PaginationBar.tsx` | `‹` / `›` / `«` / `»` | `chevron-left` / `chevron-right` / `chevrons-left` / `chevrons-right` |
| `src/components/QuickSearchInput.tsx` | (none — add) | `search` |
| `src/components/ExportMenu.tsx` | (none — add) | `download` |
| `src/components/ColumnManagementPanel.tsx` | checkmark/dash | `check` / `eye-off` |
| `src/components/WhereUsedDialog.tsx` | close `×` | `x` |
| `src/components/LoadingRow.tsx` / `LoadingOverlay.tsx` | spinner CSS | `loader-2` (CSS-spun) |
| Row-edit controls (M2) | save/cancel text | `check` / `x` |

## Rules

- Decorative-only icons (inside a button with its own `aria-label`): omit
  `label` prop on `<StrataIcon>` so they render `aria-hidden`.
- Icon-only buttons keep their existing `aria-label` on the button element.
- No structural markup changes — wrap or replace only the glyph node.

## Tests

- Existing a11y tests (`DataGrid.a11y.test.tsx`) must continue to pass.
- For each changed component, add a render assertion that the SVG is present.
- Snapshot test diffs reviewed for visual regression.

## Acceptance

- Searching the codebase for `▾|▸|▼|◄|►|‹|›|«|»` returns zero results in
  `src/components/`.
- All a11y tests pass.
- Visual snapshots for the playground tabs are accepted by the reviewer.
