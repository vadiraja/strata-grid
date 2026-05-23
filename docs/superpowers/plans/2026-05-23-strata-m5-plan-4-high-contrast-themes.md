# Strata — M5 · Plan 4: High-contrast theme presets

- **Date:** 2026-05-23
- **Depends on:** M1 token foundation.

## Goal

Ship two new built-in theme presets: `high-contrast-light` and
`high-contrast-dark`. Both meet WCAG 2.1 **AAA** contrast for body text
(7:1) and AA for large text and non-text UI.

## Scope

- New CSS blocks in `strata.css`:
  ```css
  .strata-grid[data-theme="high-contrast-light"] { /* tokens */ }
  .strata-grid[data-theme="high-contrast-dark"]  { /* tokens */ }
  ```
- Token sets favor pure black/white text, thick borders, and a single bold
  accent (e.g., `#0040DD` for light, `#62B0FF` for dark).
- Update `DataGridProps.theme` type to include the two new values.
- Update playground to include a theme picker exposing all four presets.

## Tests

- `src/themes/contrast.test.ts` — compute color contrast ratios for
  (text, background) and (accent, background) at each preset; assert AAA for
  body text and AA for accents.
- Axe scan via existing `DataGrid.a11y.test.tsx` adds a parametrized case
  per theme.

## Acceptance

- All four themes render without visual layout shifts.
- Contrast assertions pass.
- Playground theme picker switches without flicker.
