# Strata — M5 · Plan 3: Density & row striping

- **Date:** 2026-05-23
- **Depends on:** M1 (virtualizer, token foundation).

## Goal

Add `density` and `striped` props. Density swaps a small set of tokens via
`data-strata-density`; striping toggles a class that activates a CSS
`:nth-child(even)` rule.

## Scope

- `DataGridProps.density?: 'compact' | 'standard' | 'comfortable'` (default `'standard'`).
- `DataGridProps.striped?: boolean` (default `false`).
- New tokens per density (see spec §3.2).
- New CSS rule:
  ```css
  .strata-grid[data-strata-striped="true"] .strata-row:nth-child(even) {
    background: var(--strata-row-stripe-bg);
  }
  ```
- Virtualizer remeasure: when `--strata-row-height` changes, the row
  virtualizer must invalidate cached measurements. Implement in
  `src/virtual/use-row-virtualizer.ts` by adding a `density` dependency that
  triggers `virtualizer.measure()` on change.
- Preserve scroll anchor: capture the topmost visible row's index before the
  remeasure, restore after via `virtualizer.scrollToIndex`.

## Tests

- `src/model/density.test.ts` — assert tokens resolve to expected values at
  each density.
- `src/virtual/use-row-virtualizer.density.test.ts` — change density,
  assert virtualizer re-measures and scroll anchor is preserved within ±1
  row of the original.
- Striping visual test in the playground (manual).

## Acceptance

- Switching density across renders preserves the row the user was looking at.
- Compact and comfortable both render cleanly in light and dark themes.
- No existing test regresses.
