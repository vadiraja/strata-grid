# Strata — M5 · Plan 6: `theme="auto"` & smooth transitions

- **Date:** 2026-05-23
- **Depends on:** M5 Plan 4 (`light`/`dark` presets stable).

## Goal

Add OS-preference-aware theming and opt-in CSS transitions on theme/density
changes.

## Scope

### `theme="auto"`

- New value for `DataGridProps.theme`.
- New hook `src/themes/use-color-scheme.ts`: subscribes to
  `window.matchMedia('(prefers-color-scheme: dark)')`, returns `'light' | 'dark'`.
- `DataGrid` resolves `theme="auto"` to the matching base preset.
- SSR safety: returns `'light'` when `window` is undefined.

### `transitions` prop

- `DataGridProps.transitions?: boolean` (default `false`).
- Sets `data-strata-transitions="true"` on the grid root.
- CSS:
  ```css
  .strata-grid[data-strata-transitions="true"] .strata-cell,
  .strata-grid[data-strata-transitions="true"] .strata-header-cell {
    transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
  }
  ```
- Respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .strata-grid[data-strata-transitions="true"] * { transition: none !important; }
  }
  ```

## Tests

- `src/themes/use-color-scheme.test.ts`:
  - mock `matchMedia` to return dark; assert hook returns `'dark'`,
  - fire a change event; assert hook updates,
  - SSR (no `window`) returns `'light'`.
- `DataGrid.theme.test.tsx`:
  - render with `theme="auto"`, mock prefers-dark, assert `data-theme="dark"`.
- Reduced-motion test (computed style assertion).

## Acceptance

- Toggling OS dark mode flips the grid within ~100ms.
- Transitions are visually smooth when enabled, instant when disabled.
- Reduced-motion users see no transitions even when `transitions=true`.
